# Development

There is no build step and there are no dependencies. The extension is plain JavaScript loaded directly by Chrome. This page covers the repo layout, the edit and reload cycle, and a technique for testing the content script without reloading the extension.

## Repo layout

| Path | Purpose |
| --- | --- |
| `manifest.json` | Manifest V3 definition: permissions, content script, popup, options page, icons. |
| `content.js` | The content script injected into `mail.hostinger.com`; all the identity-selection logic. |
| `background.js` | Service worker; injects `content.js` into already-open Hostinger tabs on install, update, and startup. |
| `popup.html`, `popup.js` | Toolbar popup: status, identities, default, activity, buttons. |
| `options.html`, `options.js` | Options page for the default identity for new messages. |
| `icons/` | Generated PNG icons (16, 48, 128). |
| `scripts/make-icons.py` | Standard-library-only icon generator. |
| `CHANGELOG.md` | Release notes. |
| `LICENSE` | MIT license. |
| `.gitattributes`, `.editorconfig` | Line ending and editor settings. |
| `docs/` | This documentation. |

## Reload cycle

1. Edit files.
2. Open `chrome://extensions` and click the reload icon on the extension. The background worker re-injects the content script into open Hostinger tabs.
3. If a page still behaves as before, reload the Webmail tab.
4. Popup and options pages pick up changes the next time they are opened.

## Manual testing

1. Load the extension unpacked and open Webmail.
2. Open a message sent to an alias and click Reply; the From picker should switch within about a second.
3. Open a new message with a default set and without one.
4. Try a popped-out reply, a forward, and switching between messages without reloading.
5. Check the popup's Recent activity for the expected lines.

Set `DEBUG = true` in `content.js` for console logs (see [troubleshooting.md](troubleshooting.md)).

## Testing without reloading the extension

You can paste `content.js` into the Webmail page's DevTools console to test logic changes quickly. Outside the extension there is no `chrome.storage`, so provide a tiny shim first. Paste this, then paste the contents of `content.js`:

```js
// Minimal chrome.storage shim for console testing.
window.chrome = window.chrome || {};
(function () {
  const data = {
    sync: { defaultSenderEmail: 'sales@example.com' },
    local: { knownIdentities: [], activityLog: [] },
  };
  const area = (name) => ({
    get: (key, cb) => cb({ [key]: data[name][key] }),
    set: (obj, cb) => { Object.assign(data[name], obj); if (cb) cb(); },
  });
  chrome.storage = { sync: area('sync'), local: area('local') };
  chrome.runtime = chrome.runtime || {};
  chrome.runtime.id = chrome.runtime.id || 'shim';
})();
```

Notes:

- The script guards against double injection with `window.__hostingerReplyAliasFixLoaded`. To re-test a changed version in the same page, run `delete window.__hostingerReplyAliasFixLoaded;` first (a previous copy keeps running its observer, so reload the tab between iterations for a clean result).
- `window.__hostingerReplyAliasFix.fixAll()` forgets what was handled and re-runs on every visible composer.
- `document.documentElement.dataset.hostingerReplyAliasFix` holds the version stamp; it is `unknown` when injected with the shim, and the real version when the extension is running. Use it to check which copy is active.

## Icons

Regenerate the PNGs with:

```
python -I scripts/make-icons.py
```

It writes `icons/icon16.png`, `icon48.png`, and `icon128.png`, and uses only the Python standard library.

## Versioning and changelog

- Versions follow Semantic Versioning; the version in `manifest.json` is the source of truth (the popup and the page stamp read it).
- Every user-visible change gets an entry in `CHANGELOG.md` under a dated version heading, in Keep a Changelog style (Added, Changed, Fixed).
- Bump `manifest.json` and add the changelog entry in the same change.

## Line endings

`.gitattributes` sets `* text=auto eol=lf`, so text files use LF in the repository and working tree, and PNGs are marked binary. `.editorconfig` carries the matching editor settings.

## See also

[README](../README.md) | [How it works](how-it-works.md) | [Selectors and messages](selectors.md) | [Troubleshooting](troubleshooting.md)
