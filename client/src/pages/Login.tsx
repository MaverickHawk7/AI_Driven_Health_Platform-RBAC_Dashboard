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
      toast({ title: t("common.missingFields"), description: t("common.fillFields"), variant: "destructive" });
      return;
    }
    setLoginLoading(true);
    try {
      await login(loginUsername, loginPassword);
    } catch (err: any) {
      toast({ title: t("common.loginFailed"), description: err.message || t("common.invalidCredentials"), variant: "destructive" });
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
            <CardTitle className="text-2xl">{t("login.signIn")}</CardTitle>
            <CardDescription>{t("login.accessDashboard")}</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-role">{t("login.selectRole")}</Label>
              <Select onValueChange={(v) => setLoginRole(v as Role)} value={loginRole}>
                <SelectTrigger id="login-role" className="h-11 bg-background">
                  <SelectValue placeholder={t("login.selectYourRole")} />
                </SelectTrigger>
                <SelectContent className="bg-background">
                  <SelectItem value="field_worker">
                    <div className="flex items-center gap-2">
                      <ClipboardList className="w-4 h-4 text-blue-600" />
                      <span>{t("role.field_worker")}</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="supervisor">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-amber-600" />
                      <span>{t("role.supervisor")}</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="cdpo">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-teal-600" />
                      <span>{t("role.cdpo")}</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="dwcweo">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-indigo-600" />
                      <span>{t("role.dwcweo")}</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="higher_official">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-violet-600" />
                      <span>{t("role.higher_official")}</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-gray-600" />
                      <span>{t("role.admin")}</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="login-username">{t("login.username")}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  id="login-username"
                  placeholder={t("login.enterUsername")}
                  className="pl-10 h-11"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="login-password">{t("login.password")}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  id="login-password"
                  type="password"
                  placeholder={t("login.enterPassword")}
                  className="pl-10 h-11"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                />
              </div>
            </div>

            <Button className="w-full h-11 text-base" onClick={handleLogin} disabled={loginLoading}>
              {loginLoading ? t("login.signingIn") : t("login.signIn")}
            </Button>


            <div className="rounded-md bg-muted/50 border border-border/50 px-3 py-2.5 text-xs text-muted-foreground">
              <p className="font-medium mb-1">{t("login.demoAccess")}</p>
              <p>{t("login.demoHint")} <span className="font-mono font-medium">password</span></p>
              <p className="mt-1">{t("login.demoExample")} <span className="font-mono font-medium">field worker</span>, Password: <span className="font-mono font-medium">password</span></p>
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
              {t("login.title1")} <br />
              <span className="text-primary">{t("login.title2")}</span>
            </h1>
            <p className="text-muted-foreground">
              {t("login.subtitle")}
            </p>
          </div>

          <div className="space-y-3">
            {[
              { icon: Brain, key: "feature.aiScreening" as const },
              { icon: Activity, key: "feature.realTimeAlerts" as const },
              { icon: FileText, key: "feature.fhir" as const },
              { icon: Shield, key: "feature.rbac" as const },
              { icon: Lock, key: "feature.encryption" as const },
              { icon: Zap, key: "feature.predictive" as const },
              { icon: ShieldCheck, key: "feature.dpdp" as const },
            ].map(({ icon: Icon, key }) => (
              <div key={key} className="flex items-center gap-3 text-sm text-muted-foreground">
                <Icon className="w-4 h-4 text-primary/70 shrink-0" />
                <span>{t(key)}</span>
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
