export interface PlayerBalance {
	id: string;
	name: string;
	buyIn: number; // total money put in
	cashOut: number; // final chip count (money value)
}

export interface Payment {
	from: string; // player name
	fromId: string;
	to: string; // player name
	toId: string;
	amount: number;
}

/**
 * Calculate the minimum number of transactions to settle all debts.
 * Uses a greedy algorithm: repeatedly match the largest creditor with the largest debtor.
 */
export function calculateSettlement(balances: PlayerBalance[]): Payment[] {
	const netAmounts = balances.map((b) => ({
		id: b.id,
		name: b.name,
		net: b.cashOut - b.buyIn
	}));

	// Split into debtors (negative net) and creditors (positive net)
	const debtors = netAmounts.filter((p) => p.net < 0).map((p) => ({ ...p, net: -p.net })); // make positive for easier math
	const creditors = netAmounts.filter((p) => p.net > 0);

	const payments: Payment[] = [];

	// Sort descending by amount
	debtors.sort((a, b) => b.net - a.net);
	creditors.sort((a, b) => b.net - a.net);

	let di = 0;
	let ci = 0;

	while (di < debtors.length && ci < creditors.length) {
		const debtor = debtors[di];
		const creditor = creditors[ci];
		const amount = Math.min(debtor.net, creditor.net);

		if (amount > 0) {
			payments.push({
				from: debtor.name,
				fromId: debtor.id,
				to: creditor.name,
				toId: creditor.id,
				amount: Math.round(amount * 100) / 100 // round to cents
			});
		}

		debtor.net -= amount;
		creditor.net -= amount;

		if (debtor.net < 0.01) di++;
		if (creditor.net < 0.01) ci++;
	}

	return payments;
}

/**
 * Generate a Venmo deep link for a payment request.
 */
export function venmoDeepLink(recipientUsername: string, amount: number, note: string): string {
	return `venmo://paycharge?txn=pay&recipients=${encodeURIComponent(recipientUsername)}&amount=${amount}&note=${encodeURIComponent(note)}`;
}
