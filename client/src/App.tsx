import { Switch, Route, Redirect } from "wouter";
import { useState, useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { useWebSocket } from "@/hooks/use-websocket";
import { LanguageProvider } from "@/hooks/use-language";
import { ThemeProvider } from "@/hooks/use-theme";
import { Sidebar } from "@/components/Sidebar";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { WifiOff, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

import FieldWorkerHome from "@/pages/FieldWorkerHome";
import AIResults from "@/pages/AIResults";
import Login from "@/pages/Login";
import RegisterPatient from "@/pages/RegisterPatient";
import ConductScreening from "@/pages/ConductScreening";
import SupervisorDashboard from "@/pages/SupervisorDashboard";
import PatientProfile from "@/pages/PatientProfile";
import PatientProgress from "@/pages/PatientProgress";
import InterventionPlanView from "@/pages/InterventionPlanView";
import KPIDashboard from "@/pages/KPIDashboard";
import AdminPanel from "@/pages/AdminPanel";
import FieldWorkersList from "@/pages/FieldWorkersList";
import PatientsList from "@/pages/PatientsList";
import AlertsDashboard from "@/pages/AlertsDashboard";
import ReportsPage from "@/pages/ReportsPage";
import MessagesInbox from "@/pages/MessagesInbox";
import CDPODashboard from "@/pages/CDPODashboard";
import DWCWEODashboard from "@/pages/DWCWEODashboard";
import HODashboard from "@/pages/HODashboard";
import NotFound from "@/pages/not-found";

// ws connection manager
function WebSocketManager() {
  const { user } = useAuth();
  useWebSocket(user?.id);
  return null;
}

function ProtectedRoute({ component: Component, allowedRoles }: { component: any, allowedRoles?: string[] }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Redirect to="/login" />;
  }

  const HOME_ROUTES = ['/field-worker/home', '/dashboard', '/cdpo-dashboard', '/dwcweo-dashboard', '/ho-dashboard', '/admin'];
  const [location] = useLocation();
  const isHome = HOME_ROUTES.includes(location);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto pt-14 md:pt-0 dashboard-surface">
        {!isHome && (
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm ml-4 mt-3 mb-0 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        )}
        <Component />
      </main>
    </div>
  );
}

function Router() {
  const ALL_ROLES = ['field_worker', 'supervisor', 'cdpo', 'dwcweo', 'higher_official', 'admin'];
  const OVERSIGHT_ROLES = ['supervisor', 'cdpo', 'dwcweo', 'higher_official', 'admin'];

  return (
    <Switch>
      <Route path="/login" component={Login} />

      <Route path="/field-worker/home">
        <ProtectedRoute component={FieldWorkerHome} allowedRoles={['field_worker', 'supervisor', 'admin']} />
      </Route>
      <Route path="/field-worker/results/:id">
        <ProtectedRoute component={AIResults} allowedRoles={['field_worker', 'supervisor', 'admin']} />
      </Route>
      <Route path="/patients/new">
        <ProtectedRoute component={RegisterPatient} allowedRoles={['field_worker', 'supervisor', 'admin']} />
      </Route>
      <Route path="/screenings/new">
        <ProtectedRoute component={ConductScreening} allowedRoles={['field_worker', 'supervisor']} />
      </Route>

      <Route path="/patients/:id/progress">
        <ProtectedRoute component={PatientProgress} allowedRoles={ALL_ROLES} />
      </Route>
      <Route path="/intervention-plans/:patientId">
        <ProtectedRoute component={InterventionPlanView} allowedRoles={ALL_ROLES} />
      </Route>
      <Route path="/patients/:id">
        <ProtectedRoute component={PatientProfile} allowedRoles={ALL_ROLES} />
      </Route>
      <Route path="/patients">
        <ProtectedRoute component={PatientsList} allowedRoles={ALL_ROLES} />
      </Route>

      <Route path="/dashboard">
        <ProtectedRoute component={SupervisorDashboard} allowedRoles={['supervisor', 'admin']} />
      </Route>
      <Route path="/field-workers">
        <ProtectedRoute component={FieldWorkersList} allowedRoles={OVERSIGHT_ROLES} />
      </Route>

      <Route path="/cdpo-dashboard">
        <ProtectedRoute component={CDPODashboard} allowedRoles={['cdpo', 'dwcweo', 'higher_official', 'admin']} />
      </Route>
      <Route path="/dwcweo-dashboard">
        <ProtectedRoute component={DWCWEODashboard} allowedRoles={['dwcweo', 'higher_official', 'admin']} />
      </Route>
      <Route path="/ho-dashboard">
        <ProtectedRoute component={HODashboard} allowedRoles={['higher_official', 'admin']} />
      </Route>

      <Route path="/messages">
        <ProtectedRoute component={MessagesInbox} allowedRoles={ALL_ROLES} />
      </Route>

      <Route path="/alerts">
        <ProtectedRoute component={AlertsDashboard} allowedRoles={OVERSIGHT_ROLES} />
      </Route>

      <Route path="/reports">
        <ProtectedRoute component={ReportsPage} allowedRoles={['cdpo', 'dwcweo', 'higher_official', 'admin']} />
      </Route>

      <Route path="/analytics">
        <ProtectedRoute component={KPIDashboard} allowedRoles={['supervisor', 'cdpo', 'dwcweo', 'higher_official', 'admin']} />
      </Route>

      <Route path="/admin">
        <ProtectedRoute component={AdminPanel} allowedRoles={['admin']} />
      </Route>

      <Route path="/">
        <Redirect to="/login" />
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine);
  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => { window.removeEventListener("offline", goOffline); window.removeEventListener("online", goOnline); };
  }, []);
  if (!offline) return null;
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white text-center py-1.5 text-sm font-medium flex items-center justify-center gap-2">
      <WifiOff className="w-4 h-4" /> You are offline — showing cached data
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
      <LanguageProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <OfflineBanner />
            <WebSocketManager />
            <TooltipProvider>
              <Toaster />
              <Router />
            </TooltipProvider>
          </AuthProvider>
        </QueryClientProvider>
      </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
