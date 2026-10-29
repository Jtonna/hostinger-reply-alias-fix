# Privacy and permissions

The extension works entirely inside your browser. It makes no network requests, has no analytics, and never sends mail. This page explains each permission it asks for, what it stores, and what it does not collect.

## Permissions

| Permission | Why it is needed |
| --- | --- |
| `storage` | Saves your default identity (sync storage), and the identities it has seen and a short activity log (local storage). |
| `activeTab` | Lets the toolbar popup talk to the current tab when you click the icon, to report whether the extension is running there. |
| `scripting` | Lets the extension inject `content.js` into Hostinger tabs that were already open at install or update, and via the popup's **Inject now** button. |
| Host permission `https://mail.hostinger.com/*` | Allows the content script to run on Hostinger Webmail, and allows script injection into already-open Webmail tabs. It is not used for any network request. |

The extension requests no access to any other site.

## What is stored

| Where | Key | Contents |
| --- | --- | --- |
| `chrome.storage.sync` | `defaultSenderEmail` | The address you chose as the default for new messages. Synced by Chrome with your profile if you have sync on. |
| `chrome.storage.local` | `knownIdentities` | Names and addresses of the identities listed in the From picker. Stays on this device. |
| `chrome.storage.local` | `activityLog` | The last 20 short status messages (for example "reply: selected ..."), with time stamps. Stays on this device. |

## What it reads from the page

To do its job the content script reads message header text (to find the recipient addresses) and the From picker options. These are used in memory to choose an identity. Message bodies and header contents are not stored, logged, or transmitted. Addresses of identities you own, from the From picker, are the only page data that is saved.

## What is never collected

- No message content, subjects, or contact lists.
- No browsing history or data from other sites.
- No analytics, telemetry, or crash reporting.
- No remote code, and no network requests of any kind.

## Removing your data

Clear the default on the options page, or remove the extension at `chrome://extensions`, which deletes everything it stored.

## See also

[README](../README.md) | [How it works](how-it-works.md) | [Selectors and messages](selectors.md) | [Troubleshooting](troubleshooting.md)
