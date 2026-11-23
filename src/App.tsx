import { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import { Link, Navigate, Route, Routes, useLocation, type Location } from 'react-router-dom';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { Layout } from './components/Layout';
import { CandidatesPage } from './pages/CandidatesPage';
import { DashboardPage } from './pages/DashboardPage';
import { ExclusionsPage } from './pages/ExclusionsPage';
import { IndicatorsPage } from './pages/IndicatorsPage';
import { LoginPage } from './pages/LoginPage';
import { NewReportPage } from './pages/NewReportPage';
import { RegisterPage } from './pages/RegisterPage';
import { ReportDetailPage } from './pages/ReportDetailPage';
import { ReportDocumentPage } from './pages/ReportDocumentPage';
import { ReportsPage } from './pages/ReportsPage';
import { UsersPage } from './pages/UsersPage';

function NotFound() {
  return (
    <div className="center-state">
      <h1 tabIndex={-1}>Página no encontrada</h1>
      <p>La ruta que buscas no existe.</p>
      <Link className="btn btn-outline" to="/panel">
        Ir al panel principal
      </Link>
    </div>
  );
}

function AnimatedRoutes() {
  const location = useLocation();
  const [displayed, setDisplayed] = useState<Location>(location);

  useEffect(() => {
    if (location.key === displayed.key) return;

    const update = () => flushSync(() => setDisplayed(location));
    const shiftFocus = () => {
      document.querySelector<HTMLElement>('h1[tabindex="-1"]')?.focus({ preventScroll: true });
    };

    if (!document.startViewTransition) {
      update();
      shiftFocus();
      return;
    }

    // El foco no lo mueve la API de transiciones: hay que llevarlo al encabezado
    // de la vista nueva para no abandonar a quien navega con teclado o lector.
    const transition = document.startViewTransition(update);
    void transition.finished.finally(shiftFocus);
  }, [location, displayed.key]);

  return (
    <Routes location={displayed}>
      <Route path="/" element={<Navigate to="/panel" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/panel" element={<DashboardPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/reports/new" element={<NewReportPage />} />
        <Route path="/reports/:id/informe" element={<ReportDocumentPage />} />
        <Route path="/reports/:id" element={<ReportDetailPage />} />
        <Route path="/indicators" element={<IndicatorsPage />} />
        <Route path="/indicators/:id/candidates" element={<CandidatesPage />} />
        <Route path="/exclusions" element={<ExclusionsPage />} />
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

export function App() {
  return <AnimatedRoutes />;
}
