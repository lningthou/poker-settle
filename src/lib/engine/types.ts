export type Suit = 'h' | 'd' | 'c' | 's';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'T' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
	rank: Rank;
	suit: Suit;
}

export type Phase = 'waiting' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown' | 'complete';

export type ActionType = 'fold' | 'check' | 'call' | 'raise' | 'all-in';

export interface Action {
	type: ActionType;
	amount?: number; // only for raise/all-in
}

export interface Player {
	id: string;
	name: string;
	chips: number;
	holeCards: Card[];
	bet: number; // current bet in this round
	totalBet: number; // total bet across all rounds this hand
	folded: boolean;
	allIn: boolean;
	sittingOut: boolean;
}

export interface Pot {
	amount: number;
	eligible: string[]; // player IDs eligible for this pot
}

export interface GameState {
	phase: Phase;
	players: Player[];
	communityCards: Card[];
	pots: Pot[];
	currentBet: number; // highest bet in the current round
	minRaise: number; // minimum raise amount
	dealerIndex: number;
	activePlayerIndex: number;
	smallBlind: number;
	bigBlind: number;
	lastRaiserIndex: number | null; // tracks who last raised to know when round ends
}

export interface HandResult {
	playerId: string;
	hand: string; // description like "Pair of Aces"
	cards: Card[];
}

export interface PotWinner {
	potIndex: number;
	winnerIds: string[];
	amount: number;
}
