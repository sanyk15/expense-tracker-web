import { useLayoutEffect, useRef } from 'react';
import type { TouchEvent } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Expenses from './Expenses';
import Income from './Income';
import Stats from './Stats';
import Budgets from './Budgets';
import Categories from './Categories';

const TABS = [
  { to: '/expenses', label: 'Расходы', icon: '💸' },
  { to: '/income', label: 'Доходы', icon: '💰' },
  { to: '/stats', label: 'Статистика', icon: '📊' },
  { to: '/budgets', label: 'Лимиты', icon: '🎯' },
  { to: '/categories', label: 'Категории', icon: '🗂️' },
];

const PAGES = [Expenses, Income, Stats, Budgets, Categories];

export default function Layout() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const carouselRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef<number | null>(null);
  const dragOffsetRef = useRef(0);

  const currentIndex = TABS.findIndex((t) => location.pathname === t.to);
  const isTab = currentIndex >= 0;

  // Устанавливаем позицию ленты при смене вкладки (до отрисовки, без мигания).
  useLayoutEffect(() => {
    if (isTab && carouselRef.current) {
      carouselRef.current.style.transition = 'transform 0.25s cubic-bezier(0.22, 1, 0.36, 1)';
      carouselRef.current.style.transform = `translateX(${-currentIndex * 100}%)`;
    }
  }, [location.pathname, isTab, currentIndex]);

  function onTouchStart(e: TouchEvent<HTMLDivElement>) {
    startXRef.current = e.touches[0].clientX;
  }

  function onTouchMove(e: TouchEvent<HTMLDivElement>) {
    if (startXRef.current === null || !isTab) return;
    const idx = currentIndex;
    const dx = e.touches[0].clientX - startXRef.current;
    const maxRight = idx > 0 ? window.innerWidth : 0;
    const maxLeft = idx < TABS.length - 1 ? window.innerWidth : 0;
    const clamped = Math.max(-maxLeft, Math.min(maxRight, dx));
    dragOffsetRef.current = clamped;
    if (carouselRef.current) {
      carouselRef.current.style.transition = 'none';
      carouselRef.current.style.transform = `translateX(calc(${-idx * 100}% + ${clamped}px))`;
    }
  }

  function onTouchEnd() {
    if (startXRef.current === null) return;
    startXRef.current = null;
    const idx = currentIndex;
    const dx = dragOffsetRef.current;
    dragOffsetRef.current = 0;
    const threshold = window.innerWidth * 0.3;
    let newIdx = idx;
    if (dx < -threshold && idx < TABS.length - 1) newIdx = idx + 1;
    else if (dx > threshold && idx > 0) newIdx = idx - 1;
    if (carouselRef.current) {
      carouselRef.current.style.transition = 'transform 0.25s cubic-bezier(0.22, 1, 0.36, 1)';
      carouselRef.current.style.transform = `translateX(${-newIdx * 100}%)`;
    }
    if (newIdx !== idx) navigate(TABS[newIdx].to);
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <span className="app-title">Финансы</span>
        <div className="topbar-right">
          <Link to="/settings" className="icon-btn" aria-label="Настройки">
            ⚙️
          </Link>
          <button className="icon-btn" onClick={signOut} aria-label="Выйти">
            🚪
          </button>
        </div>
      </header>

      <main className="content">
        {isTab ? (
          <div
            className="carousel-viewport"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <div className="carousel" ref={carouselRef}>
              {PAGES.map((Page, i) => (
                <div className="carousel-page" key={i}>
                  <Page />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="detail-content">
            <Outlet />
          </div>
        )}
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
