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
	buyIn: number; // total money put in
}

export default class PokerRoom implements Party.Server {
	private gameState: GameState | null = null;
	private deck: Deck = new Deck();
	private playerMeta: Map<string, PlayerMeta> = new Map(); // playerId → meta
	private connectionToPlayer: Map<string, string> = new Map(); // connectionId → playerId
	private hostId: string | null = null;
	private playerCounter = 0;
	private gameStarted = false;

	constructor(readonly room: Party.Room) {}

	onConnect(connection: Party.Connection, ctx: Party.ConnectionContext) {
		// Don't do anything until they send a "join" message
	}

	onClose(connection: Party.Connection) {
		const playerId = this.connectionToPlayer.get(connection.id);
		if (!playerId) return;

		const meta = this.playerMeta.get(playerId);
		if (meta) {
			// Mark as disconnected but don't remove (they can reconnect)
			meta.connectionId = '';

			if (this.gameState) {
				const player = this.gameState.players.find((p) => p.id === playerId);
				if (player) {
					player.sittingOut = true;

					// If it was their turn, auto-fold
					if (
						this.gameState.activePlayerIndex ===
						this.gameState.players.indexOf(player)
					) {
						if (!player.folded && !player.allIn) {
							applyAction(
								this.gameState,
								playerId,
								{ type: 'fold' },
								this.deck
							);
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

		switch (msg.type) {
			case 'join':
				this.handleJoin(sender, msg.name);
				break;
			case 'start-game':
				this.handleStartGame(sender, msg.buyIn, msg.smallBlind, msg.bigBlind);
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
		}
	}

	private handleJoin(connection: Party.Connection, name: string) {
		// Check if this is a reconnection (same name)
		let playerId: string | null = null;

		for (const [pid, meta] of this.playerMeta.entries()) {
			if (meta.name === name && meta.connectionId === '') {
				// Reconnecting player
				playerId = pid;
				meta.connectionId = connection.id;
				this.connectionToPlayer.set(connection.id, pid);

				if (this.gameState) {
					const player = this.gameState.players.find((p) => p.id === pid);
					if (player) player.sittingOut = false;
				}
				break;
			}
		}

		if (!playerId) {
			// New player
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
				buyIn: 0
			});
			this.connectionToPlayer.set(connection.id, playerId);

			// First player is the host
			if (!this.hostId) {
				this.hostId = playerId;
			}

			this.broadcast({ type: 'player-joined', name });
		}

		this.sendTo(connection, {
			type: 'joined',
			playerId,
			roomCode: this.room.id
		});

		this.broadcastState();

		// Send private hole cards if game is in progress
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
		bigBlind: number
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

		// Create players with buy-in chips
		const players: Player[] = [];
		for (const [pid, meta] of this.playerMeta.entries()) {
			if (meta.connectionId !== '') {
				// only connected players
				players.push(createPlayer(pid, meta.name, buyIn));
				meta.buyIn = buyIn;
			}
		}

		this.gameState = createGameState(players, smallBlind, bigBlind);
		this.gameStarted = true;

		// Start the first hand
		startHand(this.gameState, this.deck);

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

		try {
			applyAction(
				this.gameState,
				playerId,
				{ type: actionType as any, amount },
				this.deck
			);
		} catch (err: any) {
			this.sendTo(connection, { type: 'error', message: err.message });
			return;
		}

		// Check if hand is complete
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

		// Remove players with 0 chips (they need to rebuy)
		// Advance dealer
		advanceDealer(this.gameState);

		// Check enough players have chips
		const playersWithChips = this.gameState.players.filter((p) => p.chips > 0 && !p.sittingOut);
		if (playersWithChips.length < 2) {
			this.sendTo(connection, {
				type: 'error',
				message: 'Need at least 2 players with chips'
			});
			return;
		}

		// Mark players with 0 chips as sitting out
		for (const p of this.gameState.players) {
			if (p.chips === 0) p.sittingOut = true;
		}

		startHand(this.gameState, this.deck);
		this.broadcastState();
		this.sendPrivateCards();
	}

	private handleRebuy(connection: Party.Connection, amount: number) {
		const playerId = this.connectionToPlayer.get(connection.id);
		if (!playerId || !this.gameState) return;

		const player = this.gameState.players.find((p) => p.id === playerId);
		if (!player) return;

		// Can only rebuy when hand is complete and player has 0 chips
		if (this.gameState.phase !== 'complete' && this.gameState.phase !== 'waiting') {
			this.sendTo(connection, { type: 'error', message: 'Can only rebuy between hands' });
			return;
		}

		player.chips += amount;
		player.sittingOut = false;

		const meta = this.playerMeta.get(playerId);
		if (meta) meta.buyIn += amount;

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

		// Calculate settlement
		const balances = this.gameState.players.map((p) => {
			const meta = this.playerMeta.get(p.id)!;
			return {
				id: p.id,
				name: meta.name,
				buyIn: meta.buyIn,
				cashOut: p.chips
			};
		});

		const payments = calculateSettlement(balances);

		this.broadcast({
			type: 'settlement',
			payments: payments.map((p) => ({
				from: p.from,
				fromId: p.fromId,
				to: p.to,
				toId: p.toId,
				amount: p.amount
			}))
		});

		// Reset game
		this.gameState.phase = 'waiting';
		this.gameStarted = false;
		this.broadcastState();
	}

	private resolveHand() {
		if (!this.gameState) return;

		const active = this.gameState.players.filter((p) => !p.folded && !p.sittingOut);

		if (active.length === 1) {
			// Everyone else folded — give pot to last player
			const winner = active[0];
			const totalPot = this.gameState.pots.reduce((sum, p) => sum + p.amount, 0);
			winner.chips += totalPot;

			this.broadcast({
				type: 'hand-result',
				winners: [{ playerId: winner.id, hand: 'Last player standing', amount: totalPot }]
			});
		} else {
			// Showdown
			const potWinners = evaluateHands(this.gameState);
			distributeWinnings(this.gameState, potWinners);

			const results = potWinners.flatMap((pw) =>
				pw.winnerIds.map((id) => ({
					playerId: id,
					hand: '', // Could extract from pokersolver if needed
					amount: Math.floor(pw.amount / pw.winnerIds.length)
				}))
			);

			this.broadcast({ type: 'hand-result', winners: results });

			// Reveal all active players' cards at showdown
			for (const player of active) {
				this.broadcast({ type: 'private', holeCards: player.holeCards });
			}
		}
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
