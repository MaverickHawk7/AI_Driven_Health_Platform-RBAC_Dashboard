import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/Sidebar";
import { ErrorBoundary } from "@/components/ErrorBoundary";

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

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
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

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
