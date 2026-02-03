declare module 'pokersolver' {
	export class Hand {
		name: string;
		descr: string;
		cards: { value: string; suit: string }[];
		rank: number;
		static solve(cards: string[], game?: string, canDisqualify?: boolean): Hand;
		static winners(hands: Hand[]): Hand[];
		toString(): string;
	}
}
