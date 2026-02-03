/**
 * Sound effects using Web Audio API.
 * Simple retro-style tones - no external libraries needed.
 */

import { writable, get } from 'svelte/store';

// Sound enabled state (persisted to localStorage)
const STORAGE_KEY = 'poker-settle-sound-enabled';

function getInitialSoundState(): boolean {
	if (typeof window === 'undefined') return true;
	const stored = localStorage.getItem(STORAGE_KEY);
	return stored === null ? true : stored === 'true';
}

export const soundEnabled = writable(true);

// Initialize from localStorage on client
if (typeof window !== 'undefined') {
	soundEnabled.set(getInitialSoundState());
	soundEnabled.subscribe((value) => {
		localStorage.setItem(STORAGE_KEY, String(value));
	});
}

export function toggleSound(): void {
	soundEnabled.update((v) => !v);
}

// Audio context (lazy init)
let audioContext: AudioContext | null = null;

function getContext(): AudioContext {
	if (!audioContext) {
		audioContext = new AudioContext();
	}
	return audioContext;
}

// Simple tone generator
function playTone(
	frequency: number,
	duration: number,
	type: OscillatorType = 'square',
	volume: number = 0.3,
	decay: boolean = true
): void {
	if (typeof window === 'undefined') return;
	if (!get(soundEnabled)) return;

	try {
		const ctx = getContext();

		// Resume if suspended
		if (ctx.state === 'suspended') {
			ctx.resume();
		}

		const oscillator = ctx.createOscillator();
		const gainNode = ctx.createGain();

		oscillator.type = type;
		oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

		gainNode.gain.setValueAtTime(volume, ctx.currentTime);
		if (decay) {
			gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
		}

		oscillator.connect(gainNode);
		gainNode.connect(ctx.destination);

		oscillator.start(ctx.currentTime);
		oscillator.stop(ctx.currentTime + duration);
	} catch {
		// Ignore errors
	}
}

// Play a sequence of tones
function playSequence(
	notes: { freq: number; duration: number; delay: number }[],
	type: OscillatorType = 'square',
	volume: number = 0.2
): void {
	notes.forEach(({ freq, duration, delay }) => {
		setTimeout(() => playTone(freq, duration, type, volume), delay * 1000);
	});
}

// Sound definitions
export const sounds = {
	// Button click - short blip
	buttonClick: () => playTone(800, 0.05, 'square', 0.15),

	// Check - soft tap
	check: () => playTone(400, 0.08, 'sine', 0.2),

	// Fold - descending tone
	fold: () => {
		playTone(300, 0.15, 'sawtooth', 0.15);
		setTimeout(() => playTone(200, 0.2, 'sawtooth', 0.1), 50);
	},

	// Call - coin clink
	call: () => playSequence([
		{ freq: 1200, duration: 0.05, delay: 0 },
		{ freq: 1600, duration: 0.08, delay: 0.05 },
	], 'square', 0.2),

	// Raise - ascending notes
	raise: () => playSequence([
		{ freq: 600, duration: 0.08, delay: 0 },
		{ freq: 800, duration: 0.08, delay: 0.08 },
		{ freq: 1000, duration: 0.1, delay: 0.16 },
	], 'square', 0.2),

	// All-in - dramatic
	allIn: () => playSequence([
		{ freq: 200, duration: 0.2, delay: 0 },
		{ freq: 250, duration: 0.2, delay: 0.1 },
		{ freq: 300, duration: 0.3, delay: 0.2 },
		{ freq: 400, duration: 0.4, delay: 0.3 },
	], 'sawtooth', 0.25),

	// Your turn - attention chime
	yourTurn: () => playSequence([
		{ freq: 880, duration: 0.1, delay: 0 },
		{ freq: 1100, duration: 0.15, delay: 0.1 },
	], 'sine', 0.25),

	// Win pot - fanfare
	winPot: () => playSequence([
		{ freq: 523, duration: 0.15, delay: 0 },      // C
		{ freq: 659, duration: 0.15, delay: 0.15 },   // E
		{ freq: 784, duration: 0.15, delay: 0.3 },    // G
		{ freq: 1047, duration: 0.3, delay: 0.45 },   // C (octave)
	], 'square', 0.3),

	// Card deal
	cardDeal: () => playTone(600, 0.03, 'square', 0.1),

	// Card flip
	cardFlip: () => playSequence([
		{ freq: 800, duration: 0.03, delay: 0 },
		{ freq: 1200, duration: 0.05, delay: 0.03 },
	], 'square', 0.15),

	// Chip bet
	chipBet: () => playTone(1000, 0.06, 'square', 0.15),

	// Error
	error: () => playSequence([
		{ freq: 200, duration: 0.15, delay: 0 },
		{ freq: 150, duration: 0.2, delay: 0.1 },
	], 'sawtooth', 0.2),
};
