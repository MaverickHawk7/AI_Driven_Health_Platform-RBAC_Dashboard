import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  User, ClipboardList, ShieldCheck, Mail, Lock, MapPin, Building2, Globe,
  Brain, Zap, Shield, Activity, FileText, HeartPulse, Languages,
} from "lucide-react";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/use-language";

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
  const { t, setLang, lang } = useLanguage();

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
      toast({ title: t("Missing fields"), description: t("Please select a role and enter your credentials."), variant: "destructive" });
      return;
    }
    setLoginLoading(true);
    try {
      await login(loginUsername, loginPassword);
    } catch (err: any) {
      toast({ title: t("Login failed"), description: err.message || t("Invalid credentials."), variant: "destructive" });
    } finally {
      setLoginLoading(false);
    }
  };

  return (
    <div className="login-bg-pattern min-h-screen w-full flex items-center justify-center p-4 relative">
      {/* Language selector - top right */}
      <div className="absolute top-4 right-4 z-10">
        <Select value={lang} onValueChange={(v) => setLang(v as "en" | "te")}>
          <SelectTrigger className="w-[140px] h-9 bg-background/80 backdrop-blur border text-sm font-medium">
            <Languages className="w-4 h-4 mr-1.5 shrink-0" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-background">
            <SelectItem value="en">English</SelectItem>
            <SelectItem value="te">తెలుగు</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="w-full max-w-5xl grid md:grid-cols-2 gap-16 items-center">
        <Card className="border shadow-xl bg-background border-t-4 border-t-primary">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl">{t("Sign In")}</CardTitle>
            <CardDescription>{t("Access your dashboard")}</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-role">{t("Select Role")}</Label>
              <Select onValueChange={(v) => setLoginRole(v as Role)} value={loginRole}>
                <SelectTrigger id="login-role" className="h-11 bg-background">
                  <SelectValue placeholder={t("Select your role")} />
                </SelectTrigger>
                <SelectContent className="bg-background">
                  <SelectItem value="field_worker">
                    <div className="flex items-center gap-2">
                      <ClipboardList className="w-4 h-4 text-blue-600" />
                      <span>{t("Field Worker")}</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="supervisor">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-amber-600" />
                      <span>{t("Supervisor")}</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="cdpo">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-teal-600" />
                      <span>{t("CDPO")}</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="dwcweo">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-indigo-600" />
                      <span>{t("DW&CW&EO")}</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="higher_official">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-violet-600" />
                      <span>{t("Higher Official")}</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-gray-600" />
                      <span>{t("Administrator")}</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="login-username">{t("Username")}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  id="login-username"
                  placeholder={t("Enter username")}
                  className="pl-10 h-11"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="login-password">{t("Password")}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  id="login-password"
                  type="password"
                  placeholder={t("Enter password")}
                  className="pl-10 h-11"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                />
              </div>
            </div>

            <Button className="w-full h-11 text-base" onClick={handleLogin} disabled={loginLoading}>
              {loginLoading ? t("Signing in...") : t("Sign In")}
            </Button>


            <div className="rounded-md bg-muted/50 border border-border/50 px-3 py-2.5 text-xs text-muted-foreground">
              <p className="font-medium mb-1">{t("Demo Access")}</p>
              <p>Username is the role name (as shown in dropdown), password is <span className="font-mono font-medium">password</span></p>
              <p className="mt-1">e.g. Username: <span className="font-mono font-medium">field worker</span>, Password: <span className="font-mono font-medium">password</span></p>
            </div>

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
              {t("Intelligent Early Age")} <br />
              <span className="text-primary">{t("Health Monitoring & Screening")}</span>
            </h1>
            <p className="text-muted-foreground">
              {t("Intelligent child health screening, risk detection, and intervention tracking for ICDS field operations.")}
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
                <span>{t(text)}</span>
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

        </div>
      </div>
    </div>
  );
}
