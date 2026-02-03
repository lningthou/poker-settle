# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Added
- Initial project specification (`PROJECT_SPEC.md`)
- Project status tracking (`docs/status.md`)
- This changelog (`docs/changelog.md`)
- SvelteKit + TypeScript project scaffold
- Poker game engine (`src/lib/engine/`)
  - Deck with Fisher-Yates shuffle
  - Game state machine (waiting → preflop → flop → turn → river → showdown → complete)
  - Full betting actions: fold, check, call, raise, all-in
  - Side pot calculation
  - Hand evaluation via `pokersolver`
  - Winner determination and pot distribution
- Settlement calculator (`src/lib/settlement/`)
  - Debt simplification algorithm (minimizes number of transactions)
  - Venmo deep link generation
- 30 unit tests covering deck, game engine, and settlement logic
