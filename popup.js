(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const HOST = 'mail.hostinger.com';
  const HOUSE_DEFAULT = 'Hostinger default';
  let tab = null;
  let active = false;
  let identities = [];

  function lastErr() { try { return chrome.runtime.lastError; } catch (e) { return e; } }

  function storageGet(area, key) {
    return new Promise((resolve) => {
      try {
        chrome.storage[area].get(key, (res) => resolve(lastErr() || !res ? undefined : res[key]));
      } catch (e) { resolve(undefined); }
    });
  }
  function storageSet(area, obj) {
    return new Promise((resolve) => {
      try { chrome.storage[area].set(obj, () => resolve(!lastErr())); } catch (e) { resolve(false); }
    });
  }
  function getTab() {
    return new Promise((resolve) => {
      try {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => resolve(lastErr() || !tabs ? null : tabs[0] || null));
      } catch (e) { resolve(null); }
    });
  }
  function sendToTab(msg) {
    return new Promise((resolve) => {
      try {
        if (!tab || tab.id == null) return resolve(undefined);
        chrome.tabs.sendMessage(tab.id, msg, (res) => resolve(lastErr() ? undefined : res));
      } catch (e) { resolve(undefined); }
    });
  }

  const pad = (n) => String(n).padStart(2, '0');
  const hms = (t) => { const d = new Date(t); return pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()); };

  function isHostingerUrl(url) {
    try { return new URL(url).hostname === HOST; } catch (e) { return false; }
  }

  function setState(kind, text) {
    $('dot').className = 'dot ' + (kind || '');
    $('tabState').textContent = text;
  }

  const label = (i) => (i.name ? i.name + ' <' + i.email + '>' : i.email);

  function renderIdentities() {
    const box = $('identities');
    box.textContent = '';
    if (!identities.length) {
      box.textContent = 'None yet. Open a message in Hostinger Webmail and click Reply once; the extension reads the From list from the composer.';
      return;
    }
    const ul = document.createElement('ul');
    identities.forEach((i) => {
      const li = document.createElement('li');
      li.textContent = label(i);
      ul.appendChild(li);
    });
    box.appendChild(ul);
  }

  function renderDefault(current) {
    const sel = $('defaultSelect');
    sel.textContent = '';
    const cur = typeof current === 'string' ? current.trim().toLowerCase() : '';
    $('defaultCurrent').textContent = cur || HOUSE_DEFAULT;
    const add = (value, text) => {
      const o = document.createElement('option');
      o.value = value; o.textContent = text; sel.appendChild(o);
    };
    add('', HOUSE_DEFAULT);
    const emails = new Set();
    identities.forEach((i) => { emails.add(i.email); add(i.email, label(i)); });
    if (cur && !emails.has(cur)) add(cur, cur);
    sel.value = cur;
    sel.disabled = false;
  }

  function renderActivity(list) {
    const box = $('activity');
    box.textContent = '';
    const items = (Array.isArray(list) ? list : []).filter((e) => e && e.msg).slice(-8).reverse();
    if (!items.length) { box.textContent = 'No activity recorded yet.'; return; }
    const ul = document.createElement('ul');
    items.forEach((e) => {
      const li = document.createElement('li');
      const t = document.createElement('span');
      t.className = 't'; t.textContent = hms(e.t);
      li.appendChild(t);
      li.appendChild(document.createTextNode(e.msg));
      ul.appendChild(li);
    });
    box.appendChild(ul);
  }

  async function refresh() {
    tab = await getTab();
    const onHostinger = !!(tab && tab.url && isHostingerUrl(tab.url));
    const live = onHostinger ? await sendToTab({ type: 'HRA_STATUS' }) : undefined;
    active = !!live;

    let version = '';
    try { version = chrome.runtime.getManifest().version; } catch (e) { /* ignore */ }

    if (active) setState('green', 'Active on this tab (v' + (live.version || version) + ')');
    else if (onHostinger) setState('amber', "Hostinger Webmail tab, but the extension isn't running here. Click Inject now (or reload the page).");
    else setState('', 'Not a Hostinger Webmail tab');

    $('rescan').disabled = !active;
    $('reload').disabled = !(tab && tab.id != null);
    $('inject').hidden = !(onHostinger && !active);

    const stored = await storageGet('local', 'knownIdentities');
    identities = Array.isArray(stored) ? stored.filter((i) => i && i.email) : [];
    if (!identities.length && live && Array.isArray(live.identitiesSeen)) identities = live.identitiesSeen;
    renderIdentities();

    renderDefault(await storageGet('sync', 'defaultSenderEmail'));

    if (live && Array.isArray(live.lastEvents) && live.lastEvents.length) renderActivity(live.lastEvents);
    else renderActivity(await storageGet('local', 'activityLog'));
  }

  $('defaultSelect').addEventListener('change', async () => {
    const v = $('defaultSelect').value;
    const ok = await storageSet('sync', { defaultSenderEmail: v });
    $('defaultCurrent').textContent = v || HOUSE_DEFAULT;
    $('saved').textContent = ok ? 'Saved' : 'Could not save';
    setTimeout(() => { $('saved').textContent = ''; }, 2000);
  });

  $('moreOptions').addEventListener('click', () => {
    try { chrome.runtime.openOptionsPage(); } catch (e) { /* ignore */ }
  });

  $('rescan').addEventListener('click', async () => {
    const res = await sendToTab({ type: 'HRA_RESCAN' });
    if (!res) setState('amber', 'Rescan failed. Try reloading the tab.');
    else setTimeout(refresh, 1500);
  });

  $('inject').addEventListener('click', () => {
    try {
      chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] }, () => {
        if (lastErr()) setState('amber', 'Inject failed. Try reloading the tab.');
        setTimeout(refresh, 1000);
      });
    } catch (e) { setState('amber', 'Inject failed. Try reloading the tab.'); }
  });

  $('reload').addEventListener('click', () => {
    try {
      chrome.tabs.reload(tab.id, {}, () => { lastErr(); setTimeout(refresh, 2500); });
    } catch (e) { /* ignore */ }
  });

  refresh();
})();
