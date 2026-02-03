import { describe, it, expect } from 'vitest';
import { Deck } from '../src/lib/engine/deck';

describe('Deck', () => {
	it('should have 52 cards on creation', () => {
		const deck = new Deck();
		expect(deck.remaining).toBe(52);
	});

	it('should deal the requested number of cards', () => {
		const deck = new Deck();
		const cards = deck.deal(5);
		expect(cards).toHaveLength(5);
		expect(deck.remaining).toBe(47);
	});

	it('should have unique cards', () => {
		const deck = new Deck();
		const all = deck.deal(52);
		const keys = all.map((c) => `${c.rank}${c.suit}`);
		const unique = new Set(keys);
		expect(unique.size).toBe(52);
	});

	it('should throw when dealing more cards than remaining', () => {
		const deck = new Deck();
		deck.deal(50);
		expect(() => deck.deal(5)).toThrow();
	});

	it('should reset and reshuffle', () => {
		const deck = new Deck();
		deck.deal(52);
		expect(deck.remaining).toBe(0);
		deck.reset();
		expect(deck.remaining).toBe(52);
	});

	it('should produce different orderings on shuffle (probabilistic)', () => {
		const deck1 = new Deck();
		const deck2 = new Deck();
		const cards1 = deck1.deal(52).map((c) => `${c.rank}${c.suit}`);
		const cards2 = deck2.deal(52).map((c) => `${c.rank}${c.suit}`);
		// Extremely unlikely to be identical
		expect(cards1.join(',')).not.toBe(cards2.join(','));
	});
});
