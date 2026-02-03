import type { Card, Rank, Suit } from './types';

const SUITS: Suit[] = ['h', 'd', 'c', 's'];
const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];

export class Deck {
	private cards: Card[] = [];

	constructor() {
		this.reset();
	}

	reset(): void {
		this.cards = [];
		for (const suit of SUITS) {
			for (const rank of RANKS) {
				this.cards.push({ rank, suit });
			}
		}
		this.shuffle();
	}

	shuffle(): void {
		// Fisher-Yates shuffle
		for (let i = this.cards.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
		}
	}

	deal(count: number = 1): Card[] {
		if (count > this.cards.length) {
			throw new Error(`Cannot deal ${count} cards, only ${this.cards.length} remaining`);
		}
		return this.cards.splice(0, count);
	}

	get remaining(): number {
		return this.cards.length;
	}
}

/** Convert our Card to the string format pokersolver expects (e.g., "Ah", "Td") */
export function cardToPokersolverString(card: Card): string {
	return card.rank + card.suit.toLowerCase();
}
