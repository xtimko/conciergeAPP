import { Toaster } from 'sonner';
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
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
import Onboarding from '@/pages/Onboarding';

// Admin pages
import AdminDashboard from '@/pages/AdminDashboard';
import AdminOrders from '@/pages/AdminOrders';
import AdminClients from '@/pages/AdminClients';
import AdminFinance from '@/pages/AdminFinance';

function ProfileGate({ children }) {
  const location = useLocation();
  const { data: user, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-6 h-6 border-2 border-muted-foreground border-t-foreground rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return children;

  const needOnboarding = user.role !== 'admin' && user.profile_completed === false;
  if (needOnboarding && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }
  if (user.profile_completed && location.pathname === '/onboarding') {
    return <Navigate to="/Home" replace />;
  }
  return children;
}

const AppRoutes = () => {
  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  const isAdmin = user?.role === 'admin';

  return (
    <Routes>
      <Route path="/onboarding" element={<Onboarding />} />
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
          <Route path="/AdminFinance" element={<AdminFinance />} />
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
  const { isLoadingAuth, isLoadingPublicSettings, authError } = useAuth();

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
    }
    if (authError.type === 'auth_required') {
      // Не вызывать navigateToLogin() при рендере — иначе пустой экран в браузере.
      return (
        <div className="fixed inset-0 flex flex-col items-center justify-center bg-background p-6 text-center">
          <h1 className="mb-2 text-lg font-normal tracking-widest uppercase" style={{ fontFamily: "'Montserrat', sans-serif" }}>Concierge</h1>
          <p className="max-w-sm text-sm text-muted-foreground">
            Откройте приложение через <strong>Telegram</strong> (Mini App у бота). В обычном браузере вход недоступен.
          </p>
        </div>
      );
    }
  }

  return (
    <ThemeInitializer>
      <ProfileGate>
        <AppRoutes />
      </ProfileGate>
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
        <Toaster
          position="bottom-center"
          richColors
          closeButton
          offset={{ bottom: 'calc(5.5rem + env(safe-area-inset-bottom, 0px))' }}
          mobileOffset={{ bottom: 'calc(5.5rem + env(safe-area-inset-bottom, 0px))' }}
          className="!z-[10050]"
          toastOptions={{
            classNames: {
              toast: 'border border-border/60 bg-background text-foreground shadow-lg',
            },
          }}
        />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App