import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  User, ClipboardList, ShieldCheck, Mail, Lock, MapPin, Building2, Globe,
  Brain, Zap, Shield, Activity, FileText, HeartPulse,
} from "lucide-react";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

type Role = "field_worker" | "supervisor" | "cdpo" | "dwcweo" | "higher_official" | "admin";

const REDIRECT_MAP: Record<Role, string> = {
  field_worker: "/field-worker/home",
  supervisor: "/dashboard",
  cdpo: "/cdpo-dashboard",
  dwcweo: "/dwcweo-dashboard",
  higher_official: "/ho-dashboard",
  admin: "/admin",
};

export default function Login() {
  const { login, user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [loginRole, setLoginRole] = useState<Role | "">("");
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setLocation(REDIRECT_MAP[user.role as Role] || "/field-worker/home");
    }
  }, [user, setLocation]);

  const handleLogin = async () => {
    if (!loginRole || !loginUsername || !loginPassword) {
      toast({ title: "Missing fields", description: "Please select a role and enter your credentials.", variant: "destructive" });
      return;
    }
    setLoginLoading(true);
    try {
      await login(loginUsername, loginPassword);
    } catch (err: any) {
      toast({ title: "Login failed", description: err.message || "Invalid credentials.", variant: "destructive" });
    } finally {
      setLoginLoading(false);
    }
  };

  return (
    <div className="login-bg-pattern min-h-screen w-full flex items-center justify-center p-4">
      <div className="w-full max-w-5xl grid md:grid-cols-2 gap-16 items-center">
        <Card className="border shadow-xl bg-background border-t-4 border-t-primary">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl">Sign In</CardTitle>
            <CardDescription>Access your dashboard</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-role">Select Role</Label>
              <Select onValueChange={(v) => setLoginRole(v as Role)} value={loginRole}>
                <SelectTrigger id="login-role" className="h-11 bg-background">
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent className="bg-background">
                  <SelectItem value="field_worker">
                    <div className="flex items-center gap-2">
                      <ClipboardList className="w-4 h-4 text-blue-600" />
                      <span>Field Worker</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="supervisor">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-amber-600" />
                      <span>Supervisor</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="cdpo">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-teal-600" />
                      <span>CDPO</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="dwcweo">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-indigo-600" />
                      <span>DW&CW&EO</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="higher_official">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-violet-600" />
                      <span>Higher Official</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-gray-600" />
                      <span>Administrator</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="login-username">Username</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  id="login-username"
                  placeholder="Enter username"
                  className="pl-10 h-11"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="login-password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  id="login-password"
                  type="password"
                  placeholder="Enter password"
                  className="pl-10 h-11"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                />
              </div>
            </div>

            <Button className="w-full h-11 text-base" onClick={handleLogin} disabled={loginLoading}>
              {loginLoading ? "Signing in..." : "Sign In"}
            </Button>

          </CardContent>
        </Card>

        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <HeartPulse className="w-6 h-6 text-primary" />
              </div>
              <span className="text-sm font-medium text-muted-foreground tracking-wide uppercase">ICDS Health Platform</span>
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground mb-3">
              Intelligent Early Age <br />
              <span className="text-primary">Health Monitoring & Screening</span>
            </h1>
            <p className="text-muted-foreground">
              Intelligent child health screening, risk detection, and intervention tracking for ICDS field operations.
            </p>
          </div>

          <div className="space-y-3">
            {[
              { icon: Brain, text: "AI-driven multi-domain risk screening" },
              { icon: Activity, text: "Real-time alerts via WebSocket" },
              { icon: FileText, text: "FHIR R4 health data interoperability" },
              { icon: Shield, text: "6-tier role-based access control" },
              { icon: Lock, text: "AES-256-GCM encrypted patient PII" },
              { icon: Zap, text: "Predictive risk trajectory analysis" },
              { icon: ShieldCheck, text: "DPDP 2023 compliant data governance" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3 text-sm text-muted-foreground">
                <Icon className="w-4 h-4 text-primary/70 shrink-0" />
                <span>{text}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            {["FHIR R4", "RBAC", "WebSocket", "AES-256", "Audit Trail", "DPDP 2023"].map((tag) => (
              <span key={tag} className="text-xs px-2.5 py-1 rounded-full bg-primary/5 text-primary/70 border border-primary/10 font-medium">
                {tag}
              </span>
            ))}
          </div>

          <div className="pt-2 border-t border-border/50">
            <p className="text-xs text-muted-foreground/60">
              Demo credentials: <span className="font-mono text-muted-foreground/80">admin</span> / <span className="font-mono text-muted-foreground/80">admin123</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
