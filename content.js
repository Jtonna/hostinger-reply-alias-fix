/*
 * Hostinger Reply Alias Fix
 *
 * When a reply/forward composer appears in Hostinger Webmail, read the
 * recipient addresses of the message being replied to and select the matching
 * identity in the composer's From picker. New messages use the default
 * identity chosen on the options page, if any. Generic: no hardcoded addresses.
 */
(function () {
  'use strict';

  // Safe to inject twice (e.g. manual testing on top of the extension).
  if (window.__hostingerReplyAliasFixLoaded) return;
  window.__hostingerReplyAliasFixLoaded = true;

  const DEBUG = false;
  const TAG = '[hostinger-reply-alias]';
  const log = (...a) => { if (DEBUG) console.log(TAG, ...a); };

  const VERSION = (() => {
    try { return chrome.runtime.getManifest().version; } catch (e) { return 'unknown'; }
  })();
  try { document.documentElement.dataset.hostingerReplyAliasFix = VERSION; } catch (e) { /* ignore */ }

  // Activity ring: independent of DEBUG; mirrored to chrome.storage.local for the popup.
  const MAX_EVENTS = 20;
  const events = [];
  let seenIdentities = [];
  let persistChain = Promise.resolve();

  function record(msg) {
    const ev = { t: Date.now(), msg: String(msg) };
    events.push(ev);
    if (events.length > MAX_EVENTS) events.shift();
    persistChain = persistChain.then(async () => {
      const stored = await storageGet('local', 'activityLog');
      const list = Array.isArray(stored) ? stored : [];
      list.push(ev);
      await storageSet('local', { activityLog: list.slice(-MAX_EVENTS) });
    }).catch(() => {});
  }

  const SEL = {
    composer: '[data-qa="message-composer"]',
    fromBtn: 'button[data-qa="composer-from"]',
    option: 'li[role="option"]',
    optionLabel: '[data-qa="composer-sender-option"]',
    message: '[data-qa="message-details"]',
    header: '[data-qa="message-details-header"]',
    toChip: '[data-qa="composer-to-chip"]',
  };

  const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

  const handled = new WeakMap();   // composer -> { btn, key } of the last context fully handled
  const attempts = new WeakMap();  // composer -> failed picker attempts for the current context
  const inFlight = new WeakSet();  // composers currently being handled
  const MAX_ATTEMPTS = 5;
  let evaluating = false;          // one evaluateAll at a time (the picker is document-global)

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();

  /** Text of an element with text nodes joined by single spaces (textContent glues spans together). */
  function textOf(el) {
    if (!el) return '';
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const parts = [];
    let n;
    while ((n = walker.nextNode())) {
      const t = n.nodeValue.trim();
      if (t) parts.push(t);
    }
    return parts.join(' ');
  }

  function emailsIn(text) {
    return (text || '').match(EMAIL_RE) || [];
  }

  /**
   * Find the message header related to this composer, or null (new message).
   * 1. Inline reply/forward: composer sits inside message-details -> that header.
   * 2. Popped-out reply/forward: outside message-details but To is prefilled
   *    (a to-chip exists) -> the page's header (the last one if several).
   * 3. Otherwise (empty To, e.g. "New message" from the sidebar) -> null.
   */
  function findHeader(composer) {
    const msg = composer.closest(SEL.message);
    if (msg) return msg.querySelector(SEL.header) || null;
    if (composer.querySelector(SEL.toChip)) {
      const headers = document.querySelectorAll(SEL.header);
      if (headers.length) return headers[headers.length - 1];
    }
    return null;
  }

  /** Recipient addresses (lowercased) of a header, minus the sender. */
  function recipientsOf(header) {
    const text = textOf(header);
    // Sender is the address in <...> following "From".
    const fromMatch = text.match(/From[^<]*<\s*([^>\s]+)\s*>/i);
    const sender = fromMatch ? fromMatch[1].toLowerCase() : null;
    const set = new Set(emailsIn(text).map((e) => e.toLowerCase()));
    if (sender) set.delete(sender);
    return set;
  }

  const isOpen = (btn) => btn.getAttribute('aria-expanded') === 'true';

  async function openPicker(btn) {
    if (!isOpen(btn)) btn.click();
    for (let i = 0; i < 15; i++) { // ~1.5s
      await sleep(100);
      const opts = document.querySelectorAll(SEL.option + ' ' + SEL.optionLabel);
      if (opts.length) return true;
    }
    return false;
  }

  function readOptions() {
    const list = [];
    document.querySelectorAll(SEL.option).forEach((li) => {
      const label = li.querySelector(SEL.optionLabel);
      if (!label) return;
      // Email is the child span whose own text is an address; name is the other child.
      let email = null;
      let name = '';
      const kids = [...label.children];
      const emailKid = kids.find((k) => /^\s*[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\s*$/i.test(textOf(k)));
      if (emailKid) {
        email = textOf(emailKid).toLowerCase();
        name = norm(kids.filter((k) => k !== emailKid).map(textOf).join(' '));
      } else {
        const joined = textOf(label);
        const m = joined.match(EMAIL_RE);
        if (!m) return;
        email = m[m.length - 1].toLowerCase();
        name = norm(joined.replace(m[m.length - 1], ''));
      }
      list.push({ email, name, element: li });
    });
    return list;
  }

  async function closePicker(btn) {
    if (isOpen(btn)) {
      btn.click();
      await sleep(150);
      if (isOpen(btn)) {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      }
    }
  }

  const hasStorage = () => typeof chrome !== 'undefined' && !!chrome.storage;

  function storageGet(area, key) {
    return new Promise((resolve) => {
      try {
        if (!hasStorage() || !chrome.storage[area]) return resolve(undefined);
        chrome.storage[area].get(key, (res) => {
          if (chrome.runtime && chrome.runtime.lastError) return resolve(undefined);
          resolve(res ? res[key] : undefined);
        });
      } catch (e) { resolve(undefined); }
    });
  }

  function storageSet(area, obj) {
    return new Promise((resolve) => {
      try {
        if (!hasStorage() || !chrome.storage[area]) return resolve();
        chrome.storage[area].set(obj, () => resolve());
      } catch (e) { resolve(); }
    });
  }

  /** Remember the identities seen in the picker (deduped by email) for the options page. */
  async function cacheIdentities(options) {
    const seen = new Map();
    options.forEach((o) => { if (!seen.has(o.email)) seen.set(o.email, { name: o.name, email: o.email }); });
    if (!seen.size) return;
    seenIdentities = [...seen.values()];
    await storageSet('local', { knownIdentities: [...seen.values()] });
  }

  /**
   * Open the From picker, read + cache identities, and select the identity
   * chosen by pickTarget(options) (returns an option or null/undefined).
   * Returns false if the composer went away mid-way, true otherwise.
   */
  async function selectIdentity(composer, btn, pickTarget, kind) {
    if (!(await openPicker(btn))) { log('picker options did not appear'); record('From picker did not open'); await closePicker(btn); return false; }
    if (!composer.isConnected) return false;

    const options = readOptions();
    log('identities:', options.map((o) => o.email));
    await cacheIdentities(options);
    if (!composer.isConnected) return false;

    const match = pickTarget(options);
    if (!match) {
      log('no matching identity; leaving default');
      record(kind + ': no matching identity, left default');
      await closePicker(btn);
      return true;
    }

    const current = norm(textOf(btn));
    if (current === match.name || current.toLowerCase().includes(match.email)) {
      log('already using', match.email);
      record(kind + ': already using ' + match.email);
      await closePicker(btn);
      return true;
    }

    match.element.click();
    await sleep(300);
    if (!composer.isConnected) return false;
    const after = norm(textOf(btn));
    const ok = after === match.name;
    log(ok ? 'selected' : 'selection may have failed', match.email, '-> button shows:', after);
    record(kind + ': ' + (ok ? 'selected ' : 'tried to select (unconfirmed) ') + match.email);
    if (isOpen(btn)) await closePicker(btn);
    watchSelection(composer, btn, match); // fire-and-forget
    return true;
  }

  /**
   * Hostinger may asynchronously re-apply the previous identity right after we select ours.
   * Poll for up to 5s; re-apply at most twice. Never blocks the caller.
   */
  function watchSelection(composer, btn, match) {
    (async () => {
      try {
        let reapplied = 0;
        const deadline = Date.now() + 5000;
        while (Date.now() < deadline && reapplied < 2) {
          await sleep(400);
          if (isOrphaned() || !composerContext(composer) || !btn.isConnected) return;
          const cur = norm(textOf(btn));
          if (cur === match.name || cur.toLowerCase().includes(match.email)) continue;
          if (!(await openPicker(btn))) { await closePicker(btn); continue; }
          const fresh = readOptions().find((o) => o.email === match.email);
          if (!fresh || !composerContext(composer)) { await closePicker(btn); return; }
          fresh.element.click();
          await sleep(300);
          if (isOpen(btn)) await closePicker(btn);
          reapplied++;
          log('re-applied', match.email);
          record('re-applied ' + match.email + ' after Hostinger reset it');
        }
      } catch (err) { log('watch error', err); }
    })();
  }

  /** Visible composer with a From button, or null (hidden, detached, or not rendered yet). */
  function composerContext(composer) {
    if (!composer.isConnected || composer.getClientRects().length === 0) return null;
    const btn = composer.querySelector(SEL.fromBtn);
    if (!btn) return null;
    const header = findHeader(composer);
    return { composer, btn, header, kind: header ? 'reply' : 'new' };
  }

  function contextKey(ctx) {
    const emails = ctx.header ? emailsIn(textOf(ctx.header)).map((e) => e.toLowerCase()).join(',') : '';
    return ctx.kind + '|' + emails;
  }

  /** Returns true when the context is fully handled (success or no match), false to retry later. */
  async function fixComposer(ctx) {
    const { composer, btn, header } = ctx;
    try {
      record('Composer detected (' + (header ? 'reply/forward' : 'new message') + ')');

      if (!header) {
        // New message: use the user's configured default identity, if any (read fresh each time).
        const raw = await storageGet('sync', 'defaultSenderEmail');
        const wanted = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
        if (!wanted) { log('new message, no default set, skipping'); record('new message: no default set, left Hostinger default'); return true; }
        log('new message; default identity:', wanted);
        if (!composerContext(composer)) return false; // went away or hidden while reading storage
        return await selectIdentity(composer, btn, (opts) => opts.find((o) => o.email === wanted), 'new message');
      }

      const recips = recipientsOf(header);
      log('recipients of related message:', [...recips]);

      return await selectIdentity(composer, btn, (options) => {
        let match = options.find((o) => recips.has(o.email));

        // Thread fallback: scan all headers on the page, most recent (last) first.
        if (!match) {
          const headers = [...document.querySelectorAll(SEL.header)].reverse();
          for (const h of headers) {
            const r = recipientsOf(h);
            match = options.find((o) => r.has(o.email));
            if (match) { log('matched via thread fallback'); break; }
          }
        }
        return match;
      }, 'reply');
    } catch (err) {
      console.warn(TAG, 'error', err);
      return false;
    }
  }

  /** Re-check every composer; run the fix for any whose context changed since last handled. */
  async function evaluateAll() {
    if (isOrphaned()) { stopWatching(); return; }
    if (evaluating) return;
    evaluating = true;
    try {
      for (const composer of document.querySelectorAll(SEL.composer)) {
        if (inFlight.has(composer)) continue;
        const ctx = composerContext(composer);
        if (!ctx) {
          // Hidden/detached: Hostinger may reuse this node and reset From, so forget it.
          if (handled.has(composer)) { handled.delete(composer); attempts.delete(composer); }
          continue;
        }
        const key = contextKey(ctx);
        const prev = handled.get(composer);
        if (prev && prev.btn === ctx.btn && prev.key === key) continue;

        inFlight.add(composer);
        let done = false;
        try { done = await fixComposer(ctx); } finally { inFlight.delete(composer); }
        if (done) {
          handled.set(composer, { btn: ctx.btn, key });
          attempts.delete(composer);
        } else {
          const n = (attempts.get(composer) || 0) + 1;
          if (n >= MAX_ATTEMPTS) {
            record('Giving up on this composer after ' + n + ' attempts');
            handled.set(composer, { btn: ctx.btn, key });
            attempts.delete(composer);
          } else {
            attempts.set(composer, n);
          }
        }
      }
    } finally {
      evaluating = false;
    }
  }

  /** Manual testing / HRA_RESCAN: forget what was handled and re-run on every visible composer. */
  function fixAll() {
    document.querySelectorAll(SEL.composer).forEach((c) => { handled.delete(c); attempts.delete(c); });
    return evaluateAll();
  }

  /** True when the extension was reloaded/updated and this script's context is dead. */
  function isOrphaned() {
    try { return typeof chrome !== 'undefined' && !(chrome.runtime && chrome.runtime.id); } catch (e) { return true; }
  }

  let debounce = null;
  let timer = null;
  function stopWatching() {
    clearInterval(timer);
    clearTimeout(debounce);
    observer.disconnect();
  }
  const observer = new MutationObserver(() => {
    if (isOrphaned()) { stopWatching(); return; }
    clearTimeout(debounce);
    debounce = setTimeout(evaluateAll, 150);
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['style', 'class', 'hidden'],
  });

  // Safety net: cheap periodic re-check (no-op unless a composer's context changed).
  timer = setInterval(evaluateAll, 1000);
  evaluateAll();

  window.__hostingerReplyAliasFix = { fixAll };

  try {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
        if (!msg || typeof msg !== 'object') return;
        if (msg.type === 'HRA_STATUS') {
          const visible = [...document.querySelectorAll(SEL.composer)].map(composerContext).filter(Boolean);
          sendResponse({
            version: VERSION,
            composersOnPage: document.querySelectorAll(SEL.composer).length,
            visibleComposers: visible.length,
            handled: visible.map((c) => c.kind),
            identitiesSeen: seenIdentities,
            lastEvents: events.slice(-8),
          });
        } else if (msg.type === 'HRA_RESCAN') {
          fixAll();
          sendResponse({ ok: true });
        }
      });
    }
  } catch (e) { /* ignore */ }
  record('Content script loaded');
  log('loaded');
})();
