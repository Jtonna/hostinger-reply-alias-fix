# Troubleshooting

Each entry below is a symptom, its likely cause, and what to do. The popup's **Recent activity** list is the first place to look; it records what the extension decided for each composer.

## The popup shows amber ("extension isn't running here")

Cause: the Webmail tab was opened before the extension was installed, or the content script otherwise is not present in the page.

Fix: click **Inject now**, or **Reload tab**. After you reload the extension at `chrome://extensions`, the background worker re-injects into open Hostinger tabs automatically, so this should be rare.

## A new message did not switch identity

Possible causes:

- No default is set. Activity shows "new message: no default set, left Hostinger default". Choose one in the popup.
- The chosen identity is not in the From picker. Activity shows "new message: no matching identity, left default". Check the address for typos and that the picker really lists it.
- The composer was not handled. Activity shows "Giving up on this composer"; see below.

## A reply picked the wrong or primary identity

- The alias was BCC'd. Blind copies are not in the message header, so the address cannot be seen and Hostinger's default stays.
- The alias is not in To or Cc of the message you replied to. The extension then tries other headers in the same thread (most recent first); if none match, the default stays. Activity shows "reply: no matching identity, left default".
- The identity is not offered by the From picker, so there is nothing to select.
- Hostinger may have reset the identity after the extension set it. The extension re-applies up to twice within 5 seconds; if it still loses, try **Rescan open composers**.

## "Giving up on this composer"

The extension tried 5 times to drive the From picker for the same composer and context and each attempt failed, usually because the picker did not open or the composer disappeared. It will not retry that context until it changes. Use **Rescan open composers** to try again, and check that the selectors in [selectors.md](selectors.md) still exist on the page.

## Enable debug logs

1. In `content.js`, set `const DEBUG = true;`.
2. Reload the extension at `chrome://extensions`, then reload the Webmail tab.
3. Open DevTools on the Hostinger tab and look at the Console for lines starting with `[hostinger-reply-alias]`.

Content scripts log in the page's console, not in the extension's service worker console.

The page-level hook `window.__hostingerReplyAliasFix.fixAll()` re-runs the fix on open composers from the console.

## Reset stored data

Chrome does not offer a "clear data" button for an extension. To clear the default and learned identities:

- Open the options page, clear the address field, and click Save to remove the default. Learned identities repopulate themselves as composers are handled.
- To wipe everything (default, identities, activity log), remove the extension at `chrome://extensions` and add it again with **Load unpacked**.

## Filing an issue

Please include:

- The extension version (shown in the popup when active, for example "v0.4.0").
- The relevant lines from **Recent activity**.
- Whether the selectors listed in [selectors.md](selectors.md) still exist on the page (inspect the From button and a message header in DevTools).
- Whether the case was a reply, a forward, a popped-out composer, or a new message.

Use placeholder addresses such as `sales@example.com` rather than real ones.

## See also

[README](../README.md) | [How it works](how-it-works.md) | [Selectors and messages](selectors.md) | [Popup and options](popup-and-options.md)
