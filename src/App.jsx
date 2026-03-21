import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { ThemeProvider, useTheme } from '@/lib/ThemeContext';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

// Layouts
import ClientLayout from '@/components/layout/ClientLayout';
import AdminLayout from '@/components/layout/AdminLayout';

// Client pages
import Home from '@/pages/Home';
import Profile from '@/pages/Profile';
import Referral from '@/pages/Referral';
import Settings from '@/pages/Settings';

// Admin pages
import AdminDashboard from '@/pages/AdminDashboard';
import AdminOrders from '@/pages/AdminOrders';
import AdminClients from '@/pages/AdminClients';

const AppRoutes = () => {
  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  const isAdmin = user?.role === 'admin';

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/Home" replace />} />
      <Route element={<ClientLayout isAdmin={isAdmin} />}>
        <Route path="/Home" element={<Home />} />
        <Route path="/Profile" element={<Profile />} />
        <Route path="/Referral" element={<Referral />} />
        <Route path="/Settings" element={<Settings />} />
      </Route>
      {isAdmin && (
        <Route element={<AdminLayout />}>
          <Route path="/AdminDashboard" element={<AdminDashboard />} />
          <Route path="/AdminOrders" element={<AdminOrders />} />
          <Route path="/AdminClients" element={<AdminClients />} />
        </Route>
      )}
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

const ThemeInitializer = ({ children }) => {
  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  return (
    <ThemeProvider initialTheme={user?.theme || 'dark'} initialLang={user?.language || 'ru'}>
      {children}
    </ThemeProvider>
  );
};

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-lg font-normal tracking-widest uppercase mb-4" style={{ fontFamily: "'Montserrat', sans-serif" }}>Concierge</h1>
          <div className="w-6 h-6 border-2 border-muted-foreground border-t-foreground rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <ThemeInitializer>
      <AppRoutes />
    </ThemeInitializer>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App