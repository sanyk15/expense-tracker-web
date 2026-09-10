// Модели данных — перенесены из Swift-структур приложения Finansy.
// Поля `user_id` в БД формируются на стороне Supabase (RLS), на клиенте их нет.

export interface Category {
  id: string;
  name: string;
  color: string; // HEX, например "#f97316"
  icon: string; // emoji
  sortOrder: number;
}

export interface Expense {
  id: string;
  amount: number;
  categoryId: string;
  date: string; // ISO 8601
  note: string;
}

export interface Income {
  id: string;
  amount: number;
  date: string; // ISO 8601
  note: string;
}

export interface CategoryBudget {
  id: string;
  categoryId: string;
  year: number;
  month: number; // 1–12
  limit: number;
}

// Предустановленные категории (совпадают с iOS-приложением).
export const DEFAULT_CATEGORIES: Array<{ name: string; icon: string; color: string }> = [
  { name: 'Еда', icon: '🍔', color: '#f97316' },
  { name: 'Транспорт', icon: '🚗', color: '#3b82f6' },
  { name: 'Развлечения', icon: '🎮', color: '#8b5cf6' },
  { name: 'Покупки', icon: '🛍️', color: '#ec4899' },
  { name: 'Здоровье', icon: '💊', color: '#ef4444' },
  { name: 'Коммунальные', icon: '🏠', color: '#14b8a6' },
  { name: 'Прочее', icon: '📌', color: '#6b7280' },
];
