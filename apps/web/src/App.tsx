import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AppShell } from "@/components/layout/AppShell";
import { LoginPage } from "@/pages/LoginPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { QueriesPage } from "@/pages/QueriesPage";
import { StatsPage } from "@/pages/StatsPage";
import { BlocklistsPage } from "@/pages/BlocklistsPage";
import { RulesPage } from "@/pages/RulesPage";
import { DevicesPage } from "@/pages/DevicesPage";
import { DeviceDetailPage } from "@/pages/DeviceDetailPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { getToken } from "@/lib/api";
import { connectLiveWs } from "@/stores/live";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30000 } },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  if (!getToken()) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function LiveWsProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!getToken()) return;
    return connectLiveWs();
  }, []);
  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              element={
                <ProtectedRoute>
                  <LiveWsProvider>
                    <AppShell />
                  </LiveWsProvider>
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="requetes" element={<QueriesPage />} />
              <Route path="statistiques" element={<StatsPage />} />
              <Route path="listes" element={<BlocklistsPage />} />
              <Route path="regles" element={<RulesPage />} />
              <Route path="appareils" element={<DevicesPage />} />
              <Route path="appareils/:id" element={<DeviceDetailPage />} />
              <Route path="parametres" element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
