import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/useAuthStore';
import MainLayout from './layouts/MainLayout';
import LoginPage from './pages/auth/LoginPage';
import ErrorBoundary from './components/ErrorBoundary';
import { Loader2 } from 'lucide-react';

// Lazy load pages for performance
const Dashboard = lazy(() => import('./pages/dashboard/Dashboard'));
const Pipeline = lazy(() => import('./pages/clients/Pipeline'));
const ClientsList = lazy(() => import('./pages/clients/ClientsList'));
const ClientDetail = lazy(() => import('./pages/clients/ClientDetailPage'));
const Messages = lazy(() => import('./pages/messages/MessagesPage'));
const Tasks = lazy(() => import('./pages/tasks/TasksPage'));
const Campaigns = lazy(() => import('./pages/campaigns/CampaignsPage'));
const CampaignReport = lazy(() => import('./pages/campaigns/CampaignReportPage'));
const Whatsapp = lazy(() => import('./pages/whatsapp/WhatsappPage'));
const Stats = lazy(() => import('./pages/stats/StatsPage'));
const Settings = lazy(() => import('./pages/settings/SettingsPage'));
const Contacts = lazy(() => import('./pages/contacts/ContactsPage'));
const Templates = lazy(() => import('./pages/templates/TemplatesPage'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: (failureCount, error: any) => {
        // Never retry on 4xx — only retry on network/5xx errors
        if (error?.response?.status >= 400 && error?.response?.status < 500) return false;
        return failureCount < 2;
      },
      staleTime: 30_000, // 30s — avoids redundant refetches when switching tabs
    },
    mutations: {
      retry: false,
    },
  },
});

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <MainLayout>{children}</MainLayout>;
};

const LoadingFallback = () => (
  <div className="flex h-screen w-full items-center justify-center bg-slate-50">
    <div className="flex flex-col items-center gap-4">
      <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
      <span className="text-sm font-medium text-slate-500 font-cairo">جاري التحميل...</span>
    </div>
  </div>
);

function App() {
  const [hydrated, setHydrated] = React.useState(false);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  React.useEffect(() => {
    // Check if store has hydrated from localStorage
    const checkHydration = async () => {
      // @ts-ignore
      await useAuthStore.persist.rehydrate();
      setHydrated(true);
    };
    checkHydration();
  }, []);

  if (!hydrated) {
    return <LoadingFallback />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Toaster position="top-center" reverseOrder={false} />
      <Router>
        <ErrorBoundary>
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route
                path="/login"
                element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />}
              />

              <Route path="/" element={<ProtectedRoute><ErrorBoundary><Dashboard /></ErrorBoundary></ProtectedRoute>} />
              <Route path="/pipeline" element={<ProtectedRoute><ErrorBoundary><Pipeline /></ErrorBoundary></ProtectedRoute>} />
              <Route path="/clients" element={<ProtectedRoute><ErrorBoundary><ClientsList /></ErrorBoundary></ProtectedRoute>} />
              <Route path="/clients/:id" element={<ProtectedRoute><ErrorBoundary><ClientDetail /></ErrorBoundary></ProtectedRoute>} />
              <Route path="/messages" element={<ProtectedRoute><ErrorBoundary><Messages /></ErrorBoundary></ProtectedRoute>} />
              <Route path="/tasks" element={<ProtectedRoute><ErrorBoundary><Tasks /></ErrorBoundary></ProtectedRoute>} />
              <Route path="/campaigns" element={<ProtectedRoute><ErrorBoundary><Campaigns /></ErrorBoundary></ProtectedRoute>} />
              <Route path="/campaigns/:id/report" element={<ProtectedRoute><ErrorBoundary><CampaignReport /></ErrorBoundary></ProtectedRoute>} />
              <Route path="/whatsapp" element={<ProtectedRoute><ErrorBoundary><Whatsapp /></ErrorBoundary></ProtectedRoute>} />
              <Route path="/stats" element={<ProtectedRoute><ErrorBoundary><Stats /></ErrorBoundary></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><ErrorBoundary><Settings /></ErrorBoundary></ProtectedRoute>} />
              <Route path="/contacts" element={<ProtectedRoute><ErrorBoundary><Contacts /></ErrorBoundary></ProtectedRoute>} />
              <Route path="/templates" element={<ProtectedRoute><ErrorBoundary><Templates /></ErrorBoundary></ProtectedRoute>} />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
