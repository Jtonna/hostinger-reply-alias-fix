# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/).

## [0.4.0] - 2026-10-28

### Fixed
- Composers that Hostinger reuses or pre-renders were ignored after the first time (New message with a default set did nothing; replies sometimes missed). Detection now re-evaluates on visibility/context change.

### Added
- Auto-inject into open Hostinger tabs on install/update, so no page refresh is needed.
- "Inject now" button in the popup.

## [0.3.0] - 2026-10-28

### Added
- Toolbar popup showing whether the extension is running on the current tab, identities learned, default identity (editable), and recent activity; reload/rescan buttons.

## [0.2.0] - 2026-10-28

### Added
- Options page to choose a default From identity for new messages.
- The extension remembers identities it has seen so you can pick from a list.

## [0.1.0] - 2026-10-28

### Added
- Initial release.
- Auto-selects the matching From identity when replying to or forwarding a
  message in Hostinger Webmail.
- Extension icons and a reproducible generator script (`scripts/make-icons.py`).
