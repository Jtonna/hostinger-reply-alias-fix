# How it works

This page describes how the extension decides which From identity to select, and how it copes with the way Hostinger Webmail renders and reuses composers. In plain terms: a content script watches the page for open composers, works out whether each is a reply or a new message, and then drives the composer's own From picker as a user would.

## Overview

1. A content script runs on `https://mail.hostinger.com/*`.
2. It finds composers on the page.
3. For each visible composer it decides: reply/forward, or new message.
4. For a reply, it reads the recipients of the related message and picks the matching identity. For a new message, it picks the saved default, if any.
5. It opens the From picker, clicks the right option, and then watches briefly in case Hostinger resets it.

Nothing is hardcoded: it matches against whatever identities the picker offers.

## Flow

```
page change (MutationObserver, debounced 150 ms)  or  1 s interval
        |
        v
evaluateAll(): for each [data-qa="message-composer"]
        |
        +-- hidden / detached / no From button?  -> forget it, skip
        |
        +-- compute context key = kind + recipient addresses
        |       same key and same From button as last time? -> skip
        v
fixComposer()
        |
        +-- new message ----> read defaultSenderEmail (sync storage)
        |                       none set? -> done, leave Hostinger default
        |
        +-- reply/forward --> recipients of the message header (sender removed)
        |                       no match? -> thread fallback: other headers
        v
selectIdentity(): open picker -> read options -> cache identities
        |   already using it? -> close picker, done
        |   click matching option
        v
watchSelection(): poll 5 s, re-apply at most twice if Hostinger resets it
```

## Composer discovery

Composers are found with `[data-qa="message-composer"]`. Only composers that are connected, have a layout box (visible), and contain a `button[data-qa="composer-from"]` are considered.

## Reply versus new message

A composer is a reply or forward when either:

- it sits inside a `[data-qa="message-details"]` container (an inline reply), in which case that container's `[data-qa="message-details-header"]` is the related header; or
- it is outside any message but has a prefilled `[data-qa="composer-to-chip"]` (a popped-out reply or forward), in which case the last message header on the page is used.

Otherwise it is a new message and no header is associated with it.

## Recipient extraction

The header's text is gathered by joining its text nodes with single spaces (plain `textContent` would glue adjacent spans together and corrupt addresses). The sender is taken to be the address in angle brackets following the word "From", and is removed. Every other address in the header (To, Cc) is a candidate, lowercased. The first picker option whose address is in that set is selected.

If nothing matches, the extension falls back to the rest of the thread: it scans every message header on the page, most recent first, and uses the first one whose recipients include a known identity.

## Identity selection

The From picker is driven like a user would:

1. Click the `composer-from` button (unless already expanded) and wait up to about 1.5 s for options.
2. Read each `li[role=option]`. Inside it, the `composer-sender-option` element holds child spans for the name and the address.
3. Cache the identities (deduplicated by address) for the popup and options page.
4. If the button already shows the target identity, close the picker and stop.
5. Otherwise click the target option and confirm the button text changed.

## Context-keyed re-evaluation

Hostinger reuses and pre-renders composer elements, and restores drafts, so a composer node that was handled once can later show a different context (for example the same node reused for a new message after a reply). The extension therefore does not mark a node as done forever. It remembers, per composer, the From button element and a context key (kind plus the related header's addresses). If either changes, the composer is handled again. If a composer becomes hidden or detached, its record is dropped, because Hostinger may reset From when it is shown again.

Re-evaluation is triggered by a `MutationObserver` (child list, subtree, and `style`/`class`/`hidden` attribute changes, debounced 150 ms) and by a 1-second interval as a safety net. When nothing changed the check is a cheap no-op. Only one evaluation runs at a time, because the picker is document-global.

## Retries

If handling a composer fails (picker did not open, composer vanished mid-way), it is retried on later passes, up to 5 attempts for the same context. After that the activity log records "Giving up on this composer" and that context is not retried until it changes.

## Post-selection watch

Hostinger sometimes re-applies the previous identity shortly after it was changed. After selecting, the extension polls every 400 ms for up to 5 seconds. If the button no longer shows the chosen identity it opens the picker and selects it again, at most 2 times. The watch stops early if the composer is hidden, the button is detached, or the extension was reloaded.

## Orphan detection

After the extension is reloaded or updated, an already-injected content script loses its connection to the extension. It checks `chrome.runtime.id`; when that is gone it stops its observer and timers instead of throwing errors. The replacement script is injected as described below. A global flag prevents double injection if the script is injected on top of itself.

## Background worker

`background.js` queries tabs matching `https://mail.hostinger.com/*` on install, update, and browser startup, and injects `content.js` into each. This is why no page refresh is needed after installing or updating.

## See also

[README](../README.md) | [Selectors and messages](selectors.md) | [Troubleshooting](troubleshooting.md) | [Development](development.md)
