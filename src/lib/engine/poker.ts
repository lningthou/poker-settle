import { Hand } from 'pokersolver';
import { Deck, cardToPokersolverString } from './deck';
import type { Action, Card, GameState, Phase, Player, Pot, PotWinner } from './types';

export function createPlayer(id: string, name: string, chips: number): Player {
	return {
		id,
		name,
		chips,
		holeCards: [],
		bet: 0,
		totalBet: 0,
		folded: false,
		allIn: false,
		sittingOut: false
	};
}

export function createGameState(
	players: Player[],
	smallBlind: number,
	bigBlind: number
): GameState {
	return {
		phase: 'waiting',
		players,
		communityCards: [],
		pots: [{ amount: 0, eligible: players.map((p) => p.id) }],
		currentBet: 0,
		minRaise: bigBlind,
		dealerIndex: 0,
		activePlayerIndex: 0,
		smallBlind,
		bigBlind,
		lastRaiserIndex: null,
		roundStartIndex: 0
	};
}

function activePlayers(state: GameState): Player[] {
	return state.players.filter((p) => !p.folded && !p.sittingOut);
}

function playersInHand(state: GameState): Player[] {
	return state.players.filter((p) => !p.folded && !p.sittingOut && !p.allIn);
}

function nextActiveIndex(state: GameState, fromIndex: number): number {
	const n = state.players.length;
	let idx = (fromIndex + 1) % n;
	while (idx !== fromIndex) {
		const p = state.players[idx];
		if (!p.folded && !p.sittingOut && !p.allIn) {
			return idx;
		}
		idx = (idx + 1) % n;
	}
	return fromIndex;
}

function smallBlindIndex(state: GameState): number {
	if (state.players.length === 2) return state.dealerIndex;
	return nextActiveIndex(state, state.dealerIndex);
}

function bigBlindIndex(state: GameState): number {
	return nextActiveIndex(state, smallBlindIndex(state));
}

function postBlinds(state: GameState, deck: Deck): void {
	const sbIdx = smallBlindIndex(state);
	const bbIdx = bigBlindIndex(state);
	const sbPlayer = state.players[sbIdx];
	const bbPlayer = state.players[bbIdx];

	const sbAmount = Math.min(state.smallBlind, sbPlayer.chips);
	sbPlayer.chips -= sbAmount;
	sbPlayer.bet = sbAmount;
	sbPlayer.totalBet = sbAmount;
	if (sbPlayer.chips === 0) sbPlayer.allIn = true;

	const bbAmount = Math.min(state.bigBlind, bbPlayer.chips);
	bbPlayer.chips -= bbAmount;
	bbPlayer.bet = bbAmount;
	bbPlayer.totalBet = bbAmount;
	if (bbPlayer.chips === 0) bbPlayer.allIn = true;

	state.currentBet = bbAmount;
	state.minRaise = state.bigBlind;
	state.pots[0].amount = sbAmount + bbAmount;
}

function dealHoleCards(state: GameState, deck: Deck): void {
	for (const player of state.players) {
		if (!player.sittingOut) {
			player.holeCards = deck.deal(2);
		}
	}
}

export function startHand(state: GameState, deck: Deck): GameState {
	// Reset player hand state
	for (const player of state.players) {
		player.holeCards = [];
		player.bet = 0;
		player.totalBet = 0;
		player.folded = false;
		player.allIn = false;
	}

	state.communityCards = [];
	state.pots = [{ amount: 0, eligible: activePlayers(state).map((p) => p.id) }];
	state.currentBet = 0;
	state.lastRaiserIndex = null;

	deck.reset();

	// Post blinds
	postBlinds(state, deck);

	// Deal hole cards
	dealHoleCards(state, deck);

	state.phase = 'preflop';

	// First to act preflop is after big blind
	state.activePlayerIndex = nextActiveIndex(state, bigBlindIndex(state));
	// Round starts at the first actor — round ends when action returns here
	state.roundStartIndex = state.activePlayerIndex;
	state.lastRaiserIndex = null;

	return state;
}

function resetBetsForNewRound(state: GameState): void {
	for (const player of state.players) {
		player.bet = 0;
	}
	state.currentBet = 0;
	state.minRaise = state.bigBlind;
	state.lastRaiserIndex = null;
}

function calculateSidePots(state: GameState): Pot[] {
	// Gather all player contributions
	const contributions = state.players
		.filter((p) => p.totalBet > 0)
		.map((p) => ({ id: p.id, amount: p.totalBet, folded: p.folded }))
		.sort((a, b) => a.amount - b.amount);

	const pots: Pot[] = [];
	let processed = 0;

	const uniqueAmounts = [...new Set(contributions.map((c) => c.amount))];

	for (const level of uniqueAmounts) {
		const levelContribution = level - processed;
		if (levelContribution <= 0) continue;

		const eligible = contributions
			.filter((c) => c.amount >= level && !c.folded)
			.map((c) => c.id);

		const contributors = contributions.filter((c) => c.amount >= level);
		const potAmount = levelContribution * contributors.length;

		if (potAmount > 0) {
			pots.push({ amount: potAmount, eligible });
		}

		processed = level;
	}

	return pots;
}

function advancePhase(state: GameState, deck: Deck): void {
	// Recalculate pots with side pots
	state.pots = calculateSidePots(state);

	resetBetsForNewRound(state);

	const active = activePlayers(state);

	// If only one non-folded player, they win
	if (active.length === 1) {
		state.phase = 'complete';
		return;
	}

	const nextPhaseMap: Record<string, Phase> = {
		preflop: 'flop',
		flop: 'turn',
		turn: 'river',
		river: 'showdown'
	};

	state.phase = nextPhaseMap[state.phase] || 'complete';

	// Deal community cards
	if (state.phase === 'flop') {
		state.communityCards.push(...deck.deal(3));
	} else if (state.phase === 'turn' || state.phase === 'river') {
		state.communityCards.push(...deck.deal(1));
	}

	if (state.phase === 'showdown') {
		state.phase = 'complete';
		return;
	}

	// First to act post-flop is first active player after dealer
	state.activePlayerIndex = nextActiveIndex(state, state.dealerIndex);
	state.roundStartIndex = state.activePlayerIndex;

	// If all remaining players are all-in, skip to showdown
	if (playersInHand(state).length <= 1) {
		advancePhase(state, deck);
	}
}

function isBettingRoundOver(state: GameState): boolean {
	const inHand = playersInHand(state);
	if (inHand.length === 0) return true;

	// Everyone has matched the bet or gone all-in
	const allMatched = inHand.every((p) => p.bet === state.currentBet);
	if (!allMatched) return false;

	// The round ends when action returns to the "closer":
	// - If someone raised, the closer is the raiser
	// - If no one raised, the closer is the round starter (first to act)
	const closer = state.lastRaiserIndex ?? state.roundStartIndex;
	return state.activePlayerIndex === closer;
}

export function applyAction(state: GameState, playerId: string, action: Action, deck: Deck): GameState {
	const playerIndex = state.players.findIndex((p) => p.id === playerId);
	if (playerIndex === -1) throw new Error(`Player ${playerId} not found`);
	if (playerIndex !== state.activePlayerIndex) throw new Error('Not this player\'s turn');

	const player = state.players[playerIndex];

	if (player.folded || player.allIn || player.sittingOut) {
		throw new Error('Player cannot act');
	}

	switch (action.type) {
		case 'fold': {
			player.folded = true;
			// Remove from pot eligibility
			for (const pot of state.pots) {
				pot.eligible = pot.eligible.filter((id) => id !== playerId);
			}
			break;
		}
		case 'check': {
			if (player.bet < state.currentBet) {
				throw new Error('Cannot check — must call or raise');
			}
			break;
		}
		case 'call': {
			const callAmount = Math.min(state.currentBet - player.bet, player.chips);
			player.chips -= callAmount;
			player.bet += callAmount;
			player.totalBet += callAmount;
			state.pots[state.pots.length - 1].amount += callAmount;
			if (player.chips === 0) player.allIn = true;
			break;
		}
		case 'raise': {
			const raiseAmount = action.amount;
			if (raiseAmount === undefined) throw new Error('Raise amount required');

			const prevCurrentBet = state.currentBet;
			const totalToCall = prevCurrentBet - player.bet;
			const totalCost = totalToCall + raiseAmount;

			if (raiseAmount < state.minRaise && totalCost < player.chips) {
				throw new Error(`Raise must be at least ${state.minRaise}`);
			}

			const actualCost = Math.min(totalCost, player.chips);
			player.chips -= actualCost;
			player.bet += actualCost;
			player.totalBet += actualCost;
			state.pots[state.pots.length - 1].amount += actualCost;

			// Only treat as a full raise if the raise amount meets minRaise.
			if (raiseAmount >= state.minRaise && player.bet > prevCurrentBet) {
				state.minRaise = Math.max(state.minRaise, raiseAmount);
				state.lastRaiserIndex = playerIndex;
			}

			// Never lower the current bet.
			state.currentBet = Math.max(prevCurrentBet, player.bet);

			if (player.chips === 0) player.allIn = true;
			break;
		}
		case 'all-in': {
			const amount = player.chips;
			player.chips = 0;
			player.bet += amount;
			player.totalBet += amount;
			player.allIn = true;
			state.pots[state.pots.length - 1].amount += amount;

			if (player.bet > state.currentBet) {
				state.minRaise = Math.max(state.minRaise, player.bet - state.currentBet);
				state.currentBet = player.bet;
				state.lastRaiserIndex = playerIndex;
			}
			break;
		}
	}

	// Check if only one player remains (all others folded)
	const remaining = activePlayers(state);
	if (remaining.length === 1) {
		state.pots = calculateSidePots(state);
		state.phase = 'complete';
		return state;
	}

	// Move to next active player
	state.activePlayerIndex = nextActiveIndex(state, playerIndex);

	// Check if betting round is over
	if (isBettingRoundOver(state)) {
		advancePhase(state, deck);
	}

	return state;
}

export function evaluateHands(state: GameState): PotWinner[] {
	const potWinners: PotWinner[] = [];

	const pots = state.pots.length > 0 ? state.pots : calculateSidePots(state);

	for (let i = 0; i < pots.length; i++) {
		const pot = pots[i];
		const eligible = pot.eligible.filter((id) => {
			const p = state.players.find((pl) => pl.id === id);
			return p && !p.folded;
		});

		// If only one eligible player, they win by default
		if (eligible.length === 1) {
			potWinners.push({
				potIndex: i,
				winnerIds: eligible,
				amount: pot.amount,
				handDescriptions: {}
			});
			continue;
		}

		// Evaluate hands with pokersolver
		const hands = eligible.map((id) => {
			const player = state.players.find((p) => p.id === id)!;
			const allCards = [...player.holeCards, ...state.communityCards];
			const cardStrings = allCards.map(cardToPokersolverString);
			const hand = Hand.solve(cardStrings);
			return { id, hand };
		});

		const solvedHands = hands.map((h) => h.hand);
		const winners = Hand.winners(solvedHands);

		const winnerIds = hands.filter((h) => winners.includes(h.hand)).map((h) => h.id);

		const handDescriptions: Record<string, string> = {};
		for (const h of hands) {
			handDescriptions[h.id] = h.hand.descr;
		}

		potWinners.push({
			potIndex: i,
			winnerIds,
			amount: pot.amount,
			handDescriptions
		});
	}

	return potWinners;
}

export function distributeWinnings(state: GameState, potWinners: PotWinner[]): void {
	for (const pw of potWinners) {
		const share = Math.floor(pw.amount / pw.winnerIds.length);
		const remainder = pw.amount - share * pw.winnerIds.length;

		pw.winnerIds.forEach((id, idx) => {
			const player = state.players.find((p) => p.id === id)!;
			player.chips += share + (idx === 0 ? remainder : 0);
		});
	}
}

export function advanceDealer(state: GameState): void {
	state.dealerIndex = nextActiveIndex(state, state.dealerIndex);
}
