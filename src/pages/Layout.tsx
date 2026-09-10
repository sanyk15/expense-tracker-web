import { useRef } from 'react';
import type { TouchEvent } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const TABS = [
  { to: '/expenses', label: 'Расходы', icon: '💸' },
  { to: '/income', label: 'Доходы', icon: '💰' },
  { to: '/stats', label: 'Статистика', icon: '📊' },
  { to: '/budgets', label: 'Лимиты', icon: '🎯' },
  { to: '/categories', label: 'Категории', icon: '🗂️' },
];

export default function Layout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const touchStartX = useRef<number | null>(null);

  function onTouchStart(e: TouchEvent<HTMLElement>) {
    touchStartX.current = e.touches[0].clientX;
  }

  function onTouchEnd(e: TouchEvent<HTMLElement>) {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 60) return;

    const idx = TABS.findIndex((t) => location.pathname === t.to);
    if (idx < 0) return; // не на основной вкладке (настройки, детализация)
    const dir = dx < 0 ? 1 : -1; // свайп влево → следующая вкладка
    const next = idx + dir;
    if (next >= 0 && next < TABS.length) navigate(TABS[next].to);
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <span className="app-title">Finansy</span>
        <div className="topbar-right">
          <span className="user-email">{user?.email}</span>
          <Link to="/settings" className="icon-btn" aria-label="Настройки">
            ⚙️
          </Link>
          <button className="btn-ghost" onClick={signOut}>
            Выйти
          </button>
        </div>
      </header>

      <main className="content" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <Outlet />
      </main>

      <nav className="tabbar">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) => `tab${isActive ? ' active' : ''}`}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
