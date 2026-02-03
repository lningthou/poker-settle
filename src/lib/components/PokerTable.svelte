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
		showdown = false,
		children
	}: Props = $props();

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
		if (index === 0) return 'bottom'; // Always me at bottom

		if (total === 2) {
			return 'top';
		}

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

	// Get hole cards for a player (only current player gets their actual cards)
	function getPlayerHoleCards(player: PublicPlayer): CardType[] {
		if (player.id === myId) {
			return holeCards;
		}
		// For other players, we don't have their cards (they're private)
		return [];
	}

	// Determine if we should show cards face-up
	function shouldShowCards(player: PublicPlayer): boolean {
		if (player.id === myId) return true;
		// During showdown non-folded players would have cards revealed, but
		// the server would need to send them - for now we just show card backs
		return false;
	}

	// Check if player has cards (using cardCount for other players)
	function hasCards(player: PublicPlayer): boolean {
		if (player.id === myId) return holeCards.length > 0;
		return player.cardCount > 0;
	}
</script>

<div class="poker-table animated-bg">
	<!-- CRT overlay -->
	<div class="crt-overlay"></div>

	<!-- Table felt area -->
	<div class="table-felt">
		<!-- Community cards and pot -->
		<div class="table-center">
			<div class="community-cards">
				{#each communityCards as card, i (i)}
					<Card {card} animate="deal" delay={i * 150} />
				{/each}
				{#if communityCards.length === 0 && phase !== 'waiting'}
					<div class="cards-placeholder">
						<span class="placeholder-text">Community Cards</span>
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

		<!-- Player seats positioned around table -->
		<div class="player-positions" data-player-count={players.length}>
			{#each rotatedPlayers as { player, originalIndex }, viewIndex (player.id)}
				{@const position = getPositionClass(viewIndex, players.length)}
				{@const isActive = originalIndex === activePlayerIndex}
				{@const isDealer = originalIndex === dealerIndex}
				{@const playerHoleCards = getPlayerHoleCards(player)}
				{@const showCards = shouldShowCards(player)}
				{@const playerHasCards = hasCards(player)}

				<div class="seat-wrapper" data-position={position}>
					<PlayerSeat
						{player}
						isMe={player.id === myId}
						{isActive}
						{isDealer}
						holeCards={playerHoleCards}
						{showCards}
						hasCards={playerHasCards}
						{position}
						animate={phase !== 'waiting'}
					/>
				</div>
			{/each}
		</div>
	</div>

	<!-- Slot for controls/overlays -->
	{#if children}
		<div class="table-overlay">
			{@render children()}
		</div>
	{/if}
</div>

<style>
	.poker-table {
		position: relative;
		width: 100%;
		min-height: 500px;
		padding: var(--space-4);
		border-radius: var(--card-border-radius);
		overflow: hidden;
	}

	.table-felt {
		position: relative;
		width: 100%;
		height: 100%;
		min-height: 480px;
		background: radial-gradient(ellipse at center, #1a3a3a 0%, #0d1a1c 100%);
		border: 4px solid var(--border-color);
		border-radius: 50% / 30%;
		padding: var(--space-6);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
	}

	.table-center {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-3);
		z-index: var(--z-cards);
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
		width: 200px;
		height: 84px;
		border: 2px dashed var(--border-color);
		border-radius: var(--card-border-radius);
		opacity: 0.3;
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

	/* Player positioning system */
	.player-positions {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}

	.seat-wrapper {
		position: absolute;
		pointer-events: auto;
		transition: all var(--anim-normal) ease;
	}

	/* Bottom - current player */
	.seat-wrapper[data-position="bottom"] {
		bottom: 10px;
		left: 50%;
		transform: translateX(-50%);
	}

	/* Top - opponent in 2-player */
	.seat-wrapper[data-position="top"] {
		top: 10px;
		left: 50%;
		transform: translateX(-50%);
	}

	/* Left side */
	.seat-wrapper[data-position="left"] {
		left: 10px;
		top: 50%;
		transform: translateY(-50%);
	}

	/* Right side */
	.seat-wrapper[data-position="right"] {
		right: 10px;
		top: 50%;
		transform: translateY(-50%);
	}

	/* Top-left */
	.seat-wrapper[data-position="top-left"] {
		top: 20%;
		left: 15%;
	}

	/* Top-right */
	.seat-wrapper[data-position="top-right"] {
		top: 20%;
		right: 15%;
	}

	.table-overlay {
		position: relative;
		z-index: var(--z-controls);
		margin-top: var(--space-4);
	}

	/* Responsive adjustments */
	@media (max-width: 600px) {
		.poker-table {
			padding: var(--space-2);
		}

		.table-felt {
			min-height: 400px;
			padding: var(--space-4);
			border-radius: 30% / 20%;
		}

		.seat-wrapper[data-position="left"],
		.seat-wrapper[data-position="right"] {
			display: none;
		}

		.seat-wrapper[data-position="top-left"] {
			left: 5%;
		}

		.seat-wrapper[data-position="top-right"] {
			right: 5%;
		}
	}
</style>
