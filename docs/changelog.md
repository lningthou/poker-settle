# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Added
- Bet panel with presets instead of always-visible slider
  - Bet/Raise button reveals preset panel with 1/4, 1/2, 3/4, Pot, and All-in options
  - Slider still available for custom amounts
  - Panel animates in with slide-up effect
- Showdown card reveal
  - Opponent cards are now revealed during showdown phase
  - Players can visually see the winning hand
  - Protocol extended with `showdownCards` in hand-result message
- SB and BB badges alongside dealer badge
  - Small blind: blue badge
  - Big blind: red badge
  - Badges show correctly for heads-up (dealer is SB) and 3+ players
- Players positioned outside the table felt (around the table perimeter)
- Balatro-style UI overhaul
  - Design system (`src/lib/styles/balatro.css`) with:
    - Balatro color palette (dark blue-gray backgrounds, red/blue/gold accents)
    - Suit-specific colors (hearts pink, diamonds orange, clubs teal, spades purple)
    - m6x11 pixel font for retro aesthetic
    - Utility classes for consistent spacing and styling
    - Animation keyframes (pulse-glow, screen-shake, pop-in, slide-up, deal)
    - CRT scanline overlay effect
    - Animated gradient background
  - Reusable Card component (`src/lib/components/Card.svelte`) with:
    - Pixel-art style borders and Balatro suit colors
    - Face-up and face-down states with 3D flip animation
    - Deal animation (slide + scale + bounce)
    - Highlighted state with glow effect
    - Normal and small size variants
  - PlayerSeat component (`src/lib/components/PlayerSeat.svelte`) with:
    - Chip count display with pop animation on change
    - Dealer badge (gold "D" circle)
    - Status badges (FOLD, ALL IN, AWAY)
    - Pulsing glow effect on active player's turn
    - Position-aware layout (top, bottom, left, right)
  - PokerTable component (`src/lib/components/PokerTable.svelte`) with:
    - Player rotation so current player is always at bottom of their screen
    - Elliptical green felt table with chunky border
    - Pot display with gold styling
    - Community cards with staggered deal animation
    - Responsive player positioning for 2-6 players
  - Updated home page with decorative playing cards
  - Screen shake effect when player wins a hand
  - Bouncy button interactions with scale on hover/click

### Changed
- Refactored game room page to use new component architecture
- Increased max width from 600px to 800px for better table layout
- Buttons now use chunky 3D style with shadows

### Previously Added
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
- Auto-advance to next hand with 4-second countdown after showdown
- In-game chat feature (messages broadcast to all players in the room)
- Buy-in amount in dollars for real-money settlement calculations
- Chat messages now distinguish your own messages (red) from others (gray/white)

### Fixed
- Betting round logic: players were being skipped because `isBettingRoundOver` returned true after a single check (added `roundStartIndex` tracking so the round only ends when action returns to the starting player or last raiser)
- Copy share link button now works (async clipboard API with fallback to prompt)

### Changed
- Card colors: spades and clubs now render in black (was gray, hard to see on white cards)
- Config inputs: added +/- stepper buttons with better visibility and sizing
