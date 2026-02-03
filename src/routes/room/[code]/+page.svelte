<script lang="ts">
	import { page } from '$app/state';
	import { onMount, onDestroy, tick } from 'svelte';
	import { goto } from '$app/navigation';
	import {
		connect,
		disconnect,
		connected,
		playerId,
		roomCode,
		phase,
		players,
		communityCards,
		pots,
		currentBet,
		dealerIndex,
		activePlayerIndex,
		smallBlind,
		bigBlind,
		hostId,
		holeCards,
		errorMessage,
		handResult,
		settlement,
		isHost,
		isMyTurn,
		myPlayer,
		totalPot,
		startGame,
		fold,
		check,
		call,
		raise,
		allIn,
		rebuy,
		endSession,
		kickPlayer,
		nextHandCountdown,
		chatMessages,
		sendChat
	} from '$lib/stores/game';
	import type { Card } from '$lib/engine/types';

	const PARTY_HOST = 'localhost:1999';

	let buyInAmount = $state(1000);
	let sbAmount = $state(5);
	let bbAmount = $state(10);
	let raiseAmount = $state(0);
	let showCopied = $state(false);
	let chatInput = $state('');
	let chatContainer: HTMLDivElement;

	onMount(() => {
		const name = page.url.searchParams.get('name');
		if (!name) {
			goto('/');
			return;
		}
		connect(PARTY_HOST, page.params.code!, name);
	});

	onDestroy(() => {
		disconnect();
	});

	// Auto-scroll chat when new messages arrive
	$effect(() => {
		if ($chatMessages.length > 0 && chatContainer) {
			tick().then(() => {
				chatContainer.scrollTop = chatContainer.scrollHeight;
			});
		}
	});

	function formatCard(card: Card): string {
		const suitSymbols: Record<string, string> = { h: '\u2665', d: '\u2666', c: '\u2663', s: '\u2660' };
		const rankDisplay: Record<string, string> = { T: '10', J: 'J', Q: 'Q', K: 'K', A: 'A' };
		return `${rankDisplay[card.rank] ?? card.rank}${suitSymbols[card.suit]}`;
	}

	function cardColor(card: Card): string {
		return card.suit === 'h' || card.suit === 'd' ? '#e94560' : '#222';
	}

	async function copyShareLink() {
		const link = `${window.location.origin}/room/${page.params.code}`;
		try {
			await navigator.clipboard.writeText(link);
			showCopied = true;
			setTimeout(() => (showCopied = false), 2000);
		} catch {
			// Fallback for browsers that don't support clipboard API
			prompt('Copy this link:', link);
		}
	}

	function canCheck(): boolean {
		const me = $myPlayer;
		if (!me) return false;
		return me.bet >= $currentBet;
	}

	function callAmount(): number {
		const me = $myPlayer;
		if (!me) return 0;
		return Math.min($currentBet - me.bet, me.chips);
	}

	function handleRaise() {
		if (raiseAmount > 0) {
			raise(raiseAmount);
			raiseAmount = 0;
		}
	}

	function handleChatSubmit(e: Event) {
		e.preventDefault();
		if (chatInput.trim()) {
			sendChat(chatInput.trim());
			chatInput = '';
		}
	}
</script>

<svelte:head>
	<title>Room {page.params.code} - Poker Settle</title>
</svelte:head>

<div class="game-container">
	<!-- Header -->
	<div class="header">
		<div class="room-info">
			<span class="room-code">{page.params.code}</span>
			<button class="copy-btn" onclick={copyShareLink}>
				{showCopied ? 'Copied!' : 'Share'}
			</button>
		</div>
		{#if $isHost && $phase !== 'waiting'}
			<button class="btn-small danger" onclick={endSession}>End Session</button>
		{/if}
	</div>

	<!-- Error Toast -->
	{#if $errorMessage}
		<div class="error-toast">{$errorMessage}</div>
	{/if}

	<!-- Settlement Screen -->
	{#if $settlement}
		<div class="settlement">
			<h2>Session Settlement</h2>
			{#if $settlement.length === 0}
				<p class="settle-even">Everyone broke even!</p>
			{:else}
				<div class="payments">
					{#each $settlement as payment}
						<div class="payment-row">
							<span class="from">{payment.from}</span>
							<span class="arrow">pays ${payment.amount}</span>
							<span class="to">{payment.to}</span>
						</div>
					{/each}
				</div>
			{/if}
			<button class="btn primary" onclick={() => goto('/')}>Back to Home</button>
		</div>

	<!-- Lobby / Waiting -->
	{:else if $phase === 'waiting'}
		<div class="lobby">
			<h2>Waiting for players...</h2>
			<div class="player-list">
				{#each $players as player}
					<div class="player-chip">
						{player.name}
						{#if player.id === $hostId}(host){/if}
						{#if $isHost && player.id !== $playerId}
							<button
								class="kick-btn"
								onclick={() => kickPlayer(player.id)}
								title="Remove player"
							>&times;</button>
						{/if}
					</div>
				{/each}
			</div>

			{#if $isHost}
				<div class="game-config">
					<h3>Game Setup</h3>
					<div class="config-row">
						<label for="buyin">Buy-in</label>
						<div class="stepper">
							<button class="step-btn" onclick={() => (buyInAmount = Math.max(100, buyInAmount - 100))}>-</button>
							<input id="buyin" type="number" bind:value={buyInAmount} min="100" step="100" />
							<button class="step-btn" onclick={() => (buyInAmount += 100)}>+</button>
						</div>
					</div>
					<div class="config-row">
						<label for="sb">Small Blind</label>
						<div class="stepper">
							<button class="step-btn" onclick={() => (sbAmount = Math.max(1, sbAmount - 1))}>-</button>
							<input id="sb" type="number" bind:value={sbAmount} min="1" />
							<button class="step-btn" onclick={() => (sbAmount += 1)}>+</button>
						</div>
					</div>
					<div class="config-row">
						<label for="bb">Big Blind</label>
						<div class="stepper">
							<button class="step-btn" onclick={() => (bbAmount = Math.max(2, bbAmount - 1))}>-</button>
							<input id="bb" type="number" bind:value={bbAmount} min="2" />
							<button class="step-btn" onclick={() => (bbAmount += 1)}>+</button>
						</div>
					</div>
					<button
						class="btn primary"
						onclick={() => startGame(buyInAmount, sbAmount, bbAmount)}
						disabled={$players.length < 2}
					>
						Start Game ({$players.length} players)
					</button>
				</div>
			{:else}
				<p class="waiting-text">Waiting for host to start the game...</p>
			{/if}
		</div>

	<!-- Active Game -->
	{:else}
		<div class="table">
			<!-- Community Cards -->
			<div class="community">
				{#if $communityCards.length > 0}
					<div class="cards">
						{#each $communityCards as card}
							<div class="card" style="color: {cardColor(card)}">
								{formatCard(card)}
							</div>
						{/each}
					</div>
				{:else}
					<div class="cards-placeholder">Pre-flop</div>
				{/if}
				<div class="pot-display">Pot: {$totalPot}</div>
			</div>

			<!-- Players -->
			<div class="players">
				{#each $players as player, i}
					<div
						class="player-seat"
						class:active={i === $activePlayerIndex && $phase !== 'complete'}
						class:folded={player.folded}
						class:me={player.id === $playerId}
						class:disconnected={!player.connected}
					>
						<div class="player-name">
							{player.name}
							{#if i === $dealerIndex}<span class="badge dealer">D</span>{/if}
						</div>
						<div class="player-chips">{player.chips}</div>
						{#if player.bet > 0}
							<div class="player-bet">Bet: {player.bet}</div>
						{/if}
						{#if player.folded}
							<div class="player-status">Folded</div>
						{:else if player.allIn}
							<div class="player-status allin">ALL IN</div>
						{:else if !player.connected}
							<div class="player-status">Disconnected</div>
						{/if}
						<!-- Show card backs for other players, actual cards for self -->
						{#if player.id === $playerId && $holeCards.length > 0}
							<div class="hole-cards">
								{#each $holeCards as card}
									<div class="card small" style="color: {cardColor(card)}">
										{formatCard(card)}
									</div>
								{/each}
							</div>
						{:else if player.cardCount > 0 && !player.folded}
							<div class="hole-cards">
								<div class="card small back"></div>
								<div class="card small back"></div>
							</div>
						{/if}
					</div>
				{/each}
			</div>

			<!-- Hand Result -->
			{#if $handResult && $phase === 'complete'}
				<div class="hand-result">
					{#each $handResult as result}
						<div class="winner-line">
							{$players.find((p) => p.id === result.playerId)?.name ?? '?'} wins {result.amount}
							{#if result.hand}({result.hand}){/if}
						</div>
					{/each}
					{#if $nextHandCountdown}
						<div class="countdown">Next hand in {$nextHandCountdown}...</div>
					{/if}
				</div>
			{/if}

			<!-- Betting Controls -->
			{#if $isMyTurn && $phase !== 'complete'}
				<div class="controls">
					<div class="action-buttons">
						<button class="btn danger" onclick={fold}>Fold</button>
						{#if canCheck()}
							<button class="btn primary" onclick={check}>Check</button>
						{:else}
							<button class="btn primary" onclick={call}>
								Call {callAmount()}
							</button>
						{/if}
						<button class="btn accent" onclick={allIn}>All In</button>
					</div>
					<div class="raise-controls">
						<input
							type="range"
							min={$bigBlind}
							max={$myPlayer?.chips ?? 0}
							step={$bigBlind}
							bind:value={raiseAmount}
						/>
						<div class="raise-row">
							<input type="number" bind:value={raiseAmount} min={$bigBlind} />
							<button class="btn secondary" onclick={handleRaise} disabled={raiseAmount <= 0}>
								Raise
							</button>
						</div>
					</div>
				</div>
			{/if}

			<!-- Chat -->
			<div class="chat-section">
				<div class="chat-messages" bind:this={chatContainer}>
					{#each $chatMessages as msg}
						<div class="chat-msg">
							<span class="chat-name">{msg.name}:</span>
							<span class="chat-text">{msg.message}</span>
						</div>
					{/each}
					{#if $chatMessages.length === 0}
						<div class="chat-empty">No messages yet</div>
					{/if}
				</div>
				<form class="chat-input" onsubmit={handleChatSubmit}>
					<input
						type="text"
						bind:value={chatInput}
						placeholder="Type a message..."
						maxlength="200"
					/>
					<button type="submit" class="btn primary" disabled={!chatInput.trim()}>Send</button>
				</form>
			</div>
		</div>
	{/if}
</div>

<style>
	.game-container {
		max-width: 600px;
		margin: 0 auto;
		padding: 1rem;
		min-height: 100dvh;
		box-sizing: border-box;
	}

	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}

	.room-info {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.room-code {
		font-family: monospace;
		font-size: 1.1rem;
		color: #888;
	}

	.copy-btn {
		padding: 0.25rem 0.75rem;
		border: 1px solid #333;
		border-radius: 4px;
		background: #16213e;
		color: #aaa;
		cursor: pointer;
		font-size: 0.8rem;
	}

	.copy-btn:hover {
		background: #1a2745;
	}

	.error-toast {
		background: #e94560;
		color: #fff;
		padding: 0.75rem;
		border-radius: 8px;
		margin-bottom: 1rem;
		text-align: center;
		font-size: 0.875rem;
	}

	/* Lobby */
	.lobby {
		text-align: center;
	}

	.lobby h2 {
		color: #fff;
		margin-bottom: 1.5rem;
	}

	.player-list {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		justify-content: center;
		margin-bottom: 2rem;
	}

	.player-chip {
		padding: 0.5rem 1rem;
		background: #16213e;
		border: 1px solid #333;
		border-radius: 20px;
		font-size: 0.875rem;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		position: relative;
	}

	.kick-btn {
		display: none;
		width: 20px;
		height: 20px;
		border: none;
		border-radius: 50%;
		background: #e94560;
		color: #fff;
		font-size: 0.875rem;
		line-height: 1;
		cursor: pointer;
		padding: 0;
	}

	.player-chip:hover .kick-btn {
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.game-config {
		text-align: left;
		background: #16213e;
		padding: 1.5rem;
		border-radius: 12px;
	}

	.game-config h3 {
		margin-top: 0;
		color: #fff;
	}

	.config-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.75rem;
	}

	.config-row label {
		color: #aaa;
		font-size: 0.875rem;
	}

	.config-row input {
		width: 80px;
		padding: 0.5rem;
		border: 1px solid #444;
		border-radius: 6px;
		background: #1a1a2e;
		color: #fff;
		text-align: center;
		font-size: 1rem;
		font-weight: 600;
		-moz-appearance: textfield;
	}

	.config-row input::-webkit-outer-spin-button,
	.config-row input::-webkit-inner-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}

	.stepper {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.step-btn {
		width: 36px;
		height: 36px;
		border: 1px solid #444;
		border-radius: 6px;
		background: #253356;
		color: #fff;
		font-size: 1.25rem;
		font-weight: 600;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		line-height: 1;
	}

	.step-btn:hover {
		background: #2e4070;
	}

	.step-btn:active {
		background: #1a2745;
	}

	.waiting-text {
		color: #888;
	}

	/* Table */
	.table {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.community {
		text-align: center;
		padding: 1rem;
		background: #0f3d0f;
		border-radius: 12px;
		border: 2px solid #1a5c1a;
	}

	.cards {
		display: flex;
		justify-content: center;
		gap: 0.5rem;
		margin-bottom: 0.5rem;
	}

	.cards-placeholder {
		color: #4a8c4a;
		padding: 1rem;
		font-size: 0.875rem;
	}

	.card {
		width: 48px;
		height: 68px;
		background: #fff;
		border-radius: 6px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1rem;
		font-weight: 700;
		border: 1px solid #ddd;
	}

	.card.small {
		width: 36px;
		height: 50px;
		font-size: 0.8rem;
	}

	.card.back {
		background: linear-gradient(135deg, #e94560 25%, #d63851 75%);
		border: 1px solid #c0304a;
	}

	.pot-display {
		color: #ffd700;
		font-weight: 600;
		font-size: 1.1rem;
	}

	/* Players */
	.players {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
		gap: 0.5rem;
	}

	.player-seat {
		padding: 0.75rem;
		background: #16213e;
		border: 2px solid #333;
		border-radius: 10px;
		text-align: center;
		transition: border-color 0.2s;
	}

	.player-seat.active {
		border-color: #ffd700;
		box-shadow: 0 0 8px rgba(255, 215, 0, 0.3);
	}

	.player-seat.me {
		background: #1a2745;
	}

	.player-seat.folded {
		opacity: 0.5;
	}

	.player-seat.disconnected {
		opacity: 0.4;
	}

	.player-name {
		font-weight: 600;
		font-size: 0.875rem;
		margin-bottom: 0.25rem;
	}

	.player-chips {
		color: #ffd700;
		font-size: 0.8rem;
	}

	.player-bet {
		color: #e94560;
		font-size: 0.75rem;
		margin-top: 0.25rem;
	}

	.player-status {
		color: #888;
		font-size: 0.7rem;
		margin-top: 0.25rem;
		text-transform: uppercase;
	}

	.player-status.allin {
		color: #e94560;
		font-weight: 700;
	}

	.badge {
		display: inline-block;
		padding: 0.1rem 0.35rem;
		border-radius: 4px;
		font-size: 0.65rem;
		font-weight: 700;
		margin-left: 0.25rem;
	}

	.badge.dealer {
		background: #ffd700;
		color: #000;
	}

	.hole-cards {
		display: flex;
		justify-content: center;
		gap: 0.25rem;
		margin-top: 0.5rem;
	}

	/* Hand Result */
	.hand-result {
		background: #16213e;
		padding: 1rem;
		border-radius: 10px;
		text-align: center;
	}

	.winner-line {
		color: #ffd700;
		font-weight: 600;
		margin-bottom: 0.5rem;
	}

	.countdown {
		color: #888;
		font-size: 0.875rem;
		margin-top: 0.5rem;
	}

	/* Controls */
	.controls {
		background: #16213e;
		padding: 1rem;
		border-radius: 12px;
	}

	.action-buttons {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 0.75rem;
	}

	.action-buttons .btn {
		flex: 1;
	}

	.raise-controls input[type='range'] {
		width: 100%;
		margin-bottom: 0.5rem;
	}

	.raise-row {
		display: flex;
		gap: 0.5rem;
	}

	.raise-row input {
		flex: 1;
		padding: 0.5rem;
		border: 1px solid #333;
		border-radius: 6px;
		background: #1a1a2e;
		color: #fff;
	}

	/* Chat */
	.chat-section {
		background: #16213e;
		border-radius: 10px;
		overflow: hidden;
	}

	.chat-messages {
		height: 120px;
		overflow-y: auto;
		padding: 0.75rem;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.chat-msg {
		font-size: 0.8rem;
	}

	.chat-name {
		color: #e94560;
		font-weight: 600;
		margin-right: 0.25rem;
	}

	.chat-text {
		color: #ddd;
	}

	.chat-empty {
		color: #555;
		font-size: 0.8rem;
		text-align: center;
		padding: 1rem;
	}

	.chat-input {
		display: flex;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
		border-top: 1px solid #333;
	}

	.chat-input input {
		flex: 1;
		padding: 0.5rem;
		border: 1px solid #333;
		border-radius: 6px;
		background: #1a1a2e;
		color: #fff;
		font-size: 0.8rem;
	}

	.chat-input input::placeholder {
		color: #555;
	}

	.chat-input .btn {
		padding: 0.5rem 0.75rem;
		font-size: 0.8rem;
	}

	/* Buttons */
	.btn {
		padding: 0.75rem 1rem;
		border: none;
		border-radius: 8px;
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
	}

	.btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.btn.primary {
		background: #e94560;
		color: #fff;
	}

	.btn.secondary {
		background: #333;
		color: #eee;
	}

	.btn.accent {
		background: #ffd700;
		color: #000;
	}

	.btn.danger {
		background: #333;
		color: #e94560;
		border: 1px solid #e94560;
	}

	.btn-small {
		padding: 0.4rem 0.75rem;
		font-size: 0.75rem;
		border: none;
		border-radius: 6px;
		cursor: pointer;
	}

	.btn-small.danger {
		background: transparent;
		color: #e94560;
		border: 1px solid #e94560;
	}

	/* Settlement */
	.settlement {
		text-align: center;
		padding: 2rem 0;
	}

	.settlement h2 {
		color: #fff;
		margin-bottom: 1.5rem;
	}

	.settle-even {
		color: #4caf50;
		font-size: 1.2rem;
	}

	.payments {
		margin-bottom: 2rem;
	}

	.payment-row {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		padding: 0.75rem;
		background: #16213e;
		border-radius: 8px;
		margin-bottom: 0.5rem;
	}

	.payment-row .from {
		color: #e94560;
		font-weight: 600;
	}

	.payment-row .arrow {
		color: #888;
	}

	.payment-row .to {
		color: #4caf50;
		font-weight: 600;
	}
</style>
