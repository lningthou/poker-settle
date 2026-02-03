# Poker Settle

A real-time browser-based poker app with built-in session settlement. Players join via shareable links (no accounts), play Texas Hold'em with WebSocket-powered multiplayer, and get optimized Venmo/Zelle payment instructions when the session ends.

## Project Structure

```
batcave/
├── CLAUDE.md                  # Project-level instructions for Claude
├── PROJECT_SPEC.md            # Full project specification
├── docs/
│   ├── status.md              # Milestone tracking and progress
│   └── changelog.md           # Record of all project changes
├── src/                       # Application source (SvelteKit + PartyKit)
│   ├── lib/                   # Shared library code
│   │   ├── engine/            # Poker game engine (state machine, hands, pots)
│   │   └── settlement/        # Debt simplification / settlement calculator
│   ├── routes/                # SvelteKit pages and API routes
│   └── party/                 # PartyKit server (real-time room logic)
├── static/                    # Static assets (card SVGs, sounds)
└── tests/                     # Unit and integration tests
```

## Key Files

- **`PROJECT_SPEC.md`** — Complete project specification including tech stack, features, and non-functional requirements.
- **`docs/status.md`** — Tracks all milestones with task-level checkboxes; shows current, upcoming, and completed work.
- **`docs/changelog.md`** — Chronological log of all notable changes to the project.

## Core Workflow

You MUST update `docs/status.md` and `docs/changelog.md` before every commit or push to reflect current progress and changes.
