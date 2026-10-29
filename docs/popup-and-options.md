# Popup and options

The toolbar popup is the main way to see what the extension is doing and to set the default identity for new messages. The options page offers the same default setting plus a free-text field.

## Popup

Click the toolbar icon to open it.

### This tab

A status dot and message:

- Green, "Active on this tab (vX.Y.Z)": the content script is running on the Webmail tab.
- Amber, "Hostinger Webmail tab, but the extension isn't running here": the page is on `mail.hostinger.com` but the content script did not answer. Normally the extension injects itself on install or update; if that did not happen, use **Inject now** or **Reload tab**.
- Grey, "Not a Hostinger Webmail tab": nothing to do on this tab.

### Identities learned

The identities seen in the From picker, shown as `Name <address>`. The list is empty until a composer has been handled, so open a message and click Reply once.

### Default for new messages

A drop-down of learned identities plus "Hostinger default". Choosing one is saved immediately ("Saved" appears briefly). If the stored default is not among the learned identities it is still listed, so it is never silently dropped. **More options** opens the options page.

### Recent activity

The last eight events, newest first, each with a time stamp, such as "reply: selected ..." or "new message: no default set, left Hostinger default". It shows live events from the tab when active, and the stored log otherwise.

### Buttons

- **Rescan open composers**: forgets what was handled and re-runs the fix on every visible composer. Enabled only when the extension is active on the tab.
- **Inject now**: appears only in the amber state. Injects the content script into the current tab.
- **Reload tab**: reloads the current tab.

## Options page

Open it from the popup's **More options**, from `chrome://extensions` (Details, Extension options), or by right-clicking the toolbar icon and choosing Options.

- **Known identities**: a drop-down of learned identities (hidden, with a hint, until some are learned).
- **Or type an email address**: enter any address, for example `you@example.com`. Typing an address that matches a known identity updates the drop-down.
- **Save**: stores the address lowercased. Leave it empty to keep Hostinger's default.

## How the default behaves

- It applies to new messages only (composers with no related message).
- Replies and forwards ignore it; they follow the original message's recipient.
- If the chosen address is not offered by the From picker, nothing is changed and the activity log says "no matching identity, left default".
- It is stored in `chrome.storage.sync`, so it follows your Chrome profile across devices when sync is on.

## See also

[README](../README.md) | [How it works](how-it-works.md) | [Selectors and messages](selectors.md) | [Troubleshooting](troubleshooting.md)
