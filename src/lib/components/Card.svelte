<script lang="ts">
	import type { Card } from '$lib/engine/types';

	interface Props {
		card?: Card | null;
		faceDown?: boolean;
		animate?: 'deal' | 'flip' | 'none';
		highlighted?: boolean;
		size?: 'normal' | 'small';
		delay?: number;
	}

	let {
		card = null,
		faceDown = false,
		animate = 'none',
		highlighted = false,
		size = 'normal',
		delay = 0
	}: Props = $props();

	const suitSymbols: Record<string, string> = {
		h: '♥',
		d: '♦',
		c: '♣',
		s: '♠'
	};

	const suitColors: Record<string, string> = {
		h: 'var(--suit-hearts)',
		d: 'var(--suit-diamonds)',
		c: 'var(--suit-clubs)',
		s: 'var(--suit-spades)'
	};

	const rankDisplay: Record<string, string> = {
		T: '10',
		J: 'J',
		Q: 'Q',
		K: 'K',
		A: 'A'
	};

	function formatRank(rank: string): string {
		return rankDisplay[rank] || rank;
	}

	// Derived states from props
	let isFlipped = $derived(faceDown || !card);
	let shouldDeal = $derived(animate === 'deal');
	let hasDealt = $state(false);

	// Handle deal animation
	$effect(() => {
		if (shouldDeal) {
			hasDealt = false;
			const timer = setTimeout(() => {
				hasDealt = true;
			}, delay);
			return () => clearTimeout(timer);
		} else {
			hasDealt = true;
		}
	});
</script>

<div
	class="card-container"
	class:small={size === 'small'}
	class:highlighted
	class:dealing={animate === 'deal' && !hasDealt}
	class:dealt={animate === 'deal' && hasDealt}
>
	<div class="card-inner" class:flipped={isFlipped}>
		<!-- Front face -->
		<div class="card-face card-front" style:--suit-color={card ? suitColors[card.suit] : ''}>
			{#if card}
				<span class="rank">{formatRank(card.rank)}</span>
				<span class="suit">{suitSymbols[card.suit]}</span>
			{/if}
		</div>
		<!-- Back face -->
		<div class="card-face card-back">
			<div class="back-pattern"></div>
		</div>
	</div>
</div>

<style>
	.card-container {
		--card-w: var(--card-width, 60px);
		--card-h: var(--card-height, 84px);
		width: var(--card-w);
		height: var(--card-h);
		perspective: 1000px;
		flex-shrink: 0;
	}

	.card-container.small {
		--card-w: var(--card-width-small, 44px);
		--card-h: var(--card-height-small, 62px);
	}

	.card-container.highlighted {
		filter: drop-shadow(0 0 10px var(--accent-gold)) drop-shadow(0 0 20px var(--accent-gold));
	}

	.card-container.dealing {
		opacity: 0;
		transform: translateY(-100px) scale(0.5);
	}

	.card-container.dealt {
		animation: deal-in var(--anim-deal, 400ms) cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
	}

	@keyframes deal-in {
		0% {
			opacity: 0;
			transform: translateY(-100px) scale(0.5);
		}
		60% {
			opacity: 1;
			transform: translateY(5px) scale(1.05);
		}
		100% {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}

	.card-inner {
		position: relative;
		width: 100%;
		height: 100%;
		transition: transform var(--anim-flip, 600ms) ease-in-out;
		transform-style: preserve-3d;
	}

	.card-inner.flipped {
		transform: rotateY(180deg);
	}

	.card-face {
		position: absolute;
		width: 100%;
		height: 100%;
		backface-visibility: hidden;
		border-radius: var(--card-border-radius, 8px);
		border: 3px solid;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		font-family: inherit;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
	}

	.card-front {
		background: linear-gradient(135deg, #f5f5f0 0%, #e8e8e0 100%);
		border-color: #c0c0b0;
		color: var(--suit-color, #333);
	}

	.rank {
		font-size: calc(var(--card-w) * 0.45);
		font-weight: bold;
		line-height: 1;
		margin-bottom: -4px;
	}

	.suit {
		font-size: calc(var(--card-w) * 0.4);
		line-height: 1;
	}

	.card-container.small .rank {
		font-size: calc(var(--card-w) * 0.4);
	}

	.card-container.small .suit {
		font-size: calc(var(--card-w) * 0.35);
	}

	.card-back {
		background: linear-gradient(135deg, var(--accent-red) 0%, #d94a40 100%);
		border-color: #b33a32;
		transform: rotateY(180deg);
		overflow: hidden;
	}

	.back-pattern {
		position: absolute;
		inset: 4px;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-radius: 4px;
		background: repeating-linear-gradient(
			45deg,
			transparent,
			transparent 4px,
			rgba(0, 0, 0, 0.1) 4px,
			rgba(0, 0, 0, 0.1) 8px
		);
	}

	.back-pattern::after {
		content: '';
		position: absolute;
		inset: 6px;
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 2px;
	}
</style>
