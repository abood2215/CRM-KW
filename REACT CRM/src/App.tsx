import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/useAuthStore';
import MainLayout from './layouts/MainLayout';
import LoginPage from './pages/auth/LoginPage';
import { Loader2 } from 'lucide-react';

// Lazy load pages for performance
const Dashboard = lazy(() => import('./pages/dashboard/Dashboard'));
const Pipeline = lazy(() => import('./pages/clients/Pipeline'));
const ClientsList = lazy(() => import('./pages/clients/ClientsList'));
const Messages = lazy(() => import('./pages/messages/MessagesPage'));
const Tasks = lazy(() => import('./pages/tasks/TasksPage'));
const Campaigns = lazy(() => import('./pages/campaigns/CampaignsPage'));
const Whatsapp = lazy(() => import('./pages/whatsapp/WhatsappPage'));
const Stats = lazy(() => import('./pages/stats/StatsPage'));
const Settings = lazy(() => import('./pages/settings/SettingsPage'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
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
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route 
              path="/login" 
              element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />} 
            />
            
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/pipeline" element={<ProtectedRoute><Pipeline /></ProtectedRoute>} />
            <Route path="/clients" element={<ProtectedRoute><ClientsList /></ProtectedRoute>} />
            <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
            <Route path="/tasks" element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
            <Route path="/campaigns" element={<ProtectedRoute><Campaigns /></ProtectedRoute>} />
            <Route path="/whatsapp" element={<ProtectedRoute><Whatsapp /></ProtectedRoute>} />
            <Route path="/stats" element={<ProtectedRoute><Stats /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
