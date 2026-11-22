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
