import { writable, derived, get } from 'svelte/store';
import PartySocket from 'partysocket';
import type { ClientMessage, PublicPlayer, ServerMessage, SettlementPayment } from '../protocol';
import type { Card, Phase, Pot } from '../engine/types';

// ─── State Stores ────────────────────────────────────────────────

export const connected = writable(false);
export const playerId = writable<string | null>(null);
export const roomCode = writable<string | null>(null);
export const phase = writable<Phase>('waiting');
export const players = writable<PublicPlayer[]>([]);
export const communityCards = writable<Card[]>([]);
export const pots = writable<Pot[]>([]);
export const currentBet = writable(0);
export const dealerIndex = writable(0);
export const activePlayerIndex = writable(0);
export const smallBlind = writable(0);
export const bigBlind = writable(0);
export const hostId = writable('');
export const holeCards = writable<Card[]>([]);
export const errorMessage = writable<string | null>(null);
export const handResult = writable<{ playerId: string; hand: string; amount: number }[] | null>(
	null
);
export const settlement = writable<SettlementPayment[] | null>(null);
export const nextHandCountdown = writable<number | null>(null);

export interface ChatMessage {
	senderId: string;
	name: string;
	message: string;
	timestamp: number;
}
export const chatMessages = writable<ChatMessage[]>([]);

// Derived stores
export const isHost = derived([playerId, hostId], ([$pid, $hid]) => $pid === $hid);
export const isMyTurn = derived([playerId, players, activePlayerIndex], ([$pid, $players, $idx]) => {
	if (!$pid || $players.length === 0) return false;
	return $players[$idx]?.id === $pid;
});
export const myPlayer = derived([playerId, players], ([$pid, $players]) => {
	return $players.find((p) => p.id === $pid) ?? null;
});
export const totalPot = derived(pots, ($pots) => $pots.reduce((sum, p) => sum + p.amount, 0));

// ─── Socket Connection ──────────────────────────────────────────

let socket: PartySocket | null = null;

export function connect(host: string, room: string, playerName: string) {
	if (socket) {
		socket.close();
	}

	socket = new PartySocket({
		host,
		room
	});

	socket.addEventListener('open', () => {
		connected.set(true);
		// Send join message
		send({ type: 'join', name: playerName });
	});

	socket.addEventListener('message', (event) => {
		const msg: ServerMessage = JSON.parse(event.data);
		handleMessage(msg);
	});

	socket.addEventListener('close', () => {
		connected.set(false);
	});

	socket.addEventListener('error', () => {
		errorMessage.set('Connection error. Attempting to reconnect...');
	});
}

export function disconnect() {
	if (socket) {
		socket.close();
		socket = null;
	}
	resetStores();
}

function resetStores() {
	connected.set(false);
	playerId.set(null);
	roomCode.set(null);
	phase.set('waiting');
	players.set([]);
	communityCards.set([]);
	pots.set([]);
	currentBet.set(0);
	holeCards.set([]);
	errorMessage.set(null);
	handResult.set(null);
	settlement.set(null);
	nextHandCountdown.set(null);
	chatMessages.set([]);
}

function send(msg: ClientMessage) {
	if (socket && socket.readyState === WebSocket.OPEN) {
		socket.send(JSON.stringify(msg));
	}
}

function handleMessage(msg: ServerMessage) {
	switch (msg.type) {
		case 'joined':
			playerId.set(msg.playerId);
			roomCode.set(msg.roomCode);
			break;

		case 'state':
			phase.set(msg.phase);
			players.set(msg.players);
			communityCards.set(msg.communityCards);
			pots.set(msg.pots);
			currentBet.set(msg.currentBet);
			dealerIndex.set(msg.dealerIndex);
			activePlayerIndex.set(msg.activePlayerIndex);
			smallBlind.set(msg.smallBlind);
			bigBlind.set(msg.bigBlind);
			hostId.set(msg.hostId);
			// Clear state when phase changes from complete
			if (msg.phase === 'waiting') {
				holeCards.set([]);
				handResult.set(null);
			}
			if (msg.phase !== 'complete') {
				nextHandCountdown.set(null);
				handResult.set(null);
			}
			break;

		case 'private':
			holeCards.set(msg.holeCards);
			break;

		case 'error':
			errorMessage.set(msg.message);
			setTimeout(() => errorMessage.set(null), 5000);
			break;

		case 'hand-result':
			handResult.set(msg.winners);
			break;

		case 'settlement':
			settlement.set(msg.payments);
			break;

		case 'next-hand-countdown':
			nextHandCountdown.set(msg.seconds);
			break;

		case 'chat':
			chatMessages.update((msgs) => [
				...msgs.slice(-99), // keep last 100 messages
				{ senderId: msg.senderId, name: msg.name, message: msg.message, timestamp: Date.now() }
			]);
			break;

		case 'player-joined':
		case 'player-left':
			// These are handled by the state update that follows
			break;
	}
}

// ─── Game Actions ───────────────────────────────────────────────

export function startGame(buyIn: number, smallBlindAmount: number, bigBlindAmount: number, buyInDollars: number) {
	send({ type: 'start-game', buyIn, smallBlind: smallBlindAmount, bigBlind: bigBlindAmount, buyInDollars });
}

export function fold() {
	send({ type: 'action', action: 'fold' });
}

export function check() {
	send({ type: 'action', action: 'check' });
}

export function call() {
	send({ type: 'action', action: 'call' });
}

export function raise(amount: number) {
	send({ type: 'action', action: 'raise', amount });
}

export function allIn() {
	send({ type: 'action', action: 'all-in' });
}

export function nextHand() {
	send({ type: 'next-hand' });
	handResult.set(null);
}

export function rebuy(amount: number) {
	send({ type: 'rebuy', amount });
}

export function endSession() {
	send({ type: 'end-session' });
}

export function kickPlayer(targetId: string) {
	send({ type: 'kick', targetId });
}

export function sendChat(message: string) {
	send({ type: 'chat', message });
}
