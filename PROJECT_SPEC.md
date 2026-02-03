# Project Spec: Poker Settle

## Overview

Poker Settle is a real-time browser-based poker app with built-in session ledger and settlement guidance. It targets friend groups who play poker online (e.g., on PokerNow) and want a seamless way to track buy-ins and calculate who owes whom at the end — minimizing the number of Venmo/Zelle transactions needed.

## Problem

The "banker" in a poker group has to manually track buy-ins, rebuys, and final chip counts, then figure out the optimal set of payments so everyone settles up. This is tedious and error-prone.

## Solution

A shareable-link poker game that:
- Lets friends join a room instantly (no accounts)
- Plays Texas Hold'em with real-time state sync
- Tracks money in/out per player across the session
- At session end, computes the minimum set of peer-to-peer payments and tells each player exactly who to pay (and how much) via Venmo/Zelle

## Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Frontend | **SvelteKit** | Small bundles, fast iteration, great mobile perf |
| Real-time | **PartyKit** | Room-based multiplayer out of the box, edge-deployed, minimal boilerplate |
| Hand Evaluation | **pokersolver** | Most popular JS poker hand evaluator (~360 GitHub stars), supports Texas Hold'em |
| Card UI | **SVG playing cards** (`@letele/playing-cards` or custom) | Lightweight, crisp on all screens |
| Database | **None for MVP** | Game state lives in PartyKit server memory; no persistence needed |
| Deployment | **Vercel (frontend) + PartyKit (real-time)** | Free tiers, zero-config deploys |

## Core Features (V1)

### 1. Room System
- Create a room → get a shareable link
- Join via link — enter a display name, no signup
- Host can configure table (buy-in amount, blind structure)

### 2. Texas Hold'em Engine
- Standard No-Limit Texas Hold'em rules
- Automated dealing, community cards, pot calculation
- Hand evaluation via `pokersolver`
- Support for 2–9 players

### 3. Real-Time Multiplayer
- WebSocket-based state sync via PartyKit
- Optimistic UI updates with server reconciliation
- Auto-reconnect on disconnect
- Spectator mode for latecomers mid-hand

### 4. Session Ledger & Settlement
- Track each player's buy-ins, rebuys, and final chip count
- "End Session" action (host only) locks the table
- Settlement engine computes minimum transactions using debt simplification algorithm
- Display: "Player A → pays $25 → Player B" with Venmo/Zelle deep links (prefilled amounts)

### 5. Responsive UI
- Mobile-first card table layout
- Works on phones, tablets, and desktop browsers
- Touch-friendly controls for betting (slider + preset buttons)

## Out of Scope (V1)
- User accounts / authentication
- Persistent game history
- Automated payments (Venmo/Zelle API integration)
- Tournament mode / sit-and-go
- Other poker variants (Omaha, etc.)
- Chat (players already use Discord/iMessage)

## Non-Functional Requirements
- Latency: < 100ms action-to-update for players in the same region
- Mobile: Fully playable on iOS Safari and Android Chrome
- Concurrent: Support at least 1 table of 9 players reliably
