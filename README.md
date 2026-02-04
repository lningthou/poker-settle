# Poker Settle

Real-time multiplayer poker with a Balatro-inspired UI, built with SvelteKit + PartyKit.

## Features
- Texas Hold’em engine with side pots and showdown evaluation
- Rebuy + session settlement (chips or dollars)
- PartyKit real-time rooms with reconnect support
- Sound effects and retro UI polish
- Turn timer with auto check/fold on timeout
- Preset auto actions: Check/Fold, Check, Call Any, Fold

## Development

Install dependencies:

```sh
npm install
```

Run app + PartyKit server:

```sh
npm run dev
```

Run app only:

```sh
npm run dev:app
```

Run PartyKit only:

```sh
npm run dev:party
```

Run tests:

```sh
npx vitest run
```

## Notes
- The PartyKit dev server runs on `localhost:1999` by default.
- The Share button copies the room code to the clipboard.
