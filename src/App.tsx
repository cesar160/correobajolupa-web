import { Link, Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { NewReportPage } from './pages/NewReportPage';
import { RegisterPage } from './pages/RegisterPage';
import { ReportDetailPage } from './pages/ReportDetailPage';
import { ReportsPage } from './pages/ReportsPage';
import { UsersPage } from './pages/UsersPage';

function NotFound() {
  return (
    <div className="center-state">
      <h1 tabIndex={-1}>Página no encontrada</h1>
      <p>La ruta que buscas no existe.</p>
      <Link className="btn btn-outline" to="/reports">
        Ir a reportes
      </Link>
    </div>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/reports" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/reports/new" element={<NewReportPage />} />
        <Route path="/reports/:id" element={<ReportDetailPage />} />
        <Route
          path="/users"
          element={
            <ProtectedRoute roles={['admin']}>
              <UsersPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
