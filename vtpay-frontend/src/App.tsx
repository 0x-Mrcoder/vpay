import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthLayout } from './layouts/AuthLayout';
import { DashboardLayout } from './layouts/DashboardLayout';
import { Login } from './pages/auth/Login';
import { Register } from './pages/auth/Register';
import { VerifyEmail } from './pages/auth/VerifyEmail';
import { VerifyOtp } from './pages/auth/VerifyOtp';
import { Overview } from './pages/dashboard/Overview';
import { Wallet } from './pages/dashboard/Wallet';
import { VirtualAccounts } from './pages/dashboard/VirtualAccounts';
import { Transactions } from './pages/dashboard/Transactions';
import { Payout } from './pages/dashboard/Payout';
import { Developer } from './pages/dashboard/Developer';
import { Verification } from './pages/dashboard/Verification';
import { Settings } from './pages/dashboard/Settings';
import { Profile } from './pages/dashboard/Profile';
import { Help } from './pages/dashboard/Help';
import { ApiDocs } from './pages/public/ApiDocs';
import { LandingPage } from './pages/public/LandingPage';
import { Contact } from './pages/public/Contact';
import { About } from './pages/public/About';

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // KYC Level Checks
  // We now allow access to dashboard for all authenticated users
  // But we might want to prompt them to verify email if they haven't

  if (user?.kycLevel === 0 && location.pathname !== '/verify-email-prompt') {
    // Optional: Redirect to a prompt page, or just let them in with restrictions
    // For now, let's allow them in, but the dashboard will show "Test Mode"
  }

  return <>{children}</>;
};

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/about" element={<About />} />
      <Route path="/api-docs" element={<ApiDocs />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/verify-otp" element={<VerifyOtp />} />

      {/* Auth Routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>

      {/* Protected Dashboard Routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Overview />} />
        <Route path="wallet" element={<Wallet />} />
        <Route path="virtual-accounts" element={<VirtualAccounts />} />
        <Route path="transactions" element={<Transactions />} />
        <Route path="payout" element={<Payout />} />
        <Route path="developer" element={<Developer />} />
        <Route path="verification" element={<Verification />} />
        <Route path="settings" element={<Settings />} />
        <Route path="profile" element={<Profile />} />
        <Route path="help" element={<Help />} />
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
};

export default App;
