<script lang="ts">
	import { goto } from '$app/navigation';

	let playerName = $state('');
	let roomCode = $state('');
	let showJoinForm = $state(false);

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

<div class="home-wrapper animated-bg">
	<div class="crt-overlay"></div>

	<div class="container">
		<div class="logo-section">
			<h1 class="logo">Poker Settle</h1>
			<p class="subtitle">Play poker with friends. Settle up instantly.</p>
		</div>

		<div class="card-decoration">
			<span class="deco-card hearts">A</span>
			<span class="deco-card spades">K</span>
			<span class="deco-card diamonds">Q</span>
			<span class="deco-card clubs">J</span>
		</div>

		{#if !showJoinForm}
			<div class="form-section panel slide-up">
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
					<button
						class="btn btn-gold"
						onclick={createRoom}
						disabled={!playerName.trim()}
					>
						Create Room
					</button>
					<button
						class="btn btn-secondary"
						onclick={() => (showJoinForm = true)}
						disabled={!playerName.trim()}
					>
						Join Room
					</button>
				</div>
			</div>
		{:else}
			<div class="form-section panel slide-up">
				<div class="form-group">
					<label for="code">Room Code</label>
					<input
						id="code"
						type="text"
						bind:value={roomCode}
						placeholder="Enter 6-letter code"
						maxlength="6"
						class="code-input"
					/>
				</div>
				<div class="buttons">
					<button class="btn btn-blue" onclick={joinRoom} disabled={!roomCode.trim()}>Join Room</button>
					<button class="btn btn-secondary" onclick={() => (showJoinForm = false)}>Back</button>
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	.home-wrapper {
		min-height: 100dvh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--space-4);
	}

	.container {
		max-width: 400px;
		width: 100%;
		text-align: center;
	}

	.logo-section {
		margin-bottom: var(--space-6);
	}

	.logo {
		font-size: 40px;
		margin: 0 0 var(--space-2) 0;
		color: var(--text-primary);
		text-transform: uppercase;
		letter-spacing: 4px;
		text-shadow:
			0 0 10px var(--shadow-gold),
			0 0 20px var(--shadow-gold),
			0 4px 0 var(--bg-panel-dark);
	}

	.subtitle {
		color: var(--text-secondary);
		margin: 0;
		font-size: 16px;
	}

	/* Decorative cards */
	.card-decoration {
		display: flex;
		justify-content: center;
		gap: var(--space-3);
		margin-bottom: var(--space-6);
	}

	.deco-card {
		width: 50px;
		height: 70px;
		background: linear-gradient(135deg, #f5f5f0 0%, #e8e8e0 100%);
		border: 3px solid #c0c0b0;
		border-radius: 6px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 28px;
		font-weight: bold;
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
		transition: transform var(--anim-fast) ease;
	}

	.deco-card:hover {
		transform: translateY(-8px) rotate(-5deg);
	}

	.deco-card.hearts { color: var(--suit-hearts); }
	.deco-card.diamonds { color: var(--suit-diamonds); }
	.deco-card.clubs { color: var(--suit-clubs); }
	.deco-card.spades { color: var(--suit-spades); }

	.deco-card:nth-child(1) { animation-delay: 0ms; }
	.deco-card:nth-child(2) { animation-delay: 50ms; }
	.deco-card:nth-child(3) { animation-delay: 100ms; }
	.deco-card:nth-child(4) { animation-delay: 150ms; }

	/* Form section */
	.form-section {
		text-align: left;
	}

	.form-group {
		margin-bottom: var(--space-4);
	}

	.form-group label {
		display: block;
		margin-bottom: var(--space-2);
		font-size: 14px;
		color: var(--text-secondary);
		text-transform: uppercase;
		letter-spacing: 1px;
	}

	.form-group input {
		width: 100%;
		padding: var(--space-3);
		font-size: 16px;
		box-sizing: border-box;
	}

	.code-input {
		text-transform: lowercase;
		letter-spacing: 4px;
		text-align: center;
		font-size: 20px !important;
	}

	.buttons {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	/* Responsive */
	@media (max-width: 480px) {
		.logo {
			font-size: 32px;
			letter-spacing: 2px;
		}

		.deco-card {
			width: 40px;
			height: 56px;
			font-size: 22px;
		}
	}
</style>
