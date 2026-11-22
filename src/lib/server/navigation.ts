import { homeHrefForDay, toLimaDay } from '#lib/dates.ts';
import type { MovementTarget } from './movements';

export function hrefForTarget(target: MovementTarget): string {
	return target.kind === 'expense' ? homeHrefForDay(toLimaDay(target.occurredAt)) : `/accounts/${target.accountId}`;
}
