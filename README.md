# Hostinger Reply Alias Fix

A Chrome extension that makes Hostinger Webmail send from the right identity.

If you use Hostinger Webmail with several sender identities (aliases) on one mailbox, this extension picks the correct From identity for you. Replies and forwards use the identity the original message was addressed to, and new messages start from a default you choose. It is for anyone who is tired of checking the From field before every send.

## The problem

Hostinger Webmail's composer always picks the mailbox's primary identity when you reply, ignoring which alias the message was actually sent to. New messages likewise always start from the primary identity. You have to notice and switch it by hand, every time.

## What it does

- Replies and forwards use the identity the original message was addressed to (matched against the To and Cc recipients).
- New messages use a default identity you choose in the toolbar popup or options page.
- A toolbar popup shows whether the extension is running on the current tab, the identities it has learned, the default, and recent activity.
- Set and forget: it re-checks composers continuously, so navigating within Webmail never needs a reload, and on install or update it injects itself into Hostinger tabs that are already open.
- Private: no network calls, and nothing leaves the page. Permissions are limited to local storage, the active tab, script injection, and `mail.hostinger.com`; see [Privacy and permissions](docs/privacy-and-permissions.md) for why each is needed.

## Install

1. Open `chrome://extensions`.
2. Turn on Developer mode.
3. Click **Load unpacked** and select this folder.
4. Open (or reload) https://mail.hostinger.com.

## First use

1. Open any message in Webmail and click Reply once. The extension reads the From picker and learns your identities.
2. Click the toolbar icon and, under **Default for new messages**, choose the identity new messages should start from.

From then on, replying to a message sent to an alias selects that alias within about a second.

## Documentation

- [How it works](docs/how-it-works.md): the mechanism, step by step, including retries and the post-selection watch.
- [Selectors and messages](docs/selectors.md): every page selector the extension depends on, storage keys, and runtime messages.
- [Popup and options](docs/popup-and-options.md): what the popup states and buttons mean, and how the default identity behaves.
- [Troubleshooting](docs/troubleshooting.md): symptoms, causes and fixes, debug logging, and what to include in a bug report.
- [Development](docs/development.md): repo layout, reload cycle, manual testing, and conventions.
- [Privacy and permissions](docs/privacy-and-permissions.md): each permission explained, and what is stored.

## Development

There is no build step and no dependencies. Edit the files, reload the extension at `chrome://extensions`, then reload the Webmail tab. Regenerate the icons with:

```
python -I scripts/make-icons.py
```

See [docs/development.md](docs/development.md) for testing details.

## Changelog

See [CHANGELOG.md](CHANGELOG.md).

## License

[MIT](LICENSE)
