export const TIME_ZONE = 'America/Lima';

const LIMA_OFFSET = '-05:00';
const LIMA_OFFSET_MS = 5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DATE_TIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

const dayLabelFormatter = new Intl.DateTimeFormat('es-PE', {
	weekday: 'long',
	day: 'numeric',
	month: 'long',
	timeZone: 'UTC'
});

const timeFormatter = new Intl.DateTimeFormat('es-PE', {
	hour: '2-digit',
	minute: '2-digit',
	timeZone: TIME_ZONE
});

export function toLimaDateTimeInput(date: Date): string {
	return new Date(date.getTime() - LIMA_OFFSET_MS).toISOString().slice(0, 16);
}

export function toLimaDay(date: Date): string {
	return toLimaDateTimeInput(date).slice(0, 10);
}

export function todayInLima(): string {
	return toLimaDay(new Date());
}

export function parseLimaDateTimeInput(value: string): Date | null {
	if (!DATE_TIME_PATTERN.test(value)) return null;
	const date = new Date(`${value}:00${LIMA_OFFSET}`);
	return Number.isNaN(date.getTime()) ? null : date;
}

export function isValidDay(value: string): boolean {
	if (!DAY_PATTERN.test(value)) return false;
	const date = new Date(`${value}T00:00:00Z`);
	return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function limaDayRange(day: string): { start: Date; end: Date } {
	const start = new Date(`${day}T00:00:00${LIMA_OFFSET}`);
	return { start, end: new Date(start.getTime() + DAY_MS) };
}

export function shiftDay(day: string, offset: number): string {
	const date = new Date(`${day}T00:00:00Z`);
	return new Date(date.getTime() + offset * DAY_MS).toISOString().slice(0, 10);
}

export function formatDayLabel(day: string, today: string): string {
	if (day === today) return 'Hoy';
	if (day === shiftDay(today, -1)) return 'Ayer';
	return dayLabelFormatter.format(new Date(`${day}T12:00:00Z`));
}

export function formatTime(date: Date): string {
	return timeFormatter.format(date);
}

export function homeHrefForDay(day: string): string {
	return day === todayInLima() ? '/' : `/?day=${day}`;
}

function clampedDay(year: number, monthIndex: number, day: number): string {
	const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
	return new Date(Date.UTC(year, monthIndex, Math.min(day, lastDay))).toISOString().slice(0, 10);
}

function dayParts(day: string): { year: number; monthIndex: number; dayOfMonth: number } {
	const [year, month, dayOfMonth] = day.split('-').map(Number);
	return { year, monthIndex: month - 1, dayOfMonth };
}

export type CardCycle = {
	lastStatement: string;
	nextStatement: string;
	nextPaymentDue: string;
};

export function cardCycle(today: string, statementDay: number, paymentDueDay: number): CardCycle {
	const { year, monthIndex } = dayParts(today);
	const thisMonthStatement = clampedDay(year, monthIndex, statementDay);
	const lastStatement =
		thisMonthStatement <= today ? thisMonthStatement : clampedDay(year, monthIndex - 1, statementDay);
	const last = dayParts(lastStatement);
	const nextStatement = clampedDay(last.year, last.monthIndex + 1, statementDay);

	const sameMonthDue = clampedDay(last.year, last.monthIndex, paymentDueDay);
	const nextPaymentDue =
		sameMonthDue > lastStatement ? sameMonthDue : clampedDay(last.year, last.monthIndex + 1, paymentDueDay);

	return { lastStatement, nextStatement, nextPaymentDue };
}

const shortDayFormatter = new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short', timeZone: 'UTC' });

export function formatShortDay(day: string): string {
	return shortDayFormatter.format(new Date(`${day}T12:00:00Z`));
}

const dateTimeFormatter = new Intl.DateTimeFormat('es-PE', {
	day: 'numeric',
	month: 'short',
	hour: '2-digit',
	minute: '2-digit',
	timeZone: TIME_ZONE
});

export function formatDateTime(date: Date): string {
	return dateTimeFormatter.format(date);
}
