import { eq } from 'drizzle-orm';
import { db } from './db';
import { userSettings } from './db/schema';

const RATE_PATTERN = /^\d{1,3}(?:[.,]\d{1,4})?$/;

export async function getReferenceRate(userId: string): Promise<number | null> {
	const [settings] = await db
		.select({ rate: userSettings.usdPenReferenceRate })
		.from(userSettings)
		.where(eq(userSettings.userId, userId));
	return settings?.rate ? Number(settings.rate) : null;
}

export function parseReferenceRate(input: string): string | null | undefined {
	const value = input.trim().replace(',', '.');
	if (value === '') return null;
	if (!RATE_PATTERN.test(value) || Number(value) <= 0) return undefined;
	return value;
}

export async function saveReferenceRate(userId: string, rate: string | null) {
	await db
		.insert(userSettings)
		.values({ userId, usdPenReferenceRate: rate })
		.onConflictDoUpdate({
			target: userSettings.userId,
			set: { usdPenReferenceRate: rate, updatedAt: new Date() }
		});
}
