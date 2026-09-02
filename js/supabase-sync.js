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

// Merge server store into local store, preserving local completed states.
// Store shape: { [dateKey]: [ { id, title, completed, ... }, ... ] }
function mergeStores(local, server) {
  if (!local || !server) return server || local || {};
  const merged = { ...server };
  for (const dateKey of Object.keys(local)) {
    const localTasks = local[dateKey];
    const serverTasks = server[dateKey];
    if (!Array.isArray(localTasks)) { merged[dateKey] = localTasks; continue; }
    if (!Array.isArray(serverTasks)) { merged[dateKey] = localTasks; continue; }
    const serverMap = new Map(serverTasks.map(t => [t.id, t]));
    const localMap = new Map(localTasks.map(t => [t.id, t]));
    const allIds = new Set([...serverMap.keys(), ...localMap.keys()]);
    merged[dateKey] = [...allIds].map(id => {
      const s = serverMap.get(id);
      const l = localMap.get(id);
      if (l && s) return { ...s, completed: l.completed ? true : s.completed };
      if (l) return l;
      return s;
    }).filter(Boolean);
  }
  return merged;
}

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
    } else {
      unsubscribeRealtime();
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
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && currentUser) pullFromServer();
  });
  // fallback poll every 30s when logged in
  setInterval(() => { if (currentUser && document.visibilityState === 'visible') pullFromServer(); }, 30000);
  updateSyncUI(currentUser ? (navigator.onLine ? 'synced' : 'offline') : 'local');
}

// ---- Auth UI ----
function renderAuthUI() {
  let host = document.getElementById('authArea');
  if (!host) {
    const header = document.querySelector('header') || document.body;
    host = document.createElement('div');
    host.id = 'authArea';
    host.style.cssText = 'display:flex;align-items:center;margin-left:auto;';
    header.appendChild(host);
  }
  if (!supabase) { host.innerHTML = ''; return; }
  if (!currentUser) {
    host.innerHTML = `
      <div style="display:flex;gap:12px;align-items:center">
        <button class="btn btn-primary" id="googleSignInBtn">Sign in with Google</button>
        <span style="font-size:0.75rem;color:var(--text-secondary)">or</span>
        <input id="emailInput" placeholder="email" type="email" style="padding:6px 8px;border:1px solid var(--border);border-radius:8px;font-size:0.8rem;width:150px">
        <input id="pwInput" placeholder="password" type="password" style="padding:6px 8px;border:1px solid var(--border);border-radius:8px;font-size:0.8rem;width:110px">
        <button class="btn btn-secondary" id="emailSignInBtn">Sign in</button>
      </div>`;
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
    ['#emailInput','#pwInput'].forEach(sel => host.querySelector(sel).addEventListener('keydown', e => {
      if (e.key === 'Enter') host.querySelector('#emailSignInBtn').click();
    }));
    syncStatusEl = null;
  } else {
    const name = currentUser.user_metadata?.full_name || currentUser.email || 'Account';
    const avatar = currentUser.user_metadata?.avatar_url || '';
    // Profile chip + sync status, pushed to the top-right corner
    host.innerHTML = `
      <div id="userProfile" style="display:flex;align-items:center;gap:10px;padding:6px 12px 6px 6px;border:1px solid var(--border);border-radius:999px;background:var(--card);">
        ${avatar ? `<img src="${avatar}" alt="" style="width:30px;height:30px;border-radius:50%">` : `<div style="width:30px;height:30px;border-radius:50%;background:var(--accent);color:#fff;display:flex;align-items:center;justify-content:center;font-size:0.85rem;font-weight:600">${name.charAt(0).toUpperCase()}</div>`}
        <span style="font-size:0.85rem;font-weight:500;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${name}</span>
        <button id="signOutBtn" style="background:transparent;border:none;cursor:pointer;color:var(--text-secondary);display:flex;align-items:center;padding:4px;" title="Sign out">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
        </button>
      </div>
      <span id="syncStatus" style="display:flex;align-items:center;gap:6px;font-size:0.8rem;font-weight:500;margin-left:4px;"></span>
    `;
    syncStatusEl = host.querySelector('#syncStatus');
    host.querySelector('#signOutBtn').onclick = async () => { await supabase.auth.signOut(); location.reload(); };
    updateSyncUI(currentUser && navigator.onLine ? 'synced' : (currentUser ? 'offline' : 'local'));
  }
}

function updateSyncUI(state) {
  if (!syncStatusEl) syncStatusEl = document.getElementById('syncStatus');
  if (!syncStatusEl) return;
  const pending = getPending().length;
  if (state === 'local') {
    syncStatusEl.innerHTML = '';
  } else if (state === 'offline' || !navigator.onLine) {
    syncStatusEl.innerHTML = pending
      ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="2" stroke-linecap="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8" rx="1"></rect></svg><span style="color:#fbbf24">' + pending + ' pending</span>'
      : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="2" stroke-linecap="round"><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8" rx="1"></rect></svg><span style="color:#fbbf24">Offline</span>';
  } else if (pending) {
    syncStatusEl.innerHTML = '<span style="color:#34d399">Syncing (' + pending + ')…</span>';
  } else {
    syncStatusEl.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg><span style="color:#34d399">Synced</span>';
  }
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

let lastPushAt = 0;
async function pullFromServer() {
  if (!currentUser || !supabase) return;
  // don't pull if we just pushed within last 2s (avoid race where pull overwrites just-saved local)
  if (Date.now() - lastPushAt < 2000) { log('skip pull: just pushed'); return; }
  const { data, error } = await supabase.from('user_data').select('store,updated_at').eq('user_id', currentUser.id).maybeSingle();
  if (error || !data?.store) return;
  const localRaw = localStorage.getItem(LS_KEY);
  let localStore = null;
  try { localStore = localRaw ? JSON.parse(localRaw) : null; } catch {}
  const serverStore = data.store;
  if (getPending().length) { log('skip pull: pending'); return; }
  // If local has any task that server doesn't, push local instead of pulling (last-write-wins for new local task)
  if (localStore) {
    const localStr = JSON.stringify(localStore);
    const serverStr = JSON.stringify(serverStore);
    if (localStr !== serverStr) {
      // check if local has a task title server doesn't
      const localTitles = new Set(Object.values(localStore).flat().filter(Array.isArray).flat().map(t => t.title).concat(Object.values(localStore).flat().filter(t => t && t.title).map(t => t.title)));
      // simpler: if local has more tasks total than server, push
      const localCount = Object.values(localStore).reduce((n, v) => n + (Array.isArray(v) ? v.length : 0), 0);
      const serverCount = Object.values(serverStore).reduce((n, v) => n + (Array.isArray(v) ? v.length : 0), 0);
      if (localCount > serverCount) {
        log(`skip pull: local has ${localCount} tasks, server has ${serverCount} — will push`);
        await pushSync(localStore);
        return;
      }
    }
  }
  if (localRaw && localRaw === JSON.stringify(serverStore)) return;
  const merged = localStore ? mergeStores(localStore, serverStore) : serverStore;
  localStorage.setItem(LS_KEY, JSON.stringify(merged));
  if (typeof window.loadStore === 'function' && typeof window.renderTasks === 'function') {
    try { window.loadStore(); window.renderTasks(); window.updateStats?.(); window.renderNowNext?.(); } catch {}
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
let subscribedUserId = null;
function subscribeRealtime() {
  if (!currentUser || !supabase) return;
  if (realtimeChannel && subscribedUserId === currentUser.id) return; // already subscribed for this user
  if (realtimeChannel) {
    try { supabase.removeChannel(realtimeChannel); } catch {}
    realtimeChannel = null;
    subscribedUserId = null;
  }
  subscribedUserId = currentUser.id;
  realtimeChannel = supabase.channel('user_data:' + currentUser.id)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'user_data', filter: `user_id=eq.${currentUser.id}` }, (payload) => {
      if (getPending().length) return;
      const serverStore = payload.new?.store;
      if (!serverStore) return;
      const localRaw = localStorage.getItem(LS_KEY);
      let localStore = null;
      try { localStore = localRaw ? JSON.parse(localRaw) : null; } catch {}
      const merged = localStore ? mergeStores(localStore, serverStore) : serverStore;
      localStorage.setItem(LS_KEY, JSON.stringify(merged));
      if (typeof window.loadStore === 'function') try { window.loadStore(); window.renderTasks(); window.updateStats?.(); window.renderNowNext?.(); } catch {}
      log('realtime update');
    })
    .subscribe();
}
function unsubscribeRealtime() {
  if (realtimeChannel) {
    try { supabase.removeChannel(realtimeChannel); } catch {}
    realtimeChannel = null;
    subscribedUserId = null;
  }
}

// Hook for app's saveStore to call
export function onLocalSave(storeObj) {
  queueSync(storeObj);
}
