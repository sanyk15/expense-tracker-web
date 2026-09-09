// Утилиты для работы с датами и деньгами (русская локаль).

const dayFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  weekday: 'long',
});

const moneyFormatter = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

// 'YYYY-MM-DD' → '9 сентября 2026 г., среда'
export function formatDay(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  return dayFormatter.format(new Date(y, m - 1, d));
}

export function formatMoney(value: number): string {
  return moneyFormatter.format(value);
}

// Текущий день в виде 'YYYY-MM-DD' (локальное время)
export function todayKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
