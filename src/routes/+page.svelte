<script lang="ts">
	import { goto } from '$app/navigation';

	let playerName = $state('');
	let roomCode = $state('');
	let mode = $state<'home' | 'create' | 'join'>('home');

	function generateRoomCode(): string {
		const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
		let code = '';
		for (let i = 0; i < 6; i++) {
			code += chars[Math.floor(Math.random() * chars.length)];
		}
		return code;
	}

	function createRoom() {
		if (!playerName.trim()) return;
		const code = generateRoomCode();
		goto(`/room/${code}?name=${encodeURIComponent(playerName.trim())}`);
	}

	function joinRoom() {
		if (!playerName.trim() || !roomCode.trim()) return;
		goto(`/room/${roomCode.trim().toLowerCase()}?name=${encodeURIComponent(playerName.trim())}`);
	}
</script>

<svelte:head>
	<title>Poker Settle</title>
</svelte:head>

<div class="container">
	<h1>Poker Settle</h1>
	<p class="subtitle">Play poker with friends. Settle up instantly.</p>

	{#if mode === 'home'}
		<div class="form-group">
			<label for="name">Your Name</label>
			<input
				id="name"
				type="text"
				bind:value={playerName}
				placeholder="Enter your name"
				maxlength="20"
			/>
		</div>

		<div class="buttons">
			<button class="btn primary" onclick={() => (mode = 'create')} disabled={!playerName.trim()}>
				Create Room
			</button>
			<button
				class="btn secondary"
				onclick={() => (mode = 'join')}
				disabled={!playerName.trim()}
			>
				Join Room
			</button>
		</div>
	{:else if mode === 'create'}
		<div class="form-group">
			<p>Creating room as <strong>{playerName}</strong></p>
		</div>
		<div class="buttons">
			<button class="btn primary" onclick={createRoom}>Create & Join</button>
			<button class="btn secondary" onclick={() => (mode = 'home')}>Back</button>
		</div>
	{:else if mode === 'join'}
		<div class="form-group">
			<label for="code">Room Code</label>
			<input
				id="code"
				type="text"
				bind:value={roomCode}
				placeholder="Enter 6-letter code"
				maxlength="6"
			/>
		</div>
		<div class="buttons">
			<button class="btn primary" onclick={joinRoom} disabled={!roomCode.trim()}>Join</button>
			<button class="btn secondary" onclick={() => (mode = 'home')}>Back</button>
		</div>
	{/if}
</div>

<style>
	:global(body) {
		margin: 0;
		font-family:
			-apple-system,
			BlinkMacSystemFont,
			'Segoe UI',
			Roboto,
			sans-serif;
		background: #1a1a2e;
		color: #eee;
		min-height: 100dvh;
	}

	.container {
		max-width: 400px;
		margin: 0 auto;
		padding: 2rem 1.5rem;
		text-align: center;
	}

	h1 {
		font-size: 2rem;
		margin-bottom: 0.25rem;
		color: #fff;
	}

	.subtitle {
		color: #888;
		margin-bottom: 2rem;
	}

	.form-group {
		margin-bottom: 1.5rem;
		text-align: left;
	}

	label {
		display: block;
		margin-bottom: 0.5rem;
		font-size: 0.875rem;
		color: #aaa;
	}

	input {
		width: 100%;
		padding: 0.75rem;
		border: 1px solid #333;
		border-radius: 8px;
		background: #16213e;
		color: #fff;
		font-size: 1rem;
		box-sizing: border-box;
	}

	input::placeholder {
		color: #555;
	}

	input:focus {
		outline: none;
		border-color: #e94560;
	}

	.buttons {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.btn {
		padding: 0.875rem;
		border: none;
		border-radius: 8px;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: opacity 0.15s;
	}

	.btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.btn.primary {
		background: #e94560;
		color: #fff;
	}

	.btn.primary:hover:not(:disabled) {
		background: #d63851;
	}

	.btn.secondary {
		background: #16213e;
		color: #aaa;
		border: 1px solid #333;
	}

	.btn.secondary:hover:not(:disabled) {
		background: #1a2745;
	}
</style>
