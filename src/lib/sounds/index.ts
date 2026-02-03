/**
 * Sound effects manager using jsfxr for retro 8-bit sounds.
 * All sounds are generated programmatically - no audio files needed.
 *
 * Sound design inspired by Balatro's chunky, satisfying arcade aesthetic.
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

// Lazy-load jsfxr
import type { Sfxr } from 'jsfxr';

let sfxrInstance: Sfxr | null = null;

async function getSfxr(): Promise<Sfxr> {
	if (sfxrInstance) return sfxrInstance;
	const module = await import('jsfxr');
	sfxrInstance = module.sfxr;
	return sfxrInstance;
}

// Map sound names to jsfxr presets or custom params
// Presets: pickupCoin, laserShoot, explosion, powerUp, hitHurt, jump, blipSelect, synth, tone, click
type SoundConfig = { preset: string } | { params: object };

const SOUNDS: Record<string, SoundConfig> = {
	// Card dealing - quick blip
	cardDeal: { preset: 'blipSelect' },

	// Card flip - coin pickup sound
	cardFlip: { preset: 'pickupCoin' },

	// Chip/bet sound - coin
	chipBet: { preset: 'pickupCoin' },

	// Check - click
	check: { preset: 'click' },

	// Fold - hit/hurt (low)
	fold: { preset: 'hitHurt' },

	// Your turn - power up
	yourTurn: { preset: 'powerUp' },

	// Win pot - power up
	winPot: { preset: 'powerUp' },

	// All-in - explosion (dramatic)
	allIn: { preset: 'explosion' },

	// Button click - click
	buttonClick: { preset: 'click' },

	// Error - hit hurt
	error: { preset: 'hitHurt' },

	// Call - blip
	call: { preset: 'blipSelect' },

	// Raise - jump (ascending)
	raise: { preset: 'jump' },
};

type SoundName = keyof typeof SOUNDS;

// Cache generated audio data URLs
const audioCache: Map<string, string> = new Map();

/**
 * Play a sound effect by name.
 * Sounds are generated on first play and cached for performance.
 */
export async function playSound(name: SoundName): Promise<void> {
	// Skip if sound is disabled or we're on server
	if (typeof window === 'undefined') return;
	if (!get(soundEnabled)) return;

	try {
		const sfxr = await getSfxr();
		const config = SOUNDS[name];

		// Check cache first
		let dataUrl = audioCache.get(name);

		if (!dataUrl) {
			// Generate the sound
			let params: object;
			if ('preset' in config) {
				params = sfxr.generate(config.preset);
			} else {
				params = config.params;
			}

			const audio = sfxr.toAudio(params);
			dataUrl = audio.src;
			audioCache.set(name, dataUrl);
		}

		// Create new audio element and play
		const audio = new Audio(dataUrl);
		audio.volume = 0.4;
		await audio.play();
	} catch (err) {
		// Silently fail - sound effects are non-critical
		console.debug('Sound playback failed:', err);
	}
}

// Convenience functions for common sounds
export const sounds = {
	cardDeal: () => playSound('cardDeal'),
	cardFlip: () => playSound('cardFlip'),
	chipBet: () => playSound('chipBet'),
	check: () => playSound('check'),
	fold: () => playSound('fold'),
	yourTurn: () => playSound('yourTurn'),
	winPot: () => playSound('winPot'),
	allIn: () => playSound('allIn'),
	buttonClick: () => playSound('buttonClick'),
	error: () => playSound('error'),
	call: () => playSound('call'),
	raise: () => playSound('raise'),
};
