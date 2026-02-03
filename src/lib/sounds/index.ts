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

// jsfxr sound parameter definitions
// Each sound is carefully tuned for that Balatro chunky retro feel
// Parameters: https://github.com/chr15m/jsfxr
const SOUNDS: Record<string, object> = {
	// Card dealing - quick swoosh
	cardDeal: {
		oldParams: true,
		wave_type: 3, // noise
		p_env_attack: 0,
		p_env_sustain: 0.05,
		p_env_punch: 0.3,
		p_env_decay: 0.1,
		p_base_freq: 0.3,
		p_freq_limit: 0,
		p_freq_ramp: -0.3,
		p_freq_dramp: 0,
		p_vib_strength: 0,
		p_vib_speed: 0,
		p_arp_mod: 0,
		p_arp_speed: 0,
		p_duty: 0,
		p_duty_ramp: 0,
		p_repeat_speed: 0,
		p_pha_offset: 0,
		p_pha_ramp: 0,
		p_lpf_freq: 0.5,
		p_lpf_ramp: -0.1,
		p_lpf_resonance: 0,
		p_hpf_freq: 0.1,
		p_hpf_ramp: 0,
		sound_vol: 0.25,
		sample_rate: 44100,
		sample_size: 8,
	},

	// Card flip - satisfying pop
	cardFlip: {
		oldParams: true,
		wave_type: 1, // square
		p_env_attack: 0,
		p_env_sustain: 0.02,
		p_env_punch: 0.4,
		p_env_decay: 0.15,
		p_base_freq: 0.5,
		p_freq_limit: 0,
		p_freq_ramp: 0.2,
		p_freq_dramp: 0,
		p_vib_strength: 0,
		p_vib_speed: 0,
		p_arp_mod: 0,
		p_arp_speed: 0,
		p_duty: 0.5,
		p_duty_ramp: 0,
		p_repeat_speed: 0,
		p_pha_offset: 0,
		p_pha_ramp: 0,
		p_lpf_freq: 1,
		p_lpf_ramp: 0,
		p_lpf_resonance: 0,
		p_hpf_freq: 0,
		p_hpf_ramp: 0,
		sound_vol: 0.2,
		sample_rate: 44100,
		sample_size: 8,
	},

	// Chip/bet sound - coin clink
	chipBet: {
		oldParams: true,
		wave_type: 1, // square
		p_env_attack: 0,
		p_env_sustain: 0.03,
		p_env_punch: 0.5,
		p_env_decay: 0.2,
		p_base_freq: 0.6,
		p_freq_limit: 0,
		p_freq_ramp: -0.15,
		p_freq_dramp: 0,
		p_vib_strength: 0,
		p_vib_speed: 0,
		p_arp_mod: 0.4,
		p_arp_speed: 0.6,
		p_duty: 0.5,
		p_duty_ramp: 0,
		p_repeat_speed: 0,
		p_pha_offset: 0,
		p_pha_ramp: 0,
		p_lpf_freq: 1,
		p_lpf_ramp: 0,
		p_lpf_resonance: 0,
		p_hpf_freq: 0.1,
		p_hpf_ramp: 0,
		sound_vol: 0.25,
		sample_rate: 44100,
		sample_size: 8,
	},

	// Check - soft tap
	check: {
		oldParams: true,
		wave_type: 3, // noise
		p_env_attack: 0,
		p_env_sustain: 0.01,
		p_env_punch: 0.2,
		p_env_decay: 0.05,
		p_base_freq: 0.4,
		p_freq_limit: 0,
		p_freq_ramp: -0.2,
		p_freq_dramp: 0,
		p_vib_strength: 0,
		p_vib_speed: 0,
		p_arp_mod: 0,
		p_arp_speed: 0,
		p_duty: 0,
		p_duty_ramp: 0,
		p_repeat_speed: 0,
		p_pha_offset: 0,
		p_pha_ramp: 0,
		p_lpf_freq: 0.6,
		p_lpf_ramp: 0,
		p_lpf_resonance: 0,
		p_hpf_freq: 0.2,
		p_hpf_ramp: 0,
		sound_vol: 0.15,
		sample_rate: 44100,
		sample_size: 8,
	},

	// Fold - low thud/swoosh
	fold: {
		oldParams: true,
		wave_type: 3, // noise
		p_env_attack: 0,
		p_env_sustain: 0.08,
		p_env_punch: 0.1,
		p_env_decay: 0.2,
		p_base_freq: 0.15,
		p_freq_limit: 0,
		p_freq_ramp: -0.2,
		p_freq_dramp: 0,
		p_vib_strength: 0,
		p_vib_speed: 0,
		p_arp_mod: 0,
		p_arp_speed: 0,
		p_duty: 0,
		p_duty_ramp: 0,
		p_repeat_speed: 0,
		p_pha_offset: 0,
		p_pha_ramp: 0,
		p_lpf_freq: 0.3,
		p_lpf_ramp: -0.1,
		p_lpf_resonance: 0,
		p_hpf_freq: 0,
		p_hpf_ramp: 0,
		sound_vol: 0.2,
		sample_rate: 44100,
		sample_size: 8,
	},

	// Your turn - attention chime
	yourTurn: {
		oldParams: true,
		wave_type: 0, // sine
		p_env_attack: 0,
		p_env_sustain: 0.1,
		p_env_punch: 0,
		p_env_decay: 0.3,
		p_base_freq: 0.5,
		p_freq_limit: 0,
		p_freq_ramp: 0.1,
		p_freq_dramp: 0,
		p_vib_strength: 0,
		p_vib_speed: 0,
		p_arp_mod: 0.3,
		p_arp_speed: 0.5,
		p_duty: 0,
		p_duty_ramp: 0,
		p_repeat_speed: 0,
		p_pha_offset: 0,
		p_pha_ramp: 0,
		p_lpf_freq: 1,
		p_lpf_ramp: 0,
		p_lpf_resonance: 0,
		p_hpf_freq: 0,
		p_hpf_ramp: 0,
		sound_vol: 0.2,
		sample_rate: 44100,
		sample_size: 8,
	},

	// Win pot - triumphant fanfare
	winPot: {
		oldParams: true,
		wave_type: 1, // square
		p_env_attack: 0,
		p_env_sustain: 0.15,
		p_env_punch: 0.3,
		p_env_decay: 0.4,
		p_base_freq: 0.4,
		p_freq_limit: 0,
		p_freq_ramp: 0.15,
		p_freq_dramp: 0,
		p_vib_strength: 0,
		p_vib_speed: 0,
		p_arp_mod: 0.5,
		p_arp_speed: 0.3,
		p_duty: 0.5,
		p_duty_ramp: 0,
		p_repeat_speed: 0.4,
		p_pha_offset: 0,
		p_pha_ramp: 0,
		p_lpf_freq: 1,
		p_lpf_ramp: 0,
		p_lpf_resonance: 0,
		p_hpf_freq: 0,
		p_hpf_ramp: 0,
		sound_vol: 0.3,
		sample_rate: 44100,
		sample_size: 8,
	},

	// All-in - dramatic tension
	allIn: {
		oldParams: true,
		wave_type: 2, // sawtooth
		p_env_attack: 0.1,
		p_env_sustain: 0.2,
		p_env_punch: 0.5,
		p_env_decay: 0.3,
		p_base_freq: 0.25,
		p_freq_limit: 0,
		p_freq_ramp: 0.2,
		p_freq_dramp: 0,
		p_vib_strength: 0.1,
		p_vib_speed: 0.3,
		p_arp_mod: 0,
		p_arp_speed: 0,
		p_duty: 0,
		p_duty_ramp: 0,
		p_repeat_speed: 0,
		p_pha_offset: 0,
		p_pha_ramp: 0,
		p_lpf_freq: 0.8,
		p_lpf_ramp: 0,
		p_lpf_resonance: 0.3,
		p_hpf_freq: 0,
		p_hpf_ramp: 0,
		sound_vol: 0.25,
		sample_rate: 44100,
		sample_size: 8,
	},

	// Button click - UI feedback
	buttonClick: {
		oldParams: true,
		wave_type: 1, // square
		p_env_attack: 0,
		p_env_sustain: 0.01,
		p_env_punch: 0.3,
		p_env_decay: 0.05,
		p_base_freq: 0.5,
		p_freq_limit: 0,
		p_freq_ramp: 0,
		p_freq_dramp: 0,
		p_vib_strength: 0,
		p_vib_speed: 0,
		p_arp_mod: 0,
		p_arp_speed: 0,
		p_duty: 0.5,
		p_duty_ramp: 0,
		p_repeat_speed: 0,
		p_pha_offset: 0,
		p_pha_ramp: 0,
		p_lpf_freq: 1,
		p_lpf_ramp: 0,
		p_lpf_resonance: 0,
		p_hpf_freq: 0.2,
		p_hpf_ramp: 0,
		sound_vol: 0.15,
		sample_rate: 44100,
		sample_size: 8,
	},

	// Error/invalid action
	error: {
		oldParams: true,
		wave_type: 2, // sawtooth
		p_env_attack: 0,
		p_env_sustain: 0.1,
		p_env_punch: 0,
		p_env_decay: 0.2,
		p_base_freq: 0.3,
		p_freq_limit: 0,
		p_freq_ramp: -0.2,
		p_freq_dramp: 0,
		p_vib_strength: 0.2,
		p_vib_speed: 0.5,
		p_arp_mod: 0,
		p_arp_speed: 0,
		p_duty: 0,
		p_duty_ramp: 0,
		p_repeat_speed: 0,
		p_pha_offset: 0,
		p_pha_ramp: 0,
		p_lpf_freq: 0.5,
		p_lpf_ramp: 0,
		p_lpf_resonance: 0,
		p_hpf_freq: 0,
		p_hpf_ramp: 0,
		sound_vol: 0.2,
		sample_rate: 44100,
		sample_size: 8,
	},

	// Call - similar to chip but slightly different
	call: {
		oldParams: true,
		wave_type: 1, // square
		p_env_attack: 0,
		p_env_sustain: 0.04,
		p_env_punch: 0.4,
		p_env_decay: 0.15,
		p_base_freq: 0.55,
		p_freq_limit: 0,
		p_freq_ramp: -0.1,
		p_freq_dramp: 0,
		p_vib_strength: 0,
		p_vib_speed: 0,
		p_arp_mod: 0.3,
		p_arp_speed: 0.5,
		p_duty: 0.5,
		p_duty_ramp: 0,
		p_repeat_speed: 0,
		p_pha_offset: 0,
		p_pha_ramp: 0,
		p_lpf_freq: 1,
		p_lpf_ramp: 0,
		p_lpf_resonance: 0,
		p_hpf_freq: 0.1,
		p_hpf_ramp: 0,
		sound_vol: 0.22,
		sample_rate: 44100,
		sample_size: 8,
	},

	// Raise - more impactful than call
	raise: {
		oldParams: true,
		wave_type: 1, // square
		p_env_attack: 0,
		p_env_sustain: 0.05,
		p_env_punch: 0.6,
		p_env_decay: 0.2,
		p_base_freq: 0.5,
		p_freq_limit: 0,
		p_freq_ramp: 0.1,
		p_freq_dramp: 0,
		p_vib_strength: 0,
		p_vib_speed: 0,
		p_arp_mod: 0.5,
		p_arp_speed: 0.4,
		p_duty: 0.5,
		p_duty_ramp: 0,
		p_repeat_speed: 0,
		p_pha_offset: 0,
		p_pha_ramp: 0,
		p_lpf_freq: 1,
		p_lpf_ramp: 0,
		p_lpf_resonance: 0,
		p_hpf_freq: 0.1,
		p_hpf_ramp: 0,
		sound_vol: 0.28,
		sample_rate: 44100,
		sample_size: 8,
	},
};

type SoundName = keyof typeof SOUNDS;

// Audio context and cache
let audioContext: AudioContext | null = null;
const audioCache: Map<string, AudioBuffer> = new Map();

// Lazy-load jsfxr
import type { Sfxr } from 'jsfxr';

let sfxrInstance: Sfxr | null = null;

async function getSfxr(): Promise<Sfxr> {
	if (sfxrInstance) return sfxrInstance;
	const module = await import('jsfxr');
	sfxrInstance = module.sfxr;
	return sfxrInstance;
}

function getAudioContext(): AudioContext {
	if (!audioContext) {
		audioContext = new AudioContext();
	}
	return audioContext;
}

/**
 * Play a sound effect by name.
 * Sounds are generated on first play and cached for performance.
 */
export async function playSound(name: SoundName): Promise<void> {
	// Skip if sound is disabled or we're on server
	if (typeof window === 'undefined') return;
	if (!get(soundEnabled)) return;

	try {
		const ctx = getAudioContext();

		// Resume audio context if suspended (browser autoplay policy)
		if (ctx.state === 'suspended') {
			await ctx.resume();
		}

		const soundDef = SOUNDS[name];
		const cacheKey = name;

		// Check cache first
		let buffer = audioCache.get(cacheKey);

		if (!buffer) {
			// Generate the sound using jsfxr
			const sfxr = await getSfxr();
			const audio = sfxr.toAudio(soundDef);

			// Convert to AudioBuffer for Web Audio API
			const response = await fetch(audio.src);
			const arrayBuffer = await response.arrayBuffer();
			buffer = await ctx.decodeAudioData(arrayBuffer);
			audioCache.set(cacheKey, buffer);
		}

		// Play the sound
		const source = ctx.createBufferSource();
		source.buffer = buffer;
		source.connect(ctx.destination);
		source.start(0);
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
