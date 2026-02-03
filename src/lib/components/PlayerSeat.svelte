<script lang="ts">
	import type { Card as CardType } from '$lib/engine/types';
	import type { PublicPlayer } from '$lib/protocol';
	import Card from './Card.svelte';

	interface Props {
		player: PublicPlayer;
		isMe?: boolean;
		isActive?: boolean;
		isDealer?: boolean;
		isSB?: boolean;
		isBB?: boolean;
		holeCards?: CardType[];
		showCards?: boolean;
		hasCards?: boolean;
		position?: 'top' | 'left' | 'right' | 'bottom' | 'top-left' | 'top-right';
		animate?: boolean;
		isWinner?: boolean;
		winAmount?: number;
		winHand?: string;
	}

	let {
		player,
		isMe = false,
		isActive = false,
		isDealer = false,
		isSB = false,
		isBB = false,
		holeCards = [],
		showCards = false,
		hasCards = false,
		position = 'bottom',
		animate = true,
		isWinner = false,
		winAmount = 0,
		winHand = ''
	}: Props = $props();

	let prevChips = $state(0);
	let chipsChanged = $state(false);

	// Track chip changes for animation
	$effect(() => {
		const currentChips = player.chips;
		if (prevChips !== 0 && currentChips !== prevChips) {
			chipsChanged = true;
			const timer = setTimeout(() => {
				chipsChanged = false;
			}, 300);
			return () => clearTimeout(timer);
		}
		prevChips = currentChips;
	});

	function formatChips(chips: number): string {
		if (chips >= 1000000) return `${(chips / 1000000).toFixed(1)}M`;
		if (chips >= 1000) return `${(chips / 1000).toFixed(1)}K`;
		return chips.toString();
	}
</script>

<div
	class="player-seat"
	class:active={isActive}
	class:me={isMe}
	class:folded={player.folded}
	class:all-in={player.allIn}
	class:disconnected={!player.connected}
	class:winner={isWinner}
	class:busted={player.chips === 0 && player.sittingOut}
	data-position={position}
>
	<!-- Confetti for winner -->
	{#if isWinner}
		<div class="confetti-container">
			{#each Array(12) as _, i}
				<div class="confetti" style="--i: {i}; --color: {['#FE5F55', '#009DFF', '#F3B958', '#4BC292', '#F03464'][i % 5]}"></div>
			{/each}
		</div>
		<div class="win-banner">
			<span class="win-amount">+{winAmount}</span>
			{#if winHand}
				<span class="win-hand">{winHand}</span>
			{/if}
		</div>
	{/if}

	<!-- Player info -->
	<div class="player-info">
		<div class="name-row">
			<span class="player-name" class:truncate={player.name.length > 10}>
				{player.name}
			</span>
			<div class="badges">
				{#if isDealer}
					<span class="badge dealer-badge">D</span>
				{/if}
				{#if isSB}
					<span class="badge sb-badge">SB</span>
				{/if}
				{#if isBB}
					<span class="badge bb-badge">BB</span>
				{/if}
			</div>
		</div>

		<div class="chips-row">
			<span class="chip-icon">●</span>
			<span class="chip-count" class:chip-change={chipsChanged}>
				{formatChips(player.chips)}
			</span>
		</div>

		{#if player.bet > 0}
			<div class="current-bet">
				Bet: {formatChips(player.bet)}
			</div>
		{/if}

		{#if player.chips === 0 && player.sittingOut}
			<div class="status-badge busted-badge">BUSTED</div>
		{:else if player.folded}
			<div class="status-badge folded-badge">FOLD</div>
		{:else if player.allIn}
			<div class="status-badge allin-badge">ALL IN</div>
		{:else if !player.connected}
			<div class="status-badge disconnected-badge">AWAY</div>
		{:else if player.sittingOut}
			<div class="status-badge sitting-out-badge">SITTING OUT</div>
		{/if}
	</div>

	<!-- Hole cards -->
	<div class="hole-cards">
		{#if showCards && holeCards.length === 2}
			<Card card={holeCards[0]} size="small" animate={animate ? 'deal' : 'none'} delay={0} />
			<Card card={holeCards[1]} size="small" animate={animate ? 'deal' : 'none'} delay={100} />
		{:else if hasCards && !player.folded}
			<Card faceDown={true} size="small" />
			<Card faceDown={true} size="small" />
		{/if}
	</div>
</div>

<style>
	.player-seat {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-3);
		background: var(--bg-panel);
		border: 3px solid var(--border-color);
		border-radius: var(--card-border-radius);
		min-width: 100px;
		transition: all var(--anim-normal) ease;
	}

	.player-seat.me {
		background: var(--bg-panel-dark);
		border-color: var(--accent-blue);
	}

	.player-seat.active {
		border-color: var(--accent-gold);
		animation: pulse-glow 1.5s ease-in-out infinite;
	}

	@keyframes pulse-glow {
		0%, 100% {
			box-shadow: 0 0 10px rgba(243, 185, 88, 0.4), 0 0 20px rgba(243, 185, 88, 0.2);
		}
		50% {
			box-shadow: 0 0 20px rgba(243, 185, 88, 0.6), 0 0 40px rgba(243, 185, 88, 0.4), 0 0 60px rgba(243, 185, 88, 0.2);
		}
	}

	.player-seat.folded {
		opacity: 0.5;
	}

	.player-seat.disconnected {
		opacity: 0.4;
	}

	.player-seat.busted {
		opacity: 0.3;
		filter: grayscale(0.8);
		transform: scale(0.9);
	}

	.player-seat.winner {
		border-color: var(--accent-gold);
		transform: scale(1.1);
		z-index: 100;
		animation: winner-glow 0.8s ease-in-out infinite alternate;
	}

	@keyframes winner-glow {
		0% {
			box-shadow: 0 0 20px rgba(243, 185, 88, 0.6), 0 0 40px rgba(243, 185, 88, 0.4), 0 0 60px rgba(243, 185, 88, 0.2);
		}
		100% {
			box-shadow: 0 0 30px rgba(243, 185, 88, 0.8), 0 0 60px rgba(243, 185, 88, 0.6), 0 0 90px rgba(243, 185, 88, 0.4);
		}
	}

	/* Confetti */
	.confetti-container {
		position: absolute;
		top: 50%;
		left: 50%;
		width: 0;
		height: 0;
		pointer-events: none;
		z-index: 200;
	}

	.confetti {
		position: absolute;
		width: 8px;
		height: 8px;
		background: var(--color);
		border-radius: 2px;
		animation: confetti-burst 1.5s ease-out forwards;
		animation-delay: calc(var(--i) * 0.05s);
	}

	@keyframes confetti-burst {
		0% {
			transform: translate(0, 0) rotate(0deg) scale(0);
			opacity: 1;
		}
		20% {
			transform: translate(
				calc(cos(calc(var(--i) * 30deg)) * 60px),
				calc(sin(calc(var(--i) * 30deg)) * 60px - 40px)
			) rotate(180deg) scale(1);
			opacity: 1;
		}
		100% {
			transform: translate(
				calc(cos(calc(var(--i) * 30deg)) * 80px),
				calc(sin(calc(var(--i) * 30deg)) * 60px + 60px)
			) rotate(540deg) scale(0.5);
			opacity: 0;
		}
	}

	/* Win banner */
	.win-banner {
		position: absolute;
		top: -40px;
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
		background: linear-gradient(135deg, #F3B958, #e6a93d);
		padding: 4px 12px;
		border-radius: 8px;
		box-shadow: 0 4px 0 #b8893a, 0 6px 20px rgba(243, 185, 88, 0.5);
		animation: win-pop 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
		z-index: 201;
	}

	@keyframes win-pop {
		0% {
			transform: translateX(-50%) scale(0) translateY(20px);
			opacity: 0;
		}
		100% {
			transform: translateX(-50%) scale(1) translateY(0);
			opacity: 1;
		}
	}

	.win-amount {
		color: #1a1a1a;
		font-size: 18px;
		font-weight: bold;
	}

	.win-hand {
		color: #4a3a1a;
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.player-info {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-1);
		width: 100%;
	}

	.name-row {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		justify-content: center;
	}

	.player-name {
		font-size: 14px;
		color: var(--text-primary);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.player-name.truncate {
		max-width: 80px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.badges {
		display: flex;
		gap: 2px;
	}

	.badge {
		font-size: 10px;
		font-weight: bold;
		min-width: 18px;
		height: 18px;
		border-radius: 4px;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0 4px;
	}

	.dealer-badge {
		background: var(--accent-gold);
		color: #1a1a1a;
		border-radius: 50%;
		padding: 0;
		box-shadow: 0 2px 0 #b8893a;
	}

	.sb-badge {
		background: var(--accent-blue);
		color: white;
		box-shadow: 0 2px 0 #0080cc;
	}

	.bb-badge {
		background: var(--accent-red);
		color: white;
		box-shadow: 0 2px 0 #d94a40;
	}

	.chips-row {
		display: flex;
		align-items: center;
		gap: var(--space-1);
	}

	.chip-icon {
		color: var(--accent-gold);
		font-size: 12px;
	}

	.chip-count {
		color: var(--accent-gold);
		font-size: 16px;
		font-weight: bold;
	}

	.chip-count.chip-change {
		animation: chip-pop 0.3s ease-out;
	}

	@keyframes chip-pop {
		0% { transform: scale(1); }
		50% { transform: scale(1.3); color: var(--accent-green); }
		100% { transform: scale(1); }
	}

	.current-bet {
		color: var(--accent-red);
		font-size: 12px;
	}

	.status-badge {
		font-size: 10px;
		padding: 2px 6px;
		border-radius: 3px;
		font-weight: bold;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.folded-badge {
		background: var(--text-muted);
		color: var(--bg-primary);
	}

	.allin-badge {
		background: var(--accent-red);
		color: white;
		animation: pulse 1s ease-in-out infinite;
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.7; }
	}

	.disconnected-badge {
		background: var(--text-secondary);
		color: var(--bg-primary);
	}

	.busted-badge {
		background: #1a1a1a;
		color: var(--accent-red);
		border: 1px solid var(--accent-red);
	}

	.sitting-out-badge {
		background: var(--text-muted);
		color: var(--bg-primary);
	}

	.hole-cards {
		display: flex;
		gap: var(--space-1);
		min-height: 62px;
	}

	/* Position-based adjustments */
	.player-seat[data-position="bottom"] {
		flex-direction: column-reverse;
	}

	.player-seat[data-position="top"] .hole-cards {
		order: -1;
	}

	.player-seat[data-position="left"],
	.player-seat[data-position="right"] {
		flex-direction: row;
	}

	.player-seat[data-position="left"] .hole-cards,
	.player-seat[data-position="right"] .hole-cards {
		flex-direction: column;
	}
</style>
