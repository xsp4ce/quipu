import { redirect } from '@sveltejs/kit';
import { formatDayLabel, homeHrefForDay, isValidDay, limaDayRange, shiftDay, todayInLima } from '#lib/dates.ts';
import { listExpensesBetween } from '#lib/server/movements.ts';
import { requireUser } from '#lib/server/session.ts';
import type { Currency } from '#lib/money.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const user = requireUser(locals);
	const today = todayInLima();
	const requestedDay = url.searchParams.get('day');

	if (requestedDay !== null && (!isValidDay(requestedDay) || requestedDay > today)) {
		redirect(303, '/');
	}

	const day = requestedDay ?? today;
	const { start, end } = limaDayRange(day);
	const expenses = await listExpensesBetween(user.id, start, end);

	const totals: Record<Currency, number> = { PEN: 0, USD: 0 };
	for (const expense of expenses) totals[expense.currency] += Math.abs(expense.amountCents);

	return {
		day,
		isToday: day === today,
		dayLabel: formatDayLabel(day, today),
		previousHref: homeHrefForDay(shiftDay(day, -1)),
		nextHref: day === today ? null : homeHrefForDay(shiftDay(day, 1)),
		expenses,
		totals
	};
};
