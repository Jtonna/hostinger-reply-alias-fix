# Selectors and messages

The extension depends on Hostinger Webmail's `data-qa` attributes, which are not a public API and can change. This page lists everything it relies on, so you can check the page when something stops working, along with the storage keys and message types it uses.

## Page selectors

All selectors live in the `SEL` map at the top of `content.js`.

| `SEL` key | Selector | Identifies | If Hostinger renames it |
| --- | --- | --- | --- |
| `composer` | `[data-qa="message-composer"]` | Any composer (reply, forward, new) | Nothing is detected; the extension does nothing. |
| `fromBtn` | `button[data-qa="composer-from"]` | The From picker button in a composer | Composers are ignored, as if they had no From field. |
| `option` | `li[role="option"]` | One entry in the open From picker | Options cannot be read; "From picker did not open" appears in activity. |
| `optionLabel` | `[data-qa="composer-sender-option"]` | The label inside an option (name and address spans) | Same as above: no identities are found. |
| `message` | `[data-qa="message-details"]` | A message container; a composer inside it is an inline reply | Inline replies are treated as new messages (the default is applied instead). |
| `header` | `[data-qa="message-details-header"]` | The header holding sender and recipients | Recipients cannot be read; replies do not switch identity. |
| `toChip` | `[data-qa="composer-to-chip"]` | A prefilled recipient in the composer; marks a popped-out reply or forward | Popped-out replies are treated as new messages. |

## Storage keys

| Area | Key | Contents |
| --- | --- | --- |
| `chrome.storage.sync` | `defaultSenderEmail` | Lowercased address used for new messages; empty string or absent means keep Hostinger's default. |
| `chrome.storage.local` | `knownIdentities` | Array of `{ name, email }` seen in the From picker. |
| `chrome.storage.local` | `activityLog` | Array of the last 20 `{ t, msg }` events (`t` is a millisecond timestamp). |

## Runtime messages

Sent by the popup to the content script in the active tab with `chrome.tabs.sendMessage`.

### `HRA_STATUS`

Request: `{ type: 'HRA_STATUS' }`

Response:

```
{
  version: string,            // extension version
  composersOnPage: number,    // all matching composers
  visibleComposers: number,   // composers currently visible
  handled: string[],          // 'reply' or 'new' for each visible composer
  identitiesSeen: { name, email }[],
  lastEvents: { t, msg }[]    // up to the last 8 events
}
```

No response (an error from `sendMessage`) means the content script is not running in that tab; the popup shows that as amber.

### `HRA_RESCAN`

Request: `{ type: 'HRA_RESCAN' }`

Response: `{ ok: true }`. The content script forgets what it has handled and re-runs on every visible composer.

## See also

[README](../README.md) | [How it works](how-it-works.md) | [Troubleshooting](troubleshooting.md) | [Development](development.md)
