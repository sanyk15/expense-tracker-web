// Периоды и работа с месяцами.

export interface DateRange {
  start: string; // 'YYYY-MM-DD', включительно
  end: string;
}

export function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function lastDays(n: number): DateRange {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (n - 1));
  return { start: dateKey(start), end: dateKey(end) };
}

export function currentMonth(): DateRange {
  const now = new Date();
  return {
    start: dateKey(new Date(now.getFullYear(), now.getMonth(), 1)),
    end: dateKey(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
  };
}

export function currentYear(): DateRange {
  const now = new Date();
  return {
    start: dateKey(new Date(now.getFullYear(), 0, 1)),
    end: dateKey(new Date(now.getFullYear(), 11, 31)),
  };
}

export interface YearMonth {
  year: number;
  month: number; // 1-12
}

export function currentYearMonth(): YearMonth {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export function addMonths(ym: YearMonth, delta: number): YearMonth {
  const d = new Date(ym.year, ym.month - 1 + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

const monthFormatter = new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' });

export function monthLabel(ym: YearMonth): string {
  return monthFormatter.format(new Date(ym.year, ym.month - 1, 1));
}
