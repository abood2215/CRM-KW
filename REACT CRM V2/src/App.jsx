import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './layouts/MainLayout';
import LoginPage from './pages/auth/LoginPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import Dashboard from './pages/dashboard/Dashboard';
import StatsPage from './pages/stats/StatsPage';
import PipelinePage from './pages/pipeline/PipelinePage';
import ContactsPage from './pages/contacts/ContactsPage';
import ContactDetailPage from './pages/contacts/ContactDetailPage';
import TasksPage from './pages/tasks/TasksPage';
import ContactListsPage from './pages/contactLists/ContactListsPage';
import WhatsappPage from './pages/whatsapp/WhatsappPage';
import TemplatesPage from './pages/templates/TemplatesPage';
import CampaignsPage from './pages/campaigns/CampaignsPage';
import CampaignReportPage from './pages/campaigns/CampaignReportPage';
import MessagesPage from './pages/messages/MessagesPage';
import NotificationsPage from './pages/notifications/NotificationsPage';
import SettingsPage from './pages/settings/SettingsPage';
import DrivePage from './pages/drive/DrivePage';
import ActivityLogPage from './pages/activityLog/ActivityLogPage';

// Default react-query retries 3x with backoff even on 4xx — during a backend slowdown this
// multiplies request volume across every mounted widget instead of failing fast.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        const status = error?.response?.status;
        if (status && status >= 400 && status < 500) return false;
        return failureCount < 2;
      },
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster position="top-center" />
      <BrowserRouter>
        <ErrorBoundary>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="stats" element={<StatsPage />} />
              <Route path="messages" element={<MessagesPage />} />
              <Route path="pipeline" element={<PipelinePage />} />
              <Route path="contacts" element={<ContactsPage />} />
              <Route path="contacts/:id" element={<ContactDetailPage />} />
              <Route path="tasks" element={<TasksPage />} />
              <Route path="contact-lists" element={<ContactListsPage />} />
              <Route path="whatsapp" element={<WhatsappPage />} />
              <Route path="templates" element={<TemplatesPage />} />
              <Route path="campaigns" element={<CampaignsPage />} />
              <Route path="campaigns/:id/report" element={<CampaignReportPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="drive" element={<DrivePage />} />
              <Route path="activity-log" element={<ActivityLogPage />} />
            </Route>
          </Routes>
        </ErrorBoundary>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
