/**
 * WebSocket message protocol between client and PartyKit server.
 * All messages are JSON-serialized.
 */

import type { ActionType, Card, Phase, Pot } from './engine/types';

// ─── Client → Server Messages ───────────────────────────────────

export type ClientMessage =
	| { type: 'join'; name: string }
	| { type: 'start-game'; buyIn: number; smallBlind: number; bigBlind: number; buyInDollars: number }
	| { type: 'action'; action: ActionType; amount?: number }
	| { type: 'next-hand' }
	| { type: 'end-session' }
	| { type: 'rebuy'; amount: number }
	| { type: 'kick'; targetId: string }
	| { type: 'chat'; message: string };

// ─── Server → Client Messages ───────────────────────────────────

/** Public player info (sent to all clients) */
export interface PublicPlayer {
	id: string;
	name: string;
	chips: number;
	bet: number;
	folded: boolean;
	allIn: boolean;
	sittingOut: boolean;
	connected: boolean;
	cardCount: number; // number of hole cards (hidden from other players)
}

/** Private player info (sent only to the player themselves) */
export interface PrivatePlayerInfo {
	holeCards: Card[];
}

export interface SettlementPayment {
	from: string;
	fromId: string;
	to: string;
	toId: string;
	amount: number;
}

export type ServerMessage =
	| {
			type: 'state';
			phase: Phase;
			players: PublicPlayer[];
			communityCards: Card[];
			pots: Pot[];
			currentBet: number;
			dealerIndex: number;
			activePlayerIndex: number;
			smallBlind: number;
			bigBlind: number;
			hostId: string;
	  }
	| { type: 'private'; holeCards: Card[] }
	| { type: 'joined'; playerId: string; roomCode: string }
	| { type: 'error'; message: string }
	| { type: 'hand-result'; winners: { playerId: string; hand: string; amount: number }[] }
	| { type: 'settlement'; payments: SettlementPayment[] }
	| { type: 'player-joined'; name: string }
	| { type: 'player-left'; name: string }
	| { type: 'chat'; senderId: string; name: string; message: string }
	| { type: 'next-hand-countdown'; seconds: number };
