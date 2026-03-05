import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, ClipboardList, ShieldCheck, Mail, Lock, MapPin, Building2, Globe } from "lucide-react";
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
      <div className="w-full max-w-4xl grid md:grid-cols-2 gap-8 items-center">
        <Card className="border-2 shadow-xl bg-background">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl">Welcome</CardTitle>
            <CardDescription>Sign in to continue</CardDescription>
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
            <h1 className="text-4xl font-bold tracking-tight text-foreground mb-4">
              Community Health <br />
              <span className="text-primary">Management System</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              Empowering patient health care and detection through AI-assisted monitoring and insights.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
