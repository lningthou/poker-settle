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
		minRaise,
		dealerIndex,
		activePlayerIndex,
		smallBlind,
		bigBlind,
		hostId,
		holeCards,
		errorMessage,
		handResult,
		showdownCards,
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
	import PokerTable from '$lib/components/PokerTable.svelte';
	import CardComponent from '$lib/components/Card.svelte';
	import { sounds, soundEnabled, toggleSound } from '$lib/sounds';

	const PARTY_HOST = 'localhost:1999';

	let buyInAmount = $state(1000);
	let buyInDollars = $state(10);
	let sbAmount = $state(5);
	let bbAmount = $state(10);
	let raiseAmount = $state(0);
	let showCopied = $state(false);
	let chatInput = $state('');
	let chatContainer: HTMLDivElement;
	let screenShake = $state(false);

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

	// Screen shake and sound on win
	$effect(() => {
		if ($handResult && $handResult.length > 0) {
			const isWinner = $handResult.some(r => r.playerId === $playerId);
			if (isWinner) {
				screenShake = true;
				sounds.winPot();
				setTimeout(() => screenShake = false, 500);
			}
		}
	});

	// Sound when it becomes your turn
	let wasMyTurn = false;
	$effect(() => {
		if ($isMyTurn && !wasMyTurn && $phase !== 'waiting' && $phase !== 'complete') {
			sounds.yourTurn();
		}
		wasMyTurn = $isMyTurn;
	});

	async function copyShareLink() {
		const link = `${window.location.origin}/room/${page.params.code}`;
		try {
			await navigator.clipboard.writeText(link);
			showCopied = true;
			setTimeout(() => (showCopied = false), 2000);
		} catch {
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

	function isCallAllIn(): boolean {
		const me = $myPlayer;
		if (!me) return false;
		return callAmount() >= me.chips;
	}

	function needsRebuy(): boolean {
		const me = $myPlayer;
		return me !== null && me.chips === 0 && $phase === 'complete';
	}

	let rebuyAmount = $state(1000);
	let showBetPanel = $state(false);

	function handleRebuy() {
		if (rebuyAmount > 0) {
			rebuy(rebuyAmount);
		}
	}

	function handleRaise() {
		if (raiseAmount > 0) {
			sounds.raise();
			raise(raiseAmount);
			raiseAmount = 0;
			showBetPanel = false;
		}
	}

	function handleFold() {
		sounds.fold();
		fold();
	}

	function handleCheck() {
		sounds.check();
		check();
	}

	function handleCall() {
		sounds.call();
		call();
	}

	function toggleBetPanel() {
		sounds.buttonClick();
		showBetPanel = !showBetPanel;
		if (showBetPanel) {
			// Default to min raise
			raiseAmount = $minRaise || $bigBlind;
		}
	}

	function setBetPreset(fraction: number) {
		const pot = $totalPot;
		const me = $myPlayer;
		if (!me) return;

		const minBet = $minRaise || $bigBlind;
		const betAmount = Math.floor(pot * fraction);
		// Clamp between min raise and max (all chips)
		raiseAmount = Math.max(minBet, Math.min(betAmount, me.chips));
	}

	function handleAllIn() {
		sounds.allIn();
		allIn();
		showBetPanel = false;
	}

	// Reset bet panel when turn changes
	$effect(() => {
		if (!$isMyTurn) {
			showBetPanel = false;
		}
	});

	function handleChatSubmit(e: Event) {
		e.preventDefault();
		if (chatInput.trim()) {
			sendChat(chatInput.trim());
			chatInput = '';
		}
	}

	function getPlayerName(id: string): string {
		return $players.find(p => p.id === id)?.name ?? '?';
	}
</script>

<svelte:head>
	<title>Room {page.params.code} - Poker Settle</title>
</svelte:head>

<div class="game-wrapper animated-bg" class:screen-shake={screenShake}>
	<!-- CRT Overlay -->
	<div class="crt-overlay"></div>

	<div class="game-container">
		<!-- Header -->
		<header class="header">
			<div class="room-info">
				<span class="room-code">{page.params.code}</span>
				<button class="btn btn-secondary btn-sm" onclick={copyShareLink}>
					{showCopied ? 'Copied!' : 'Share'}
				</button>
			</div>
			<div class="header-actions">
				<button
					class="btn btn-secondary btn-sm sound-toggle"
					onclick={toggleSound}
					title={$soundEnabled ? 'Mute sounds' : 'Enable sounds'}
				>
					{$soundEnabled ? 'SFX ON' : 'SFX OFF'}
				</button>
				{#if $isHost && $phase !== 'waiting'}
					<button class="btn btn-danger btn-sm" onclick={endSession}>End Session</button>
				{/if}
			</div>
		</header>

		<!-- Error Toast -->
		{#if $errorMessage}
			<div class="error-toast pop-in">{$errorMessage}</div>
		{/if}

		<!-- Settlement Screen -->
		{#if $settlement}
			<div class="settlement panel slide-up">
				<h2 class="text-xl text-gold">Session Settlement</h2>
				{#if $settlement.length === 0}
					<p class="settle-even text-green">Everyone broke even!</p>
				{:else}
					<div class="payments">
						{#each $settlement as payment, i}
							<div class="payment-row slide-up" style:animation-delay="{i * 100}ms">
								<span class="from text-red">{payment.from}</span>
								<span class="arrow">pays ${payment.amount}</span>
								<span class="to text-green">{payment.to}</span>
							</div>
						{/each}
					</div>
				{/if}
				<button class="btn btn-gold" onclick={() => goto('/')}>Back to Home</button>
			</div>

		<!-- Lobby / Waiting -->
		{:else if $phase === 'waiting'}
			<div class="lobby">
				<h2 class="text-xl text-center mb-4">Waiting for players...</h2>

				<div class="player-list">
					{#each $players as player}
						<div class="player-chip panel" class:host={player.id === $hostId}>
							<span class="player-name">{player.name}</span>
							{#if player.id === $hostId}
								<span class="host-badge">HOST</span>
							{/if}
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
					<div class="game-config panel">
						<h3 class="text-lg mb-4">Game Setup</h3>

						<div class="config-row">
							<label for="buyindollars">Buy-in ($)</label>
							<div class="stepper">
								<button class="step-btn" onclick={() => (buyInDollars = Math.max(1, buyInDollars - 5))}>-</button>
								<input id="buyindollars" type="number" bind:value={buyInDollars} min="1" step="5" />
								<button class="step-btn" onclick={() => (buyInDollars += 5)}>+</button>
							</div>
						</div>

						<div class="config-row">
							<label for="buyin">Starting Chips</label>
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
							class="btn btn-gold w-full mt-4"
							onclick={() => startGame(buyInAmount, sbAmount, bbAmount, buyInDollars)}
							disabled={$players.length < 2}
						>
							Start Game ({$players.length} players)
						</button>
					</div>
				{:else}
					<p class="waiting-text text-secondary text-center">Waiting for host to start the game...</p>
				{/if}
			</div>

		<!-- Active Game -->
		{:else}
			<PokerTable
				players={$players}
				myId={$playerId}
				communityCards={$communityCards}
				dealerIndex={$dealerIndex}
				activePlayerIndex={$activePlayerIndex}
				pots={$pots}
				phase={$phase}
				holeCards={$holeCards}
				smallBlind={$smallBlind}
				bigBlind={$bigBlind}
				showdownCards={$showdownCards}
				showdown={$phase === 'showdown' || $phase === 'complete'}
			>
				<!-- Hand Result Overlay -->
				{#if $handResult && $phase === 'complete'}
					<div class="hand-result panel glow-gold slide-up">
						{#each $handResult as result}
							<div class="winner-line">
								<span class="winner-name">{getPlayerName(result.playerId)}</span>
								<span class="winner-amount">wins {result.amount}</span>
								{#if result.hand}
									<span class="winner-hand">({result.hand})</span>
								{/if}
							</div>
						{/each}
						{#if $nextHandCountdown}
							<div class="countdown">Next hand in {$nextHandCountdown}...</div>
						{/if}
					</div>
				{/if}
			</PokerTable>

			<!-- Rebuy prompt when busted -->
			{#if needsRebuy()}
				<div class="rebuy-prompt panel glow-gold slide-up">
					<h3 class="text-lg text-gold text-center mb-4">Out of Chips!</h3>
					<p class="text-secondary text-center mb-4">Rebuy to continue playing</p>
					<div class="rebuy-controls">
						<div class="stepper">
							<button class="step-btn" onclick={() => (rebuyAmount = Math.max(100, rebuyAmount - 100))}>-</button>
							<input type="number" bind:value={rebuyAmount} min="100" step="100" />
							<button class="step-btn" onclick={() => (rebuyAmount += 100)}>+</button>
						</div>
						<button class="btn btn-gold" onclick={handleRebuy}>
							Rebuy {rebuyAmount} Chips
						</button>
					</div>
				</div>
			{/if}

			<!-- Betting Controls -->
			{#if $isMyTurn && $phase !== 'complete'}
				<div class="controls panel">
					<div class="action-buttons">
						<button class="btn btn-danger" onclick={handleFold}>Fold</button>
						{#if canCheck()}
							<button class="btn btn-blue" onclick={handleCheck}>Check</button>
						{:else if isCallAllIn()}
							<button class="btn btn-gold" onclick={handleCall}>
								Call {callAmount()} (All In)
							</button>
						{:else}
							<button class="btn btn-blue" onclick={handleCall}>
								Call {callAmount()}
							</button>
						{/if}
						{#if !isCallAllIn()}
							<button
								class="btn btn-green"
								class:active={showBetPanel}
								onclick={toggleBetPanel}
							>
								{$currentBet > 0 ? 'Raise' : 'Bet'}
							</button>
						{/if}
					</div>

					<!-- Bet/Raise Panel -->
					{#if showBetPanel && !isCallAllIn()}
						<div class="bet-panel slide-up">
							<div class="bet-presets">
								<button class="preset-btn" onclick={() => setBetPreset(0.25)}>1/4</button>
								<button class="preset-btn" onclick={() => setBetPreset(0.5)}>1/2</button>
								<button class="preset-btn" onclick={() => setBetPreset(0.75)}>3/4</button>
								<button class="preset-btn" onclick={() => setBetPreset(1)}>Pot</button>
								<button class="preset-btn allin" onclick={handleAllIn}>All In</button>
							</div>
							<div class="bet-slider">
								<input
									type="range"
									min={$minRaise || $bigBlind}
									max={$myPlayer?.chips ?? 0}
									step={$bigBlind}
									bind:value={raiseAmount}
								/>
								<div class="slider-labels">
									<span>{$minRaise || $bigBlind}</span>
									<span>{$myPlayer?.chips ?? 0}</span>
								</div>
							</div>
							<div class="bet-confirm">
								<input type="number" bind:value={raiseAmount} min={$minRaise || $bigBlind} />
								<button class="btn btn-gold" onclick={handleRaise} disabled={raiseAmount <= 0}>
									{$currentBet > 0 ? 'Raise' : 'Bet'} {raiseAmount}
								</button>
							</div>
						</div>
					{/if}
				</div>
			{/if}

			<!-- Chat -->
			<div class="chat-section panel">
				<div class="chat-messages hide-scrollbar" bind:this={chatContainer}>
					{#each $chatMessages as msg}
						<div class="chat-msg" class:mine={msg.senderId === $playerId}>
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
					<button type="submit" class="btn btn-primary btn-sm" disabled={!chatInput.trim()}>Send</button>
				</form>
			</div>
		{/if}
	</div>
</div>

<style>
	.game-wrapper {
		min-height: 100dvh;
		padding: var(--space-4);
	}

	.game-container {
		max-width: 800px;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	/* Header */
	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--space-3);
		background: var(--bg-panel);
		border: 3px solid var(--border-color);
		border-radius: var(--card-border-radius);
	}

	.room-info {
		display: flex;
		align-items: center;
		gap: var(--space-3);
	}

	.room-code {
		font-size: 18px;
		color: var(--text-secondary);
		text-transform: uppercase;
		letter-spacing: 2px;
	}

	.header-actions {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.sound-toggle {
		font-size: 12px;
		padding: var(--space-1) var(--space-2);
		opacity: 0.8;
	}

	.sound-toggle:hover {
		opacity: 1;
	}

	/* Error Toast */
	.error-toast {
		background: var(--accent-red);
		color: white;
		padding: var(--space-3);
		border-radius: var(--card-border-radius);
		text-align: center;
		border: 3px solid #d94a40;
		box-shadow: 0 0 20px var(--shadow-red);
	}

	/* Lobby */
	.lobby {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.player-list {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-3);
		justify-content: center;
	}

	.player-chip {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-2) var(--space-4);
		position: relative;
	}

	.player-chip.host {
		border-color: var(--accent-gold);
	}

	.player-chip .player-name {
		font-size: 14px;
		text-transform: uppercase;
	}

	.host-badge {
		background: var(--accent-gold);
		color: #1a1a1a;
		font-size: 10px;
		padding: 2px 6px;
		border-radius: 3px;
		font-weight: bold;
	}

	.kick-btn {
		display: none;
		width: 24px;
		height: 24px;
		border: 2px solid var(--accent-red);
		border-radius: 50%;
		background: transparent;
		color: var(--accent-red);
		font-size: 16px;
		cursor: pointer;
		align-items: center;
		justify-content: center;
	}

	.player-chip:hover .kick-btn {
		display: flex;
	}

	.kick-btn:hover {
		background: var(--accent-red);
		color: white;
	}

	/* Game Config */
	.game-config {
		max-width: 400px;
		margin: 0 auto;
	}

	.config-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--space-3);
	}

	.config-row label {
		color: var(--text-secondary);
		font-size: 14px;
	}

	.stepper {
		display: flex;
		align-items: center;
		gap: var(--space-1);
	}

	.step-btn {
		width: 36px;
		height: 36px;
		border: 3px solid var(--border-color);
		border-radius: 6px;
		background: var(--bg-panel-dark);
		color: var(--text-primary);
		font-size: 20px;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all var(--anim-fast) ease;
	}

	.step-btn:hover {
		background: var(--bg-secondary);
		border-color: var(--accent-blue);
	}

	.step-btn:active {
		transform: scale(0.95);
	}

	.config-row input[type="number"] {
		width: 80px;
		text-align: center;
		font-size: 16px;
		font-weight: bold;
	}

	.waiting-text {
		margin-top: var(--space-4);
	}

	/* Hand Result */
	.hand-result {
		text-align: center;
		margin-top: var(--space-4);
	}

	.winner-line {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: var(--space-2);
		margin-bottom: var(--space-2);
	}

	.winner-name {
		color: var(--accent-gold);
		font-weight: bold;
	}

	.winner-amount {
		color: var(--accent-green);
	}

	.winner-hand {
		color: var(--text-secondary);
	}

	.countdown {
		color: var(--text-muted);
		font-size: 14px;
		margin-top: var(--space-2);
	}

	/* Rebuy Prompt */
	.rebuy-prompt {
		margin-top: var(--space-4);
	}

	.rebuy-controls {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		align-items: center;
	}

	.rebuy-controls .stepper {
		display: flex;
		align-items: center;
		gap: var(--space-1);
	}

	.rebuy-controls .stepper input {
		width: 100px;
		text-align: center;
		font-size: 18px;
		font-weight: bold;
	}

	.rebuy-controls .btn {
		width: 100%;
		max-width: 250px;
	}

	/* Controls */
	.controls {
		margin-top: var(--space-4);
	}

	.action-buttons {
		display: flex;
		gap: var(--space-3);
	}

	.action-buttons .btn {
		flex: 1;
	}

	.action-buttons .btn.active {
		box-shadow: 0 0 15px var(--accent-green), 0 4px 0 #2d8060;
	}

	/* Bet Panel */
	.bet-panel {
		margin-top: var(--space-4);
		padding-top: var(--space-4);
		border-top: 2px solid var(--border-color);
	}

	.bet-presets {
		display: flex;
		gap: var(--space-2);
		margin-bottom: var(--space-4);
		flex-wrap: wrap;
	}

	.preset-btn {
		flex: 1;
		min-width: 50px;
		padding: var(--space-2) var(--space-3);
		background: var(--bg-panel-dark);
		border: 2px solid var(--border-color);
		border-radius: 6px;
		color: var(--text-primary);
		font-family: inherit;
		font-size: 14px;
		font-weight: bold;
		cursor: pointer;
		transition: all var(--anim-fast) ease;
	}

	.preset-btn:hover {
		background: var(--bg-secondary);
		border-color: var(--accent-blue);
	}

	.preset-btn:active {
		transform: scale(0.95);
	}

	.preset-btn.allin {
		background: var(--accent-red);
		border-color: #d94a40;
		color: white;
	}

	.preset-btn.allin:hover {
		box-shadow: 0 0 10px var(--shadow-red);
	}

	.bet-slider {
		margin-bottom: var(--space-3);
	}

	.bet-slider input[type="range"] {
		width: 100%;
		margin-bottom: var(--space-1);
	}

	.slider-labels {
		display: flex;
		justify-content: space-between;
		font-size: 12px;
		color: var(--text-muted);
	}

	.bet-confirm {
		display: flex;
		gap: var(--space-3);
	}

	.bet-confirm input[type="number"] {
		flex: 1;
		font-size: 18px;
		font-weight: bold;
		text-align: center;
	}

	.bet-confirm .btn {
		min-width: 120px;
	}

	/* Chat */
	.chat-section {
		margin-top: var(--space-4);
		padding: 0;
		overflow: hidden;
	}

	.chat-messages {
		height: 120px;
		overflow-y: auto;
		padding: var(--space-3);
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.chat-msg {
		font-size: 14px;
	}

	.chat-name {
		color: var(--text-muted);
		font-weight: bold;
		margin-right: var(--space-1);
	}

	.chat-msg.mine .chat-name {
		color: var(--accent-blue);
	}

	.chat-text {
		color: var(--text-secondary);
	}

	.chat-msg.mine .chat-text {
		color: var(--text-primary);
	}

	.chat-empty {
		color: var(--text-muted);
		font-size: 14px;
		text-align: center;
		padding: var(--space-4);
	}

	.chat-input {
		display: flex;
		gap: var(--space-2);
		padding: var(--space-3);
		border-top: 2px solid var(--border-color);
		background: var(--bg-panel-dark);
	}

	.chat-input input {
		flex: 1;
		font-size: 14px;
	}

	/* Settlement */
	.settlement {
		text-align: center;
		padding: var(--space-6);
	}

	.settlement h2 {
		margin-bottom: var(--space-4);
	}

	.settle-even {
		font-size: 20px;
		margin-bottom: var(--space-4);
	}

	.payments {
		margin-bottom: var(--space-6);
	}

	.payment-row {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-3);
		padding: var(--space-3);
		background: var(--bg-panel-dark);
		border: 2px solid var(--border-color);
		border-radius: 6px;
		margin-bottom: var(--space-2);
	}

	.payment-row .from {
		font-weight: bold;
	}

	.payment-row .arrow {
		color: var(--text-secondary);
	}

	.payment-row .to {
		font-weight: bold;
	}

	/* Responsive */
	@media (max-width: 600px) {
		.game-wrapper {
			padding: var(--space-2);
		}

		.game-container {
			gap: var(--space-3);
		}

		.action-buttons {
			flex-direction: column;
		}
	}
</style>
