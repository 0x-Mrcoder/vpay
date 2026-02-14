import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ErrorBoundary from './components/common/ErrorBoundary';
import { PageSkeleton } from './components/common/Skeleton';

// Lazy load pages
const Dashboard = lazy(() => import('./pages/dashboard/Dashboard'));
const TenantsPage = lazy(() => import('./pages/tenants/TenantsPage'));
const TransactionsPage = lazy(() => import('./pages/transactions/TransactionsPage'));
const WebhooksPage = lazy(() => import('./pages/webhooks/WebhooksPage'));
const SettlementsPage = lazy(() => import('./pages/settlements/SettlementsPage'));
const FeesPage = lazy(() => import('./pages/fees/FeesPage'));
const RiskPage = lazy(() => import('./pages/risk/RiskPage'));
const SettingsPage = lazy(() => import('./pages/settings/SettingsPage'));
const ApiKeysPage = lazy(() => import('./pages/api-keys/ApiKeysPage'));
const CommunicationsPage = lazy(() => import('./pages/communications/CommunicationsPage'));
const ProfilePage = lazy(() => import('./pages/profile/ProfilePage'));
const HelpMessages = lazy(() => import('./pages/help/HelpMessages'));
const AdminsPage = lazy(() => import('./pages/admins/AdminsPage'));

const AuditLogsPage = lazy(() => import('./pages/audit/AuditLogsPage'));
const Login = lazy(() => import('./pages/auth/Login'));

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <h1 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h1>
        <p className="text-gray-600 mb-4">You do not have permission to access the admin portal.</p>
        <button
          onClick={() => window.location.href = '/login'}
          className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors"
        >
          Go to Login
        </button>
      </div>
    );
  }

  return <>{children}</>;
};

function AppRoutes() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route path="/" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
        <Route path="/communications" element={<ProtectedRoute><Layout><CommunicationsPage /></Layout></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
        <Route path="/tenants" element={<ProtectedRoute><Layout><TenantsPage /></Layout></ProtectedRoute>} />

        <Route path="/transactions" element={<ProtectedRoute><Layout><TransactionsPage /></Layout></ProtectedRoute>} />
        <Route path="/settlements" element={<ProtectedRoute><Layout><SettlementsPage /></Layout></ProtectedRoute>} />
        <Route path="/webhooks" element={<ProtectedRoute><Layout><WebhooksPage /></Layout></ProtectedRoute>} />
        <Route path="/api-keys" element={<ProtectedRoute><Layout><ApiKeysPage /></Layout></ProtectedRoute>} />
        <Route path="/fees" element={<ProtectedRoute><Layout><FeesPage /></Layout></ProtectedRoute>} />
        <Route path="/risk" element={<ProtectedRoute><Layout><RiskPage /></Layout></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Layout><SettingsPage /></Layout></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Layout><ProfilePage /></Layout></ProtectedRoute>} />
        <Route path="/help" element={<ProtectedRoute><Layout><HelpMessages /></Layout></ProtectedRoute>} />
        <Route path="/admins" element={<ProtectedRoute><Layout><AdminsPage /></Layout></ProtectedRoute>} />
        <Route path="/audit-logs" element={<ProtectedRoute><Layout><AuditLogsPage /></Layout></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}

import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ErrorBoundary>
          <Toaster position="top-right" />
          <AppRoutes />
        </ErrorBoundary>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
