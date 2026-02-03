import type * as Party from 'partykit/server';
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
import type { ClientMessage, PublicPlayer, ServerMessage } from '../src/lib/protocol';
import { calculateSettlement } from '../src/lib/settlement';

interface PlayerMeta {
	name: string;
	connectionId: string;
	buyIn: number; // total chips bought
	buyInDollars: number; // total real money put in
}

function log(room: string, ...args: unknown[]) {
	console.log(`[room:${room}]`, ...args);
}

function logState(room: string, label: string, state: GameState) {
	const playerSummary = state.players.map((p) => ({
		id: p.id,
		name: p.name,
		chips: p.chips,
		bet: p.bet,
		totalBet: p.totalBet,
		folded: p.folded,
		allIn: p.allIn,
		sittingOut: p.sittingOut
	}));
	console.log(
		`[room:${room}] ${label}:`,
		JSON.stringify({
			phase: state.phase,
			activePlayerIndex: state.activePlayerIndex,
			activePlayer: state.players[state.activePlayerIndex]?.id,
			currentBet: state.currentBet,
			roundStartIndex: state.roundStartIndex,
			lastRaiserIndex: state.lastRaiserIndex,
			dealerIndex: state.dealerIndex,
			communityCards: state.communityCards.length,
			pots: state.pots.map((p) => ({ amount: p.amount, eligible: p.eligible })),
			players: playerSummary
		}, null, 2)
	);
}

export default class PokerRoom implements Party.Server {
	private gameState: GameState | null = null;
	private deck: Deck = new Deck();
	private playerMeta: Map<string, PlayerMeta> = new Map(); // playerId → meta
	private connectionToPlayer: Map<string, string> = new Map(); // connectionId → playerId
	private hostId: string | null = null;
	private playerCounter = 0;
	private gameStarted = false;
	private chipsPerDollar = 0; // chips / dollars rate for settlement

	constructor(readonly room: Party.Room) {}

	onConnect(connection: Party.Connection, ctx: Party.ConnectionContext) {
		log(this.room.id, `connection opened: ${connection.id}`);
	}

	onClose(connection: Party.Connection) {
		const playerId = this.connectionToPlayer.get(connection.id);
		log(this.room.id, `connection closed: ${connection.id}, playerId: ${playerId}`);
		if (!playerId) return;

		const meta = this.playerMeta.get(playerId);
		if (meta) {
			meta.connectionId = '';

			if (this.gameState) {
				const player = this.gameState.players.find((p) => p.id === playerId);
				if (player) {
					player.sittingOut = true;

					if (
						this.gameState.activePlayerIndex ===
						this.gameState.players.indexOf(player)
					) {
						if (!player.folded && !player.allIn) {
							log(this.room.id, `auto-folding disconnected player ${playerId}`);
							applyAction(
								this.gameState,
								playerId,
								{ type: 'fold' },
								this.deck
							);

							if (this.gameState.phase === 'complete') {
								this.resolveHand();
							}
						}
					}
				}
			}

			this.broadcast({ type: 'player-left', name: meta.name });
			this.broadcastState();
		}

		this.connectionToPlayer.delete(connection.id);
	}

	onMessage(message: string | ArrayBuffer, sender: Party.Connection) {
		if (typeof message !== 'string') return;

		let msg: ClientMessage;
		try {
			msg = JSON.parse(message);
		} catch {
			this.sendTo(sender, { type: 'error', message: 'Invalid message format' });
			return;
		}

		const senderId = this.connectionToPlayer.get(sender.id);
		log(this.room.id, `message from ${senderId ?? sender.id}: ${msg.type}`, JSON.stringify(msg));

		switch (msg.type) {
			case 'join':
				this.handleJoin(sender, msg.name);
				break;
			case 'start-game':
				this.handleStartGame(sender, msg.buyIn, msg.smallBlind, msg.bigBlind, msg.buyInDollars);
				break;
			case 'action':
				this.handleAction(sender, msg.action, msg.amount);
				break;
			case 'next-hand':
				this.handleNextHand(sender);
				break;
			case 'end-session':
				this.handleEndSession(sender);
				break;
			case 'rebuy':
				this.handleRebuy(sender, msg.amount);
				break;
			case 'kick':
				this.handleKick(sender, msg.targetId);
				break;
			case 'chat':
				this.handleChat(sender, msg.message);
				break;
		}
	}

	private handleJoin(connection: Party.Connection, name: string) {
		let playerId: string | null = null;

		for (const [pid, meta] of this.playerMeta.entries()) {
			if (meta.name === name && meta.connectionId === '') {
				playerId = pid;
				meta.connectionId = connection.id;
				this.connectionToPlayer.set(connection.id, pid);

				if (this.gameState) {
					const player = this.gameState.players.find((p) => p.id === pid);
					if (player) player.sittingOut = false;
				}
				log(this.room.id, `player reconnected: ${name} as ${pid}`);
				break;
			}
		}

		if (!playerId) {
			if (this.gameStarted && this.gameState?.phase !== 'waiting') {
				this.sendTo(connection, {
					type: 'error',
					message: 'Game already in progress. Wait for the session to end.'
				});
				return;
			}

			this.playerCounter++;
			playerId = `p${this.playerCounter}`;

			this.playerMeta.set(playerId, {
				name,
				connectionId: connection.id,
				buyIn: 0,
				buyInDollars: 0
			});
			this.connectionToPlayer.set(connection.id, playerId);

			if (!this.hostId) {
				this.hostId = playerId;
			}

			log(this.room.id, `new player joined: ${name} as ${playerId}, host: ${this.hostId}`);
			this.broadcast({ type: 'player-joined', name });
		}

		this.sendTo(connection, {
			type: 'joined',
			playerId,
			roomCode: this.room.id
		});

		this.broadcastState();

		if (this.gameState) {
			const player = this.gameState.players.find((p) => p.id === playerId);
			if (player && player.holeCards.length > 0) {
				this.sendTo(connection, { type: 'private', holeCards: player.holeCards });
			}
		}
	}

	private handleStartGame(
		connection: Party.Connection,
		buyIn: number,
		smallBlind: number,
		bigBlind: number,
		buyInDollars: number
	) {
		const playerId = this.connectionToPlayer.get(connection.id);
		if (playerId !== this.hostId) {
			this.sendTo(connection, { type: 'error', message: 'Only the host can start the game' });
			return;
		}

		if (this.playerMeta.size < 2) {
			this.sendTo(connection, {
				type: 'error',
				message: 'Need at least 2 players to start'
			});
			return;
		}

		// Store chips-per-dollar rate for settlement
		this.chipsPerDollar = buyInDollars > 0 ? buyIn / buyInDollars : 0;

		const players: Player[] = [];
		for (const [pid, meta] of this.playerMeta.entries()) {
			if (meta.connectionId !== '') {
				players.push(createPlayer(pid, meta.name, buyIn));
				meta.buyIn = buyIn;
				meta.buyInDollars = buyInDollars;
			}
		}

		log(this.room.id, `starting game: buyIn=${buyIn} chips ($${buyInDollars}), sb=${smallBlind}, bb=${bigBlind}, players=${players.map((p) => p.id).join(',')}`);

		this.gameState = createGameState(players, smallBlind, bigBlind);
		this.gameStarted = true;

		startHand(this.gameState, this.deck);

		logState(this.room.id, 'hand started', this.gameState);

		this.broadcastState();
		this.sendPrivateCards();
	}

	private handleAction(
		connection: Party.Connection,
		actionType: string,
		amount?: number
	) {
		if (!this.gameState) {
			this.sendTo(connection, { type: 'error', message: 'No game in progress' });
			return;
		}

		const playerId = this.connectionToPlayer.get(connection.id);
		if (!playerId) return;

		const activePlayer = this.gameState.players[this.gameState.activePlayerIndex];
		log(this.room.id, `action: ${playerId} wants to ${actionType}${amount !== undefined ? ` ${amount}` : ''}, active=${activePlayer?.id}[${this.gameState.activePlayerIndex}], phase=${this.gameState.phase}, currentBet=${this.gameState.currentBet}`);

		try {
			applyAction(
				this.gameState,
				playerId,
				{ type: actionType as any, amount },
				this.deck
			);
		} catch (err: any) {
			log(this.room.id, `action error: ${err.message}`);
			this.sendTo(connection, { type: 'error', message: err.message });
			return;
		}

		logState(this.room.id, `after ${actionType}`, this.gameState);

		if (this.gameState.phase === 'complete') {
			this.resolveHand();
		}

		this.broadcastState();
	}

	private handleNextHand(connection: Party.Connection) {
		const playerId = this.connectionToPlayer.get(connection.id);
		if (playerId !== this.hostId) {
			this.sendTo(connection, {
				type: 'error',
				message: 'Only the host can start the next hand'
			});
			return;
		}

		if (!this.gameState || this.gameState.phase !== 'complete') {
			this.sendTo(connection, { type: 'error', message: 'Current hand is not finished' });
			return;
		}

		advanceDealer(this.gameState);

		const playersWithChips = this.gameState.players.filter((p) => p.chips > 0 && !p.sittingOut);
		if (playersWithChips.length < 2) {
			this.sendTo(connection, {
				type: 'error',
				message: 'Need at least 2 players with chips'
			});
			return;
		}

		for (const p of this.gameState.players) {
			if (p.chips === 0) p.sittingOut = true;
		}

		startHand(this.gameState, this.deck);

		log(this.room.id, `next hand started, dealer=${this.gameState.dealerIndex}`);
		logState(this.room.id, 'new hand', this.gameState);

		this.broadcastState();
		this.sendPrivateCards();
	}

	private handleRebuy(connection: Party.Connection, amount: number) {
		const playerId = this.connectionToPlayer.get(connection.id);
		if (!playerId || !this.gameState) return;

		const player = this.gameState.players.find((p) => p.id === playerId);
		if (!player) return;

		if (this.gameState.phase !== 'complete' && this.gameState.phase !== 'waiting') {
			this.sendTo(connection, { type: 'error', message: 'Can only rebuy between hands' });
			return;
		}

		player.chips += amount;
		player.sittingOut = false;

		const meta = this.playerMeta.get(playerId);
		if (meta) {
			meta.buyIn += amount;
			// Convert chips to dollars for rebuy tracking
			if (this.chipsPerDollar > 0) {
				meta.buyInDollars += amount / this.chipsPerDollar;
			}
		}

		log(this.room.id, `rebuy: ${playerId} +${amount} chips, total buyIn=${meta?.buyIn} chips ($${meta?.buyInDollars})`);
		this.broadcastState();
	}

	private handleKick(connection: Party.Connection, targetId: string) {
		const playerId = this.connectionToPlayer.get(connection.id);
		if (playerId !== this.hostId) {
			this.sendTo(connection, { type: 'error', message: 'Only the host can kick players' });
			return;
		}

		if (targetId === this.hostId) {
			this.sendTo(connection, { type: 'error', message: 'Cannot kick yourself' });
			return;
		}

		// Only allow kicking in lobby
		if (this.gameStarted && this.gameState?.phase !== 'waiting') {
			this.sendTo(connection, { type: 'error', message: 'Can only kick players in the lobby' });
			return;
		}

		const meta = this.playerMeta.get(targetId);
		if (!meta) return;

		log(this.room.id, `kicking player: ${targetId} (${meta.name})`);

		// Close their connection
		if (meta.connectionId) {
			const conn = this.room.getConnection(meta.connectionId);
			if (conn) {
				this.sendTo(conn, { type: 'error', message: 'You have been removed from the room' });
				conn.close();
			}
			this.connectionToPlayer.delete(meta.connectionId);
		}

		this.playerMeta.delete(targetId);

		this.broadcast({ type: 'player-left', name: meta.name });
		this.broadcastState();
	}

	private handleEndSession(connection: Party.Connection) {
		const playerId = this.connectionToPlayer.get(connection.id);
		if (playerId !== this.hostId) {
			this.sendTo(connection, {
				type: 'error',
				message: 'Only the host can end the session'
			});
			return;
		}

		if (!this.gameState) return;

		// Calculate in dollars if we have a rate, otherwise use chips
		const useDollars = this.chipsPerDollar > 0;

		const balances = this.gameState.players.map((p) => {
			const meta = this.playerMeta.get(p.id)!;
			return {
				id: p.id,
				name: meta.name,
				buyIn: useDollars ? meta.buyInDollars : meta.buyIn,
				cashOut: useDollars ? p.chips / this.chipsPerDollar : p.chips
			};
		});

		const payments = calculateSettlement(balances);

		log(this.room.id, `session ended, settlement (${useDollars ? 'dollars' : 'chips'}):`, JSON.stringify(payments));

		this.broadcast({
			type: 'settlement',
			payments: payments.map((p) => ({
				from: p.from,
				fromId: p.fromId,
				to: p.to,
				toId: p.toId,
				amount: Math.round(p.amount * 100) / 100 // Round to cents
			}))
		});

		this.gameState.phase = 'waiting';
		this.gameStarted = false;
		this.broadcastState();
	}

	private resolveHand() {
		if (!this.gameState) return;

		const active = this.gameState.players.filter((p) => !p.folded && !p.sittingOut);

		if (active.length === 1) {
			const winner = active[0];
			const totalPot = this.gameState.pots.reduce((sum, p) => sum + p.amount, 0);
			winner.chips += totalPot;

			log(this.room.id, `hand resolved: ${winner.id} wins ${totalPot} (last standing)`);

			this.broadcast({
				type: 'hand-result',
				winners: [{ playerId: winner.id, hand: 'Last player standing', amount: totalPot }]
			});
		} else {
			const potWinners = evaluateHands(this.gameState);
			distributeWinnings(this.gameState, potWinners);

			const results = potWinners.flatMap((pw) =>
				pw.winnerIds.map((id) => ({
					playerId: id,
					hand: pw.handDescriptions[id] ?? '',
					amount: Math.floor(pw.amount / pw.winnerIds.length)
				}))
			);

			// Build showdown cards map for all active players
			const showdownCards: Record<string, typeof active[0]['holeCards']> = {};
			for (const player of active) {
				showdownCards[player.id] = player.holeCards;
			}

			log(this.room.id, `hand resolved (showdown):`, JSON.stringify(results));

			this.broadcast({ type: 'hand-result', winners: results, showdownCards });
		}

		// Auto-advance to next hand after delay
		this.scheduleNextHand();
	}

	private nextHandTimeout: ReturnType<typeof setTimeout> | null = null;

	private scheduleNextHand() {
		if (this.nextHandTimeout) {
			clearTimeout(this.nextHandTimeout);
		}

		const COUNTDOWN_SECONDS = 4;

		// Send countdown
		for (let i = COUNTDOWN_SECONDS; i > 0; i--) {
			setTimeout(() => {
				this.broadcast({ type: 'next-hand-countdown', seconds: i });
			}, (COUNTDOWN_SECONDS - i) * 1000);
		}

		this.nextHandTimeout = setTimeout(() => {
			this.autoAdvanceHand();
		}, COUNTDOWN_SECONDS * 1000);
	}

	private autoAdvanceHand() {
		if (!this.gameState || this.gameState.phase !== 'complete') return;

		advanceDealer(this.gameState);

		const playersWithChips = this.gameState.players.filter((p) => p.chips > 0 && !p.sittingOut);
		if (playersWithChips.length < 2) {
			log(this.room.id, 'not enough players with chips for next hand');
			return;
		}

		for (const p of this.gameState.players) {
			if (p.chips === 0) p.sittingOut = true;
		}

		startHand(this.gameState, this.deck);

		log(this.room.id, `auto-advanced to next hand, dealer=${this.gameState.dealerIndex}`);

		this.broadcastState();
		this.sendPrivateCards();
	}

	private handleChat(connection: Party.Connection, message: string) {
		const playerId = this.connectionToPlayer.get(connection.id);
		if (!playerId) return;

		const meta = this.playerMeta.get(playerId);
		if (!meta) return;

		// Sanitize and limit message length
		const cleanMessage = message.trim().slice(0, 200);
		if (!cleanMessage) return;

		log(this.room.id, `chat from ${meta.name}: ${cleanMessage}`);

		this.broadcast({
			type: 'chat',
			senderId: playerId,
			name: meta.name,
			message: cleanMessage
		});
	}

	private sendPrivateCards() {
		if (!this.gameState) return;

		for (const player of this.gameState.players) {
			if (player.holeCards.length === 0) continue;

			const meta = this.playerMeta.get(player.id);
			if (!meta || meta.connectionId === '') continue;

			const conn = this.room.getConnection(meta.connectionId);
			if (conn) {
				this.sendTo(conn, { type: 'private', holeCards: player.holeCards });
			}
		}
	}

	private buildPublicPlayers(): PublicPlayer[] {
		if (!this.gameState) {
			return [...this.playerMeta.entries()].map(([id, meta]) => ({
				id,
				name: meta.name,
				chips: 0,
				bet: 0,
				folded: false,
				allIn: false,
				sittingOut: false,
				connected: meta.connectionId !== '',
				cardCount: 0
			}));
		}

		return this.gameState.players.map((p) => {
			const meta = this.playerMeta.get(p.id);
			return {
				id: p.id,
				name: p.name,
				chips: p.chips,
				bet: p.bet,
				folded: p.folded,
				allIn: p.allIn,
				sittingOut: p.sittingOut,
				connected: meta ? meta.connectionId !== '' : false,
				cardCount: p.holeCards.length
			};
		});
	}

	private broadcastState() {
		const stateMsg: ServerMessage = {
			type: 'state',
			phase: this.gameState?.phase ?? 'waiting',
			players: this.buildPublicPlayers(),
			communityCards: this.gameState?.communityCards ?? [],
			pots: this.gameState?.pots ?? [],
			currentBet: this.gameState?.currentBet ?? 0,
			dealerIndex: this.gameState?.dealerIndex ?? 0,
			activePlayerIndex: this.gameState?.activePlayerIndex ?? 0,
			smallBlind: this.gameState?.smallBlind ?? 0,
			bigBlind: this.gameState?.bigBlind ?? 0,
			hostId: this.hostId ?? ''
		};

		this.broadcast(stateMsg);
	}

	private broadcast(msg: ServerMessage) {
		this.room.broadcast(JSON.stringify(msg));
	}

	private sendTo(connection: Party.Connection, msg: ServerMessage) {
		connection.send(JSON.stringify(msg));
	}
}
