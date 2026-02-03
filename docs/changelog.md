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
  - Game state machine (waiting -> preflop -> flop -> turn -> river -> showdown -> complete)
  - Full betting actions: fold, check, call, raise, all-in
  - Side pot calculation
  - Hand evaluation via `pokersolver`
  - Winner determination and pot distribution
- Settlement calculator (`src/lib/settlement/`)
  - Debt simplification algorithm (minimizes number of transactions)
  - Venmo deep link generation
- 30 unit tests covering deck, game engine, and settlement logic
- PartyKit real-time multiplayer server (`party/server.ts`)
  - Room-based game state management
  - Player join/leave/reconnect handling
  - WebSocket message protocol for game actions
  - Host-only controls (start game, next hand, end session)
  - Rebuy support between hands
- Client-side Svelte store (`src/lib/stores/game.ts`)
  - PartySocket connection with auto-reconnect
  - Reactive stores for all game state
  - Action dispatchers (fold, check, call, raise, all-in)
- WebSocket message protocol (`src/lib/protocol.ts`)
  - Typed client-to-server and server-to-client messages
  - Public player state (hides hole cards from opponents)
  - Private hole card delivery per player
- Home page with room creation and join-by-code flow
- Game room page with:
  - Lobby with game configuration (buy-in, blinds)
  - Community cards display on green felt
  - Player seats with chips, bets, dealer badge, card backs
  - Betting controls with fold/check/call/raise/all-in
  - Raise slider and numeric input
  - Hand result display
  - Settlement screen showing who pays whom
- Mobile-first responsive layout
- Host can kick players from lobby (X button on hover)
- Comprehensive server-side logging for debugging

### Fixed
- Betting round logic: players were being skipped because `isBettingRoundOver` returned true after a single check (added `roundStartIndex` tracking so the round only ends when action returns to the starting player or last raiser)

### Changed
- Card colors: spades and clubs now render in black (was gray, hard to see on white cards)
- Config inputs: added +/- stepper buttons with better visibility and sizing
