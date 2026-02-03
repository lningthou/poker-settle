<script lang="ts">
	import type { Card as CardType } from '$lib/engine/types';
	import type { PublicPlayer } from '$lib/protocol';
	import Card from './Card.svelte';
	import PlayerSeat from './PlayerSeat.svelte';

	interface Props {
		players: PublicPlayer[];
		myId: string | null;
		communityCards: CardType[];
		dealerIndex: number;
		activePlayerIndex: number;
		pots: { amount: number }[];
		phase: string;
		holeCards: CardType[];
		smallBlind: number;
		bigBlind: number;
		showdownCards?: Record<string, CardType[]>;
		showdown?: boolean;
		children?: import('svelte').Snippet;
	}

	let {
		players,
		myId,
		communityCards,
		dealerIndex,
		activePlayerIndex,
		pots,
		phase,
		holeCards,
		smallBlind,
		bigBlind,
		showdownCards = {},
		showdown = false,
		children
	}: Props = $props();

	// Calculate SB and BB positions based on dealer
	// In heads-up: dealer is SB, other player is BB
	// In 3+ players: SB is dealer+1, BB is dealer+2
	function getBlindPositions(dealerIdx: number, playerCount: number): { sbIndex: number; bbIndex: number } {
		if (playerCount === 2) {
			return {
				sbIndex: dealerIdx,
				bbIndex: (dealerIdx + 1) % playerCount
			};
		}
		return {
			sbIndex: (dealerIdx + 1) % playerCount,
			bbIndex: (dealerIdx + 2) % playerCount
		};
	}

	// Rotate players so current player (myId) is always at bottom
	function rotatePlayersToMe(allPlayers: PublicPlayer[], myPlayerId: string | null): { player: PublicPlayer; originalIndex: number }[] {
		if (!myPlayerId) {
			return allPlayers.map((p, i) => ({ player: p, originalIndex: i }));
		}
		const myIndex = allPlayers.findIndex(p => p.id === myPlayerId);
		if (myIndex === -1) {
			return allPlayers.map((p, i) => ({ player: p, originalIndex: i }));
		}

		const rotated: { player: PublicPlayer; originalIndex: number }[] = [];
		const len = allPlayers.length;

		for (let i = 0; i < len; i++) {
			const idx = (myIndex + i) % len;
			rotated.push({ player: allPlayers[idx], originalIndex: idx });
		}

		return rotated;
	}

	// Get position class based on player count and index in rotated array
	function getPositionClass(index: number, total: number): 'bottom' | 'top' | 'left' | 'right' | 'top-left' | 'top-right' {
		if (index === 0) return 'bottom';

		if (total === 2) return 'top';

		if (total === 3) {
			return index === 1 ? 'top-left' : 'top-right';
		}

		if (total === 4) {
			if (index === 1) return 'left';
			if (index === 2) return 'top';
			return 'right';
		}

		if (total === 5) {
			if (index === 1) return 'left';
			if (index === 2) return 'top-left';
			if (index === 3) return 'top-right';
			return 'right';
		}

		// 6+ players
		if (index === 1) return 'left';
		if (index === 2) return 'top-left';
		if (index === total - 2) return 'top-right';
		if (index === total - 1) return 'right';
		return 'top';
	}

	let rotatedPlayers = $derived(rotatePlayersToMe(players, myId));
	let totalPot = $derived(pots.reduce((sum, pot) => sum + pot.amount, 0));
	let blindPositions = $derived(getBlindPositions(dealerIndex, players.length));

	// Get hole cards for a player
	function getPlayerHoleCards(player: PublicPlayer): CardType[] {
		// During showdown, use revealed cards if available
		if (showdown && showdownCards[player.id]) {
			return showdownCards[player.id];
		}
		// For self, use private hole cards
		if (player.id === myId) return holeCards;
		return [];
	}

	function shouldShowCards(player: PublicPlayer): boolean {
		// Always show own cards
		if (player.id === myId) return true;
		// During showdown, show if we have their revealed cards
		if (showdown && showdownCards[player.id]) return true;
		return false;
	}

	function hasCards(player: PublicPlayer): boolean {
		if (player.id === myId) return holeCards.length > 0;
		if (showdown && showdownCards[player.id]) return true;
		return player.cardCount > 0;
	}

	function getPlayerRole(originalIndex: number): 'dealer' | 'sb' | 'bb' | null {
		if (originalIndex === dealerIndex) return 'dealer';
		if (originalIndex === blindPositions.sbIndex) return 'sb';
		if (originalIndex === blindPositions.bbIndex) return 'bb';
		return null;
	}
</script>

<div class="poker-table-wrapper">
	<!-- Player seats positioned around the table -->
	<div class="player-positions" data-player-count={players.length}>
		{#each rotatedPlayers as { player, originalIndex }, viewIndex (player.id)}
			{@const position = getPositionClass(viewIndex, players.length)}
			{@const isActive = originalIndex === activePlayerIndex}
			{@const role = getPlayerRole(originalIndex)}
			{@const playerHoleCards = getPlayerHoleCards(player)}
			{@const showCards = shouldShowCards(player)}
			{@const playerHasCards = hasCards(player)}

			<div class="seat-wrapper" data-position={position}>
				<PlayerSeat
					{player}
					isMe={player.id === myId}
					{isActive}
					isDealer={role === 'dealer'}
					isSB={role === 'sb'}
					isBB={role === 'bb'}
					holeCards={playerHoleCards}
					{showCards}
					hasCards={playerHasCards}
					{position}
					animate={phase !== 'waiting'}
				/>
			</div>
		{/each}
	</div>

	<!-- Table felt area (centered) -->
	<div class="table-felt">
		<div class="table-center">
			<div class="community-cards">
				{#each communityCards as card, i (i)}
					<Card {card} animate="deal" delay={i * 150} />
				{/each}
				{#if communityCards.length === 0 && phase !== 'waiting'}
					<div class="cards-placeholder">
						<span class="placeholder-text">Waiting for cards...</span>
					</div>
				{/if}
			</div>

			{#if totalPot > 0}
				<div class="pot-display pop-in">
					<span class="pot-label">POT</span>
					<span class="pot-amount">{totalPot}</span>
				</div>
			{/if}
		</div>
	</div>

	<!-- Slot for hand results overlay -->
	{#if children}
		<div class="table-overlay">
			{@render children()}
		</div>
	{/if}
</div>

<style>
	.poker-table-wrapper {
		position: relative;
		width: 100%;
		min-height: 500px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
	}

	/* Table felt - the green oval in the center */
	.table-felt {
		position: relative;
		width: 80%;
		max-width: 500px;
		min-height: 200px;
		background: radial-gradient(ellipse at center, #1a3a3a 0%, #0d1a1c 100%);
		border: 6px solid var(--border-color);
		border-radius: 50% / 40%;
		padding: var(--space-6);
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow:
			inset 0 0 30px rgba(0, 0, 0, 0.5),
			0 0 20px rgba(0, 0, 0, 0.3);
		z-index: 1;
	}

	.table-center {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-3);
	}

	.community-cards {
		display: flex;
		gap: var(--space-2);
		justify-content: center;
		flex-wrap: wrap;
		min-height: 84px;
	}

	.cards-placeholder {
		display: flex;
		align-items: center;
		justify-content: center;
		min-width: 150px;
		height: 60px;
		border: 2px dashed rgba(255, 255, 255, 0.2);
		border-radius: var(--card-border-radius);
	}

	.placeholder-text {
		font-size: 12px;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 1px;
	}

	.pot-display {
		display: flex;
		flex-direction: column;
		align-items: center;
		background: var(--bg-panel-dark);
		border: 3px solid var(--accent-gold);
		border-radius: 8px;
		padding: var(--space-2) var(--space-4);
		box-shadow: 0 0 20px rgba(243, 185, 88, 0.3);
	}

	.pot-label {
		font-size: 10px;
		color: var(--text-secondary);
		text-transform: uppercase;
		letter-spacing: 1px;
	}

	.pot-amount {
		font-size: 24px;
		color: var(--accent-gold);
		font-weight: bold;
	}

	/* Player positioning - seats around the table, outside the felt */
	.player-positions {
		position: absolute;
		inset: 0;
		pointer-events: none;
		z-index: 10;
	}

	.seat-wrapper {
		position: absolute;
		pointer-events: auto;
		transition: all var(--anim-normal) ease;
	}

	/* Bottom - current player (below the table) */
	.seat-wrapper[data-position="bottom"] {
		bottom: 0;
		left: 50%;
		transform: translateX(-50%);
	}

	/* Top - opponent (above the table) */
	.seat-wrapper[data-position="top"] {
		top: 0;
		left: 50%;
		transform: translateX(-50%);
	}

	/* Left side */
	.seat-wrapper[data-position="left"] {
		left: 0;
		top: 50%;
		transform: translateY(-50%);
	}

	/* Right side */
	.seat-wrapper[data-position="right"] {
		right: 0;
		top: 50%;
		transform: translateY(-50%);
	}

	/* Top-left */
	.seat-wrapper[data-position="top-left"] {
		top: 10%;
		left: 5%;
	}

	/* Top-right */
	.seat-wrapper[data-position="top-right"] {
		top: 10%;
		right: 5%;
	}

	.table-overlay {
		position: relative;
		z-index: 20;
		width: 100%;
	}

	/* Responsive adjustments */
	@media (max-width: 600px) {
		.poker-table-wrapper {
			min-height: 450px;
		}

		.table-felt {
			width: 70%;
			min-height: 150px;
			padding: var(--space-4);
		}

		.seat-wrapper[data-position="left"],
		.seat-wrapper[data-position="right"] {
			display: none;
		}
	}
</style>
