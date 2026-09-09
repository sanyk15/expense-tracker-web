import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const TABS = [
  { to: '/expenses', label: 'Расходы', icon: '💸' },
  { to: '/income', label: 'Доходы', icon: '💰' },
  { to: '/stats', label: 'Статистика', icon: '📊' },
  { to: '/budgets', label: 'Бюджеты', icon: '🎯' },
  { to: '/categories', label: 'Категории', icon: '🗂️' },
];

export default function Layout() {
  const { user, signOut } = useAuth();

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

      <main className="content">
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
