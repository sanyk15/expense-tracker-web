import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Layout from './pages/Layout';
import Expenses from './pages/Expenses';
import Income from './pages/Income';
import Stats from './pages/Stats';
import Budgets from './pages/Budgets';
import Categories from './pages/Categories';
import CategoryDetail from './pages/CategoryDetail';

function Root() {
  const { session, loading } = useAuth();

  if (loading) {
    return <div className="splash">Загрузка…</div>;
  }

  if (!session) {
    return <Login />;
  }

  return <Layout />;
}

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Root />}>
            <Route index element={<Navigate to="/expenses" replace />} />
            <Route path="expenses" element={<Expenses />} />
            <Route path="income" element={<Income />} />
            <Route path="stats" element={<Stats />} />
            <Route path="budgets" element={<Budgets />} />
            <Route path="categories" element={<Categories />} />
            <Route path="category/:id" element={<CategoryDetail />} />
          </Route>
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
}
