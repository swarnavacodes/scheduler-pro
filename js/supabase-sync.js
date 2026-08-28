// ESM Sync module — works from GitHub Pages via CDN, no build step.
// Imported by index.html / daily-scheduler-pro.html as <script type="module">
// Falls back to localStorage-only if supabase.config.js is missing or DISABLE_SYNC=true.

import { SUPABASE_URL, SUPABASE_ANON_KEY, DISABLE_SYNC } from '../supabase.config.js';

const PENDING_KEY = 'scheduler-pending-sync';
const LS_KEY = 'daily-scheduler-store';

let supabase = null;
let currentUser = null;
let syncStatusEl = null;

function log(...args) { console.debug('[sync]', ...args); }

export async function initSupabaseSync() {
  if (DISABLE_SYNC) { log('disabled'); updateSyncUI('local'); return; }

  if (!SUPABASE_URL || SUPABASE_URL.includes('YOUR_PROJECT')) {
    log('no config — local only');
    updateSyncUI('local');
    return;
  }

  try {
    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch (e) {
    console.warn('[sync] supabase-js load failed, local only', e);
    updateSyncUI('local');
    return;
  }

  // auth state
  const { data: { session } } = await supabase.auth.getSession();
  currentUser = session?.user || null;
  supabase.auth.onAuthStateChange(async (_event, session) => {
    currentUser = session?.user || null;
    renderAuthUI();
    if (currentUser) {
      await migrateLocalIfNeeded();
      await pullFromServer();
      await flushQueue();
      subscribeRealtime();
    }
    updateSyncUI(currentUser ? 'synced' : 'local');
  });

  renderAuthUI();
  if (currentUser) {
    await migrateLocalIfNeeded();
    await pullFromServer();
    await flushQueue();
    subscribeRealtime();
  }

  // Monkey-patch saveStore so every local save also queues a sync (offline-safe)
  const tryPatch = () => {
    if (typeof window.saveStore === 'function' && !window.saveStore._patched) {
      const orig = window.saveStore;
      window.saveStore = function(...args) {
        const ret = orig.apply(this, args);
        try {
          const raw = localStorage.getItem(LS_KEY);
          if (raw) queueSync(JSON.parse(raw));
        } catch {}
        return ret;
      };
      window.saveStore._patched = true;
      log('patched saveStore');
    }
  };
  tryPatch();
  // retry until app script has loaded (it loads synchronously but module may race)
  if (!window.saveStore || !window.saveStore._patched) setTimeout(tryPatch, 500);

  window.addEventListener('online', flushQueue);
  window.addEventListener('offline', () => updateSyncUI('offline'));
  updateSyncUI(currentUser ? (navigator.onLine ? 'synced' : 'offline') : 'local');
}

// ---- Auth UI ----
function renderAuthUI() {
  let host = document.getElementById('authArea');
  if (!host) {
    const header = document.querySelector('header') || document.body;
    host = document.createElement('div');
    host.id = 'authArea';
    host.style.cssText = 'display:flex;gap:8px;align-items:center;';
    header.appendChild(host);
  }
  if (!supabase) { host.innerHTML = ''; return; }
  if (!currentUser) {
    host.innerHTML = `
      <button class="btn btn-primary" id="googleSignInBtn">Sign in with Google</button>
      <span style="font-size:0.75rem;color:var(--text-secondary)">or</span>
      <input id="emailInput" placeholder="email" type="email" style="padding:6px 8px;border:1px solid var(--border);border-radius:8px;font-size:0.8rem;width:160px">
      <input id="pwInput" placeholder="password" type="password" style="padding:6px 8px;border:1px solid var(--border);border-radius:8px;font-size:0.8rem;width:120px">
      <button class="btn btn-secondary" id="emailSignInBtn">Sign in</button>
      <span id="syncStatus" style="font-size:0.75rem;color:var(--text-secondary)"></span>`;
    host.querySelector('#googleSignInBtn').onclick = async () => {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin + window.location.pathname }
      });
    };
    host.querySelector('#emailSignInBtn').onclick = async () => {
      const email = host.querySelector('#emailInput').value.trim();
      const password = host.querySelector('#pwInput').value;
      if (!email || !password) { alert('Enter email and password'); return; }
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) alert(error.message);
    };
    // Enter to submit
    ['#emailInput','#pwInput'].forEach(sel => host.querySelector(sel).addEventListener('keydown', e => {
      if (e.key === 'Enter') host.querySelector('#emailSignInBtn').click();
    }));
    syncStatusEl = host.querySelector('#syncStatus');
  } else {
    const name = currentUser.user_metadata?.full_name || currentUser.email || 'Account';
    const avatar = currentUser.user_metadata?.avatar_url || '';
    host.innerHTML = `
      ${avatar ? `<img src="${avatar}" alt="" style="width:28px;height:28px;border-radius:50%">` : ''}
      <span style="font-size:0.85rem">${name}</span>
      <button class="btn btn-secondary" id="signOutBtn">Sign out</button>
      <span id="syncStatus" style="font-size:0.75rem;color:var(--text-secondary)"></span>
    `;
    host.querySelector('#signOutBtn').onclick = async () => { await supabase.auth.signOut(); location.reload(); };
    syncStatusEl = host.querySelector('#syncStatus');
  }
}

function updateSyncUI(state) {
  if (!syncStatusEl) syncStatusEl = document.getElementById('syncStatus');
  if (!syncStatusEl) return;
  const pending = getPending().length;
  if (state === 'local') syncStatusEl.textContent = '';
  else if (state === 'offline' || !navigator.onLine) syncStatusEl.textContent = pending ? `Offline (${pending} pending)` : 'Offline';
  else if (pending) syncStatusEl.textContent = `Syncing (${pending})…`;
  else syncStatusEl.textContent = 'Sync: ✓';
}

// ---- Migration: LS -> server if server empty ----
async function migrateLocalIfNeeded() {
  if (!currentUser || !supabase) return;
  const localRaw = localStorage.getItem(LS_KEY);
  if (!localRaw) return;
  const { data, error } = await supabase.from('user_data').select('store').eq('user_id', currentUser.id).maybeSingle();
  if (error) { log('migrate select error', error); return; }
  const serverEmpty = !data || !data.store || Object.keys(data.store).length === 0;
  if (serverEmpty) {
    log('migrating local to server');
    const store = JSON.parse(localRaw);
    await supabase.from('user_data').upsert({ user_id: currentUser.id, store, updated_at: new Date().toISOString() });
  }
}

async function pullFromServer() {
  if (!currentUser || !supabase) return;
  const { data, error } = await supabase.from('user_data').select('store,updated_at').eq('user_id', currentUser.id).maybeSingle();
  if (error || !data?.store) return;
  const localRaw = localStorage.getItem(LS_KEY);
  // last-write-wins: if server newer, overwrite LS (simple). Compare updated_at vs local pending
  const serverStore = data.store;
  // if local has pending, don't overwrite — let flush push local
  if (getPending().length) { log('skip pull: pending'); return; }
  localStorage.setItem(LS_KEY, JSON.stringify(serverStore));
  // trigger app reload of store if function exists
  if (typeof window.loadStore === 'function' && typeof window.renderTasks === 'function') {
    try { window.loadStore(); window.renderTasks(); window.updateStats?.(); } catch {}
  }
}

// ---- Queue for offline ----
function getPending() {
  try { return JSON.parse(localStorage.getItem(PENDING_KEY) || '[]'); } catch { return []; }
}
function setPending(arr) {
  try { localStorage.setItem(PENDING_KEY, JSON.stringify(arr)); } catch {}
  updateSyncUI(navigator.onLine ? 'synced' : 'offline');
}

export function queueSync(storeObj) {
  if (!currentUser || !supabase) return;
  if (!navigator.onLine) {
    const q = getPending();
    q.push({ store: storeObj, at: Date.now() });
    // keep only latest (last-write-wins), cap 20
    const latest = q[q.length - 1];
    setPending([latest]);
    return;
  }
  // online: direct upsert (debounced caller should call pushSync)
  pushSync(storeObj);
}

async function pushSync(storeObj) {
  if (!currentUser || !supabase) return;
  const { error } = await supabase.from('user_data').upsert({ user_id: currentUser.id, store: storeObj, updated_at: new Date().toISOString() });
  if (error) {
    log('push error, queuing', error);
    const q = getPending();
    q.push({ store: storeObj, at: Date.now() });
    setPending([q[q.length-1]]);
  } else {
    updateSyncUI('synced');
  }
}

async function flushQueue() {
  if (!currentUser || !supabase || !navigator.onLine) return;
  const q = getPending();
  if (!q.length) return;
  log('flushing', q.length);
  const latest = q[q.length - 1];
  const { error } = await supabase.from('user_data').upsert({ user_id: currentUser.id, store: latest.store, updated_at: new Date().toISOString() });
  if (!error) setPending([]);
}

let realtimeChannel = null;
function subscribeRealtime() {
  if (!currentUser || !supabase) return;
  if (realtimeChannel) {
    try { supabase.removeChannel(realtimeChannel); } catch {}
    realtimeChannel = null;
  }
  realtimeChannel = supabase.channel('user_data:' + currentUser.id)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'user_data', filter: `user_id=eq.${currentUser.id}` }, (payload) => {
      // ignore own echo if we just pushed
      if (getPending().length) return;
      const serverStore = payload.new?.store;
      if (!serverStore) return;
      localStorage.setItem(LS_KEY, JSON.stringify(serverStore));
      if (typeof window.loadStore === 'function') try { window.loadStore(); window.renderTasks(); window.updateStats?.(); } catch {}
      log('realtime update');
    })
    .subscribe();
}

// Hook for app's saveStore to call
export function onLocalSave(storeObj) {
  queueSync(storeObj);
}
