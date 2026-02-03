# Project Status

## Milestones

### Milestone 1: Core Poker Engine
**Status**: Completed

- [x] Game state machine (pre-flop, flop, turn, river, showdown)
- [x] Deck, shuffle, and dealing logic
- [x] Betting rounds (check, call, raise, fold, all-in)
- [x] Pot calculation (including side pots)
- [x] Hand evaluation integration (`pokersolver`)
- [x] Settlement calculator (debt simplification algorithm)
- [x] Unit tests for engine logic (30 tests passing)

### Milestone 2: Real-Time Multiplayer
**Status**: Current

- [ ] PartyKit server setup with room-based state
- [ ] Shareable room link generation
- [ ] Player join/leave flow (display name only)
- [ ] WebSocket message protocol design
- [ ] State sync between server and clients
- [ ] Reconnection handling

### Milestone 3: Responsive UI
**Status**: Upcoming

- [x] SvelteKit project scaffold
- [ ] Card table layout (mobile-first)
- [ ] Player seats and card rendering (SVG)
- [ ] Betting controls (slider + presets)
- [ ] Game status display (pot, community cards, turn indicator)
- [ ] Join/lobby screen

### Milestone 4: Session Ledger & Settlement
**Status**: Upcoming

- [x] Debt simplification algorithm (minimize transactions)
- [ ] Buy-in and rebuy tracking per player
- [ ] End session flow (host action)
- [ ] Settlement results screen with Venmo/Zelle deep links

### Milestone 5: Polish & Deploy
**Status**: Upcoming

- [ ] Card deal / flip animations
- [ ] Sound effects (toggle-able)
- [ ] Edge case handling (disconnect mid-hand, player timeout)
- [ ] Deploy frontend to Vercel
- [ ] Deploy real-time server to PartyKit
- [ ] End-to-end testing with friends
