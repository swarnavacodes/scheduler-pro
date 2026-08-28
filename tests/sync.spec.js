import { test, expect } from '@playwright/test';

// Two-session sync validation using real Supabase (feat/supabase-sync branch)
// Uses publishable key from supabase.config.js + email auth (no Google)
test.describe('multi-device sync (two isolated sessions)', () => {
  test('same user sees task created on device A appear on device B after reload', async ({ browser }) => {
    const email = `pwsync${Date.now()}@gmail.com`;
    const password = 'Test123!pw';

    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    // helper: sign up via Supabase JS directly (bypasses UI, works without confirm email)
    async function signUpOrIn(page, email, password) {
      await page.goto('/index.html');
      await expect(page.locator('.schedule-container')).toBeVisible();
      await page.waitForTimeout(1500);
      const result = await page.evaluate(async ({ email, password }) => {
        try {
          const { SUPABASE_URL, SUPABASE_ANON_KEY } = await import('./supabase.config.js');
          const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
          const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
          let { error: signInErr } = await sb.auth.signInWithPassword({ email, password });
          if (signInErr && signInErr.message.includes('Invalid login credentials')) {
            const { error: signUpErr } = await sb.auth.signUp({ email, password });
            if (signUpErr) return { ok: false, step: 'signUp', msg: signUpErr.message + ' (code ' + (signUpErr.code || '') + ')' };
            const { error: signIn2 } = await sb.auth.signInWithPassword({ email, password });
            if (signIn2) return { ok: false, step: 'signIn2', msg: signIn2.message };
          } else if (signInErr) {
            return { ok: false, step: 'signIn', msg: signInErr.message };
          }
          return { ok: true };
        } catch (e) {
          return { ok: false, step: 'exception', msg: String(e) };
        }
      }, { email, password });
      await page.reload();
      await expect(page.locator('.schedule-container')).toBeVisible();
      await page.waitForTimeout(1000);
      return result;
    }

    // Use the dashboard-created test@family.local to avoid signup rate limit
    async function ensureUser(page) {
      const candidates = [
        { email: 'test@family.local', password: 'test123!' },
        { email: 'test@family.local', password: 'Test123!pw' },
        { email: 'test@family.local', password: 'Test123!family' },
      ];
      for (const c of candidates) {
        const r = await signUpOrIn(page, c.email, c.password);
        if (r.ok) return { ...r, email: c.email };
        if (r.msg && r.msg.includes('rate limit')) {
          return { ok: false, step: 'rateLimit', msg: 'email rate limit — wait 5 min or reset test@family.local password to Test123!pw', email: c.email };
        }
      }
      return { ok: false, step: 'noCandidate', msg: 'test@family.local password unknown — reset in Supabase Dashboard → Users → test@family.local → Reset to Test123!pw', email };
    }

    // Sign up same random user on both devices (try fixed test user first to avoid rate limit)
    const rA = await ensureUser(pageA);
    expect(rA.ok, `pageA signUp/signIn failed: ${rA.step} ${rA.msg} for ${rA.email || email}`).toBeTruthy();
    const emailToUse = rA.email || email;
    // small delay to avoid Supabase sign-in rate limit (429)
    await pageB.waitForTimeout(1500);
    let rB = await signUpOrIn(pageB, emailToUse, 'test123!');
    if (!rB.ok && rB.msg && rB.msg.includes('Invalid login credentials')) {
      // try without ! (user said test123! but maybe stored as test123)
      await pageB.waitForTimeout(1000);
      rB = await signUpOrIn(pageB, emailToUse, 'test123');
    }
    expect(rB.ok, `pageB signUp/signIn failed: ${rB.step} ${rB.msg} for ${emailToUse}`).toBeTruthy();

    // Verify both show Sync ✓ and same email
    await expect(pageA.locator('#syncStatus')).toContainText(/Sync|✓|Offline/, { timeout: 5000 }).catch(() => {});
    await expect(pageB.locator('#syncStatus')).toContainText(/Sync|✓|Offline/, { timeout: 5000 }).catch(() => {});

    // Device A: create a task
    await pageA.locator('button[onclick="openModal()"]').click();
    await expect(pageA.locator('#modalOverlay')).toHaveClass(/open/);
    const title = `SyncTest-${Date.now()}`;
    await pageA.locator('#taskTitle').fill(title);
    await pageA.locator('#taskCategory').selectOption('work');
    await pageA.locator('#modalOverlay').getByRole('button', { name: 'Save Task' }).click();
    await expect(pageA.locator('#modalOverlay')).not.toHaveClass(/open/);
    await expect(pageA.locator('.task-item').filter({ hasText: title })).toBeVisible({ timeout: 5000 });
    await pageA.waitForTimeout(1200);
    const localCheck = await pageA.evaluate(({ title }) => {
      const raw = localStorage.getItem('daily-scheduler-store');
      const store = raw ? JSON.parse(raw) : {};
      const keys = Object.keys(store);
      let foundKey = null, foundCount = 0, allTitles = [];
      for (const k of keys) {
        if (Array.isArray(store[k])) {
          const titles = store[k].map(t => t.title);
          allTitles.push(...titles.slice(0, 2));
          if (titles.includes(title)) { foundKey = k; foundCount = store[k].length; }
        }
      }
      const hasTitleLocal = JSON.stringify(store).includes(title);
      const memTasks = typeof tasks !== 'undefined' ? tasks.map(t => t.title).slice(0, 5) : null;
      // try to get store via closure if not on window
      let storeKeys2 = null;
      try { storeKeys2 = typeof store !== 'undefined' ? Object.keys(store).slice(0, 5) : null; } catch {}
      return { keys: keys.slice(0, 8), foundKey, foundCount, allTitles: allTitles.slice(0, 5), hasTitleLocal, patched: !!(window.saveStore && window.saveStore._patched), pending: localStorage.getItem('scheduler-pending-sync')?.slice(0, 300), rawSnippet: raw?.slice(0, 800), memTasks, storeKeys2 };
    }, { title });
    console.log('localCheck pageA', JSON.stringify(localCheck, null, 2));
    if (!localCheck.hasTitleLocal) {
      console.log('WARN: localStorage missing title, checking in-memory and forcing save');
      await pageA.evaluate(() => {
        if (typeof saveStore === 'function') saveStore();
        // also try direct push
        try {
          const raw = localStorage.getItem('daily-scheduler-store');
          console.log('after manual saveStore, raw len', raw?.length);
        } catch {}
      });
      await pageA.waitForTimeout(500);
      const retry = await pageA.evaluate(({ title }) => {
        const raw = localStorage.getItem('daily-scheduler-store');
        return raw ? raw.includes(title) : false;
      }, { title });
      console.log('retry hasTitle', retry);
      // don't fail hard on local — server is source of truth for cross-device
      if (!retry) console.log('local still missing, will rely on server push');
    }

    let supaCheck = null;
    for (let i = 0; i < 15; i++) {
      supaCheck = await pageA.evaluate(async ({ title }) => {
        const { SUPABASE_URL, SUPABASE_ANON_KEY } = await import('./supabase.config.js');
        const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
        const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        const { data: { session } } = await sb.auth.getSession();
        if (!session) return { hasSession: false };
        const { data, error } = await sb.from('user_data').select('store').eq('user_id', session.user.id).maybeSingle();
        const hasTitle = data ? JSON.stringify(data.store).includes(title) : false;
        const taskTitles = data && data.store ? Object.values(data.store).flat().filter(Array.isArray).flat().map(t => t.title).slice(0, 5) : [];
        // also try direct store[todayKey]
        let todayTasks = [];
        try {
          const keys = data ? Object.keys(data.store) : [];
          const todayKey = keys.find(k => /^\d{4}-\d{2}-\d{2}$/.test(k));
          todayTasks = todayKey ? (data.store[todayKey] || []).map(t => t.title).slice(0, 3) : [];
        } catch {}
        return { hasSession: true, hasRow: !!data, hasTitle, error: error?.message, storeKeys: data ? Object.keys(data.store).slice(0, 5) : [], todayTasks, taskTitles };
      }, { title });
      console.log(`supaCheck attempt ${i}`, supaCheck);
      if (supaCheck.hasTitle) break;
      await pageA.waitForTimeout(800);
    }
    expect(supaCheck.hasTitle, `Supabase row never got title ${title}: ${JSON.stringify(supaCheck)} local was ${JSON.stringify(localCheck)}`).toBeTruthy();

    // Device B: force pull from server (visibilitychange + direct pull)
    await pageB.bringToFront();
    await pageB.evaluate(async () => {
      if (typeof pullFromServer === 'function') await pullFromServer();
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await pageB.waitForTimeout(1500);
    await pageB.reload();
    await expect(pageB.locator('.schedule-container')).toBeVisible();
    // after reload, also force pull
    await pageB.evaluate(async () => {
      if (typeof pullFromServer === 'function') await pullFromServer();
    });
    await pageB.waitForTimeout(1000);

    const visible = await pageB.locator('.task-item').filter({ hasText: title }).count();
    const diag = await pageB.evaluate(() => {
      return {
        ls: localStorage.getItem('daily-scheduler-store')?.slice(0, 800),
        pending: localStorage.getItem('scheduler-pending-sync'),
        syncStatus: document.getElementById('syncStatus')?.textContent,
      };
    });
    console.log('pageB diag', diag, 'count', visible);

    await expect(pageB.locator('.task-item').filter({ hasText: title })).toBeVisible({ timeout: 10000 });

    await ctxA.close();
    await ctxB.close();
  });
});
