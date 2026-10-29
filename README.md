# Hostinger Reply Alias Fix

Chrome extension that makes Hostinger Webmail reply from the alias the message was sent to.

## The problem

Hostinger Webmail's reply composer always defaults the From identity to the mailbox's primary address, even when the original message was sent to one of your aliases. You have to notice and switch it by hand every time.

## How it works

When a reply or forward composer opens, the extension reads the recipient addresses from the original message's header and selects the matching identity in the composer's From picker. It is generic: nothing is hardcoded, and it matches against whatever identities the picker offers.

It makes no network calls, requests no permissions, and no data leaves the page. It never sends mail.

## Install (unpacked)

1. Open `chrome://extensions`.
2. Turn on Developer mode.
3. Click **Load unpacked** and select this folder.
4. Open (or reload) https://mail.hostinger.com.

## Verify

Open a message that was sent to one of your aliases and click Reply. The From picker should switch to that alias within about a second.

For details, set `DEBUG = true` in `content.js`, reload the extension, and look for `[hostinger-reply-alias]` lines in the DevTools console. To reprocess open composers manually, run `window.__hostingerReplyAliasFix.fixAll()` in the console.

## Limitations

- BCC'd aliases cannot be detected, because the address is not in the message header. The default identity stays.
- Depends on Hostinger's `data-qa` attributes. If Hostinger renames them, the selectors below need updating.
- Replies and forwards only. New messages use the default identity.

## Development

There is no build step and no dependencies.

1. Edit `content.js`.
2. Reload the extension at `chrome://extensions`, then reload the Webmail tab.
3. Set `DEBUG = true` in `content.js` to get `[hostinger-reply-alias]` console logs.
4. Regenerate icons with `python -I scripts/make-icons.py` (standard library only).

## Selectors used

| Selector | Purpose |
| --- | --- |
| `[data-qa="message-composer"]` | Reply/forward/new composer |
| `button[data-qa="composer-from"]` | From picker button |
| `li[role="option"]` | Picker options |
| `[data-qa="composer-sender-option"]` | Option label (name + email) |
| `[data-qa="message-details"]` | Message container |
| `[data-qa="message-details-header"]` | Header with sender and recipients |

## License

[MIT](LICENSE) (c) 2026 Jacob Tonna
