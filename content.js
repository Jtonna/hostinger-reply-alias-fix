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

  const processed = new WeakSet(); // composers already handled
  const inFlight = new WeakSet();  // composers currently being handled

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
    await storageSet('local', { knownIdentities: [...seen.values()] });
  }

  /**
   * Open the From picker, read + cache identities, and select the identity
   * chosen by pickTarget(options) (returns an option or null/undefined).
   * Returns false if the composer went away mid-way, true otherwise.
   */
  async function selectIdentity(composer, btn, pickTarget) {
    if (!(await openPicker(btn))) { log('picker options did not appear'); await closePicker(btn); return true; }
    if (!composer.isConnected) return false;

    const options = readOptions();
    log('identities:', options.map((o) => o.email));
    await cacheIdentities(options);
    if (!composer.isConnected) return false;

    const match = pickTarget(options);
    if (!match) {
      log('no matching identity; leaving default');
      await closePicker(btn);
      return true;
    }

    const current = norm(textOf(btn));
    if (current === match.name || current.toLowerCase().includes(match.email)) {
      log('already using', match.email);
      await closePicker(btn);
      return true;
    }

    match.element.click();
    await sleep(300);
    if (!composer.isConnected) return false;
    const after = norm(textOf(btn));
    const ok = after === match.name;
    log(ok ? 'selected' : 'selection may have failed', match.email, '-> button shows:', after);
    if (isOpen(btn)) await closePicker(btn);
    return true;
  }

  async function fixComposer(composer) {
    if (!composer.isConnected || inFlight.has(composer)) return;
    inFlight.add(composer);
    try {
      const header = findHeader(composer);

      const btn = composer.querySelector(SEL.fromBtn);
      if (!btn) { log('no From button found'); return; }

      if (!header) {
        // New message: use the user's configured default identity, if any.
        const raw = await storageGet('sync', 'defaultSenderEmail');
        const wanted = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
        if (!wanted) { log('no related message header; new message, no default set, skipping'); return; }
        log('new message; default identity:', wanted);
        await selectIdentity(composer, btn, (opts) => opts.find((o) => o.email === wanted));
        return;
      }

      const recips = recipientsOf(header);
      log('recipients of related message:', [...recips]);

      await selectIdentity(composer, btn, (options) => {
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
      });
    } catch (err) {
      console.warn(TAG, 'error', err);
    } finally {
      inFlight.delete(composer);
    }
  }

  function schedule(composer) {
    if (processed.has(composer)) return;
    processed.add(composer);
    setTimeout(() => fixComposer(composer), 250);
  }

  function scanNode(node) {
    if (node.nodeType !== 1) return;
    if (node.matches && node.matches(SEL.composer)) schedule(node);
    if (node.querySelectorAll) node.querySelectorAll(SEL.composer).forEach(schedule);
  }

  /** Manual testing: process every composer currently on the page. */
  function fixAll() {
    document.querySelectorAll(SEL.composer).forEach((c) => {
      processed.add(c);
      fixComposer(c);
    });
  }

  const observer = new MutationObserver((muts) => {
    for (const m of muts) m.addedNodes.forEach(scanNode);
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // Composer may already be present at load.
  scanNode(document.body);

  window.__hostingerReplyAliasFix = { fixAll };
  log('loaded');
})();
