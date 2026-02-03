import { describe, it, expect } from 'vitest';
import { Deck } from '../src/lib/engine/deck';
import {
	createPlayer,
	createGameState,
	startHand,
	applyAction,
	evaluateHands,
	distributeWinnings,
	advanceDealer
} from '../src/lib/engine/poker';
import type { GameState, Player } from '../src/lib/engine/types';

function makePlayers(count: number, chips = 1000): Player[] {
	return Array.from({ length: count }, (_, i) =>
		createPlayer(`p${i + 1}`, `Player ${i + 1}`, chips)
	);
}

describe('Game State', () => {
	it('should create initial game state', () => {
		const players = makePlayers(3);
		const state = createGameState(players, 5, 10);

		expect(state.phase).toBe('waiting');
		expect(state.players).toHaveLength(3);
		expect(state.smallBlind).toBe(5);
		expect(state.bigBlind).toBe(10);
	});

	it('should start a hand with blinds posted', () => {
		const players = makePlayers(3);
		const state = createGameState(players, 5, 10);
		const deck = new Deck();

		startHand(state, deck);

		expect(state.phase).toBe('preflop');
		// With 3 players, dealer=0, SB=1, BB=2
		expect(state.players[1].chips).toBe(995); // SB
		expect(state.players[2].chips).toBe(990); // BB
		expect(state.pots[0].amount).toBe(15);
	});

	it('should deal 2 hole cards to each player', () => {
		const players = makePlayers(4);
		const state = createGameState(players, 5, 10);
		const deck = new Deck();

		startHand(state, deck);

		for (const player of state.players) {
			expect(player.holeCards).toHaveLength(2);
		}
	});

	it('heads up: dealer is small blind', () => {
		const players = makePlayers(2);
		const state = createGameState(players, 5, 10);
		const deck = new Deck();

		startHand(state, deck);

		// Dealer (idx 0) is SB in heads up
		expect(state.players[0].chips).toBe(995); // SB
		expect(state.players[1].chips).toBe(990); // BB
	});
});

describe('Betting Actions', () => {
	function setupPreflop(): { state: GameState; deck: Deck } {
		const players = makePlayers(3);
		const state = createGameState(players, 5, 10);
		const deck = new Deck();
		startHand(state, deck);
		return { state, deck };
	}

	it('should handle fold', () => {
		const { state, deck } = setupPreflop();
		const activeId = state.players[state.activePlayerIndex].id;

		applyAction(state, activeId, { type: 'fold' }, deck);

		const player = state.players.find((p) => p.id === activeId)!;
		expect(player.folded).toBe(true);
	});

	it('should handle call', () => {
		const { state, deck } = setupPreflop();
		const activeId = state.players[state.activePlayerIndex].id;

		applyAction(state, activeId, { type: 'call' }, deck);

		const player = state.players.find((p) => p.id === activeId)!;
		expect(player.bet).toBe(10); // called BB
		expect(player.chips).toBe(990);
	});

	it('should handle raise', () => {
		const { state, deck } = setupPreflop();
		const activeId = state.players[state.activePlayerIndex].id;

		applyAction(state, activeId, { type: 'raise', amount: 20 }, deck);

		const player = state.players.find((p) => p.id === activeId)!;
		// Called 10 + raised 20 = 30 total
		expect(player.bet).toBe(30);
		expect(player.chips).toBe(970);
		expect(state.currentBet).toBe(30);
	});

	it('should reject action from wrong player', () => {
		const { state, deck } = setupPreflop();
		const wrongId = state.players[(state.activePlayerIndex + 1) % 3].id;

		expect(() => applyAction(state, wrongId, { type: 'fold' }, deck)).toThrow(
			"Not this player's turn"
		);
	});

	it('should reject check when bet is required', () => {
		const { state, deck } = setupPreflop();
		const activeId = state.players[state.activePlayerIndex].id;

		expect(() => applyAction(state, activeId, { type: 'check' }, deck)).toThrow();
	});

	it('should advance to flop when all call preflop', () => {
		const players = makePlayers(3);
		const state = createGameState(players, 5, 10);
		const deck = new Deck();
		startHand(state, deck);

		// Preflop: UTG calls, SB calls, BB checks
		const utg = state.players[state.activePlayerIndex].id;
		applyAction(state, utg, { type: 'call' }, deck);

		const sb = state.players[state.activePlayerIndex].id;
		applyAction(state, sb, { type: 'call' }, deck);

		const bb = state.players[state.activePlayerIndex].id;
		applyAction(state, bb, { type: 'check' }, deck);

		expect(state.communityCards.length).toBeGreaterThanOrEqual(3);
		// Should be on flop or further
		expect(['flop', 'turn', 'river', 'complete']).toContain(state.phase);
	});

	it('should end hand when all but one fold', () => {
		const { state, deck } = setupPreflop();

		const p1 = state.players[state.activePlayerIndex].id;
		applyAction(state, p1, { type: 'fold' }, deck);

		const p2 = state.players[state.activePlayerIndex].id;
		applyAction(state, p2, { type: 'fold' }, deck);

		expect(state.phase).toBe('complete');
	});

	it('should handle all-in', () => {
		const { state, deck } = setupPreflop();
		const activeId = state.players[state.activePlayerIndex].id;

		applyAction(state, activeId, { type: 'all-in' }, deck);

		const player = state.players.find((p) => p.id === activeId)!;
		expect(player.chips).toBe(0);
		expect(player.allIn).toBe(true);
	});
});

describe('Hand Evaluation', () => {
	it('should determine winner at showdown', () => {
		const players = makePlayers(2, 100);
		const state = createGameState(players, 1, 2);

		// Manually set up a showdown scenario
		state.phase = 'complete';
		state.players[0].holeCards = [
			{ rank: 'A', suit: 'h' },
			{ rank: 'K', suit: 'h' }
		];
		state.players[1].holeCards = [
			{ rank: '2', suit: 'c' },
			{ rank: '7', suit: 'd' }
		];
		state.communityCards = [
			{ rank: 'A', suit: 'd' },
			{ rank: 'K', suit: 'd' },
			{ rank: 'Q', suit: 's' },
			{ rank: '3', suit: 'c' },
			{ rank: '9', suit: 'h' }
		];
		state.players[0].totalBet = 100;
		state.players[1].totalBet = 100;
		state.pots = [{ amount: 200, eligible: ['p1', 'p2'] }];

		const winners = evaluateHands(state);

		expect(winners).toHaveLength(1);
		expect(winners[0].winnerIds).toContain('p1');
		expect(winners[0].amount).toBe(200);
		expect(winners[0].handDescriptions['p1']).toBeTruthy();
		expect(winners[0].handDescriptions['p2']).toBeTruthy();
	});

	it('should handle split pot', () => {
		const players = makePlayers(2, 100);
		const state = createGameState(players, 1, 2);

		state.phase = 'complete';
		// Same hole cards = split
		state.players[0].holeCards = [
			{ rank: 'A', suit: 'h' },
			{ rank: 'K', suit: 'h' }
		];
		state.players[1].holeCards = [
			{ rank: 'A', suit: 'd' },
			{ rank: 'K', suit: 'd' }
		];
		state.communityCards = [
			{ rank: 'Q', suit: 's' },
			{ rank: 'J', suit: 's' },
			{ rank: 'T', suit: 'c' },
			{ rank: '3', suit: 'c' },
			{ rank: '9', suit: 'h' }
		];
		state.players[0].totalBet = 100;
		state.players[1].totalBet = 100;
		state.pots = [{ amount: 200, eligible: ['p1', 'p2'] }];

		const winners = evaluateHands(state);

		expect(winners[0].winnerIds).toHaveLength(2);
	});
});

describe('Winnings Distribution', () => {
	it('should distribute pot to winner', () => {
		const players = makePlayers(2, 0);
		const state = createGameState(players, 1, 2);
		state.pots = [{ amount: 200, eligible: ['p1', 'p2'] }];

		distributeWinnings(state, [{ potIndex: 0, winnerIds: ['p1'], amount: 200, handDescriptions: {} }]);

		expect(state.players[0].chips).toBe(200);
		expect(state.players[1].chips).toBe(0);
	});

	it('should split pot evenly', () => {
		const players = makePlayers(2, 0);
		const state = createGameState(players, 1, 2);
		state.pots = [{ amount: 200, eligible: ['p1', 'p2'] }];

		distributeWinnings(state, [{ potIndex: 0, winnerIds: ['p1', 'p2'], amount: 200, handDescriptions: {} }]);

		expect(state.players[0].chips).toBe(100);
		expect(state.players[1].chips).toBe(100);
	});

	it('should give remainder chip to first winner', () => {
		const players = makePlayers(3, 0);
		const state = createGameState(players, 1, 2);
		state.pots = [{ amount: 100, eligible: ['p1', 'p2', 'p3'] }];

		distributeWinnings(state, [{ potIndex: 0, winnerIds: ['p1', 'p2', 'p3'], amount: 100, handDescriptions: {} }]);

		expect(state.players[0].chips).toBe(34); // 33 + 1 remainder
		expect(state.players[1].chips).toBe(33);
		expect(state.players[2].chips).toBe(33);
	});
});

describe('Dealer Advancement', () => {
	it('should move dealer to next player', () => {
		const players = makePlayers(3);
		const state = createGameState(players, 5, 10);

		expect(state.dealerIndex).toBe(0);
		advanceDealer(state);
		expect(state.dealerIndex).toBe(1);
		advanceDealer(state);
		expect(state.dealerIndex).toBe(2);
		advanceDealer(state);
		expect(state.dealerIndex).toBe(0);
	});
});
