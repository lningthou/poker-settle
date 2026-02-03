import { describe, it, expect } from 'vitest';
import { calculateSettlement, venmoDeepLink } from '../src/lib/settlement';

describe('Settlement Calculator', () => {
	it('should return no payments when everyone breaks even', () => {
		const balances = [
			{ id: 'p1', name: 'Alice', buyIn: 100, cashOut: 100 },
			{ id: 'p2', name: 'Bob', buyIn: 100, cashOut: 100 }
		];

		const payments = calculateSettlement(balances);
		expect(payments).toHaveLength(0);
	});

	it('should calculate a simple two-player settlement', () => {
		const balances = [
			{ id: 'p1', name: 'Alice', buyIn: 100, cashOut: 150 },
			{ id: 'p2', name: 'Bob', buyIn: 100, cashOut: 50 }
		];

		const payments = calculateSettlement(balances);
		expect(payments).toHaveLength(1);
		expect(payments[0]).toEqual({
			from: 'Bob',
			fromId: 'p2',
			to: 'Alice',
			toId: 'p1',
			amount: 50
		});
	});

	it('should minimize transactions for multiple players', () => {
		const balances = [
			{ id: 'p1', name: 'Alice', buyIn: 100, cashOut: 200 }, // won 100
			{ id: 'p2', name: 'Bob', buyIn: 100, cashOut: 50 }, // lost 50
			{ id: 'p3', name: 'Charlie', buyIn: 100, cashOut: 50 } // lost 50
		];

		const payments = calculateSettlement(balances);
		expect(payments).toHaveLength(2);

		const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
		expect(totalPaid).toBe(100); // total flow equals winner's gain
	});

	it('should handle complex multi-player settlement', () => {
		const balances = [
			{ id: 'p1', name: 'Alice', buyIn: 100, cashOut: 250 }, // +150
			{ id: 'p2', name: 'Bob', buyIn: 100, cashOut: 0 }, // -100
			{ id: 'p3', name: 'Charlie', buyIn: 100, cashOut: 120 }, // +20
			{ id: 'p4', name: 'Dave', buyIn: 100, cashOut: 30 } // -70
		];

		const payments = calculateSettlement(balances);

		// Verify total paid by debtors equals total received by creditors
		const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
		expect(totalPaid).toBe(170); // 100 + 70

		// All payments should go to winners
		for (const p of payments) {
			expect(['Alice', 'Charlie']).toContain(p.to);
			expect(['Bob', 'Dave']).toContain(p.from);
		}
	});

	it('should handle rebuys in buy-in calculation', () => {
		const balances = [
			{ id: 'p1', name: 'Alice', buyIn: 200, cashOut: 300 }, // bought in twice, net +100
			{ id: 'p2', name: 'Bob', buyIn: 100, cashOut: 0 } // net -100
		];

		const payments = calculateSettlement(balances);
		expect(payments).toHaveLength(1);
		expect(payments[0].amount).toBe(100);
	});
});

describe('Venmo Deep Link', () => {
	it('should generate correct deep link', () => {
		const link = venmoDeepLink('alice123', 50, 'Poker night settlement');
		expect(link).toContain('venmo://paycharge');
		expect(link).toContain('alice123');
		expect(link).toContain('amount=50');
		expect(link).toContain('Poker');
	});
});
