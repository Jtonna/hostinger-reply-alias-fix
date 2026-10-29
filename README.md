# Hostinger Reply Alias Fix

Chrome extension that makes Hostinger Webmail reply from the alias the message was sent to.

## The problem

Hostinger Webmail's reply composer always defaults the From identity to the mailbox's primary address, even when the original message was sent to one of your aliases. You have to notice and switch it by hand every time.

## How it works

The extension re-checks composers continuously (lightweight: about once a second, plus whenever the page changes), so navigating within webmail (reply, back to the inbox, New message) never needs a reload. When a reply or forward composer is visible, it reads the recipient addresses from the original message's header and selects the matching identity in the composer's From picker. It is generic: nothing is hardcoded, and it matches against whatever identities the picker offers.

It makes no network calls and never sends mail. On install or update it also injects itself into Hostinger tabs that are already open, so no page refresh is needed. The permissions it requests are `storage` (to remember your preference, the identities it has seen, and a short activity log, locally in your browser), `activeTab` (so the status popup can check the current tab when you click the toolbar icon), `scripting`, and a host permission for mail.hostinger.com (used only to inject the content script into already-open tabs; still no network calls).

## Default identity for new messages

By default, new messages use Hostinger's default identity. To choose another:

1. Open the extension's Options: `chrome://extensions` -> Details -> Extension options, or right-click the extension icon -> Options.
2. Pick an identity from the list (or type an address such as `alias@example.com`) and save.

New messages will then start with that identity. Replies and forwards still follow the original message's recipient. The list fills in as the extension sees your identities: open Webmail and click Reply on any message once. Clear the choice to keep Hostinger's default.

## Install (unpacked)

1. Open `chrome://extensions`.
2. Turn on Developer mode.
3. Click **Load unpacked** and select this folder.
4. Open (or reload) https://mail.hostinger.com.

## Status popup

Click the toolbar icon to see what the extension is doing. The **This tab** section shows one of:

- **Active on this tab** (green): the content script is running on the Hostinger Webmail tab.
- **Hostinger Webmail tab, but the extension isn't running here** (amber): normally the extension injects itself into open tabs on install/update, but if it did not, click **Inject now** (or **Reload tab**).
- **Not a Hostinger Webmail tab** (grey): nothing to do on this tab.

It also lists the identities learned (filled in after you click Reply once), lets you change the default identity for new messages (saved immediately), and shows recent activity. **Rescan open composers** re-runs the fix on composers already open.

## Verify

Open a message that was sent to one of your aliases and click Reply. The From picker should switch to that alias within about a second.

For details, set `DEBUG = true` in `content.js`, reload the extension, and look for `[hostinger-reply-alias]` lines in the DevTools console. To reprocess open composers manually, run `window.__hostingerReplyAliasFix.fixAll()` in the console.

## Limitations

- BCC'd aliases cannot be detected, because the address is not in the message header. The default identity stays.
- Depends on Hostinger's `data-qa` attributes. If Hostinger renames them, the selectors below need updating.
- New messages use your chosen default identity (see above); replies and forwards follow the original recipient.

## Development

There is no build step and no dependencies.

1. Edit `content.js` (or `options.html` / `options.js`).
2. Reload the extension at `chrome://extensions`, then reload the Webmail tab.
3. Set `DEBUG = true` in `content.js` to get `[hostinger-reply-alias]` console logs.
4. Regenerate icons with `python -I scripts/make-icons.py` (standard library only).

## Selectors used

| Selector | Purpose |
| --- | --- |
| `[data-qa="message-composer"]` | Reply/forward/new composer (a new message has no related message header) |
| `button[data-qa="composer-from"]` | From picker button |
| `li[role="option"]` | Picker options |
| `[data-qa="composer-sender-option"]` | Option label (name + email) |
| `[data-qa="message-details"]` | Message container |
| `[data-qa="message-details-header"]` | Header with sender and recipients |
| `[data-qa="composer-to-chip"]` | Prefilled recipient chip in the composer (marks a popped-out reply/forward) |

## License

[MIT](LICENSE)
