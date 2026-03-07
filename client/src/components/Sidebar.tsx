import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  Users,
  ClipboardList,
  Activity,
  BarChart3,
  LogOut,
  Settings,
  UserPlus,
  TrendingUp,
  Bell,
  FileText,
  MessageSquare,
  Building2,
  MapPin,
  Globe,
  Layers,
  Languages,
  Menu,
  Moon,
  Sun,
} from "lucide-react";
import { useUnreadCount } from "@/hooks/use-resources";
import { useLanguage } from "@/hooks/use-language";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

const NAV_ITEMS = [
  {
    role: ["field_worker"],
    items: [
      { href: "/screenings/new", label: "Health Screening", icon: ClipboardList },
      { href: "/patients", label: "My Patients", icon: Users },
      { href: "/patients/new", label: "Register Patient", icon: UserPlus },
      { href: "/messages", label: "Messages", icon: MessageSquare },
    ]
  },
  {
    role: ["supervisor"],
    items: [
      { href: "/dashboard", label: "Overview", icon: Activity },
      { href: "/field-workers", label: "Field Workers", icon: ClipboardList },
      { href: "/patients", label: "Patient Registry", icon: Users },
      { href: "/messages", label: "Messages", icon: MessageSquare },
      { href: "/alerts", label: "Alerts", icon: Bell },
      { href: "/analytics", label: "Analytics", icon: TrendingUp },
    ]
  },
  {
    role: ["cdpo"],
    items: [
      { href: "/cdpo-dashboard", label: "Block Dashboard", icon: Building2 },
      { href: "/field-workers", label: "Field Workers", icon: ClipboardList },
      { href: "/patients", label: "Patient Registry", icon: Users },
      { href: "/messages", label: "Messages", icon: MessageSquare },
      { href: "/alerts", label: "Alerts", icon: Bell },
      { href: "/reports", label: "Reports", icon: FileText },
    ]
  },
  {
    role: ["dwcweo"],
    items: [
      { href: "/dwcweo-dashboard", label: "District Dashboard", icon: MapPin },
      { href: "/cdpo-dashboard", label: "Block Overview", icon: Layers },
      { href: "/patients", label: "Patient Registry", icon: Users },
      { href: "/messages", label: "Messages", icon: MessageSquare },
      { href: "/alerts", label: "Alerts", icon: Bell },
      { href: "/reports", label: "Reports", icon: FileText },
    ]
  },
  {
    role: ["higher_official"],
    items: [
      { href: "/ho-dashboard", label: "State Dashboard", icon: Globe },
      { href: "/dwcweo-dashboard", label: "District Overview", icon: MapPin },
      { href: "/patients", label: "Patient Registry", icon: Users },
      { href: "/messages", label: "Messages", icon: MessageSquare },
      { href: "/alerts", label: "Alerts", icon: Bell },
      { href: "/reports", label: "Reports", icon: FileText },
    ]
  },
  {
    role: ["admin"],
    items: [
      { href: "/admin", label: "User Management", icon: Settings },
      { href: "/messages", label: "Messages", icon: MessageSquare },
      { href: "/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/alerts", label: "Alerts", icon: Bell },
      { href: "/reports", label: "Reports", icon: FileText },
    ]
  }
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const { data: unreadData } = useUnreadCount();
  const unreadCount = unreadData?.count ?? 0;
  const { t, setLang, lang } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  if (!user) return null;

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 flex-1 overflow-y-auto">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg">
            H
          </div>
          <span className="font-bold text-xl tracking-tight text-sidebar-foreground">HealthTrack</span>
        </div>

        <div className="space-y-6">
          {NAV_ITEMS.map((group, idx) => {
            if (group.role.includes(user.role as any)) {
              return (
                <div key={idx} className="space-y-1">
                  {group.items.map((item) => (
                    <Link key={item.href} href={item.href}>
                      <div
                        onClick={onNavigate}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer",
                          location === item.href
                            ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                        )}
                      >
                        <item.icon className="w-4 h-4" />
                        {t(item.label)}
                        {item.href === "/messages" && unreadCount > 0 && (
                          <span className="ml-auto bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                            {unreadCount > 99 ? "99+" : unreadCount}
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              );
            }
            return null;
          })}
        </div>
      </div>

      <div className="p-6 border-t border-sidebar-border">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-xs">
            {user.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium truncate text-sidebar-foreground">{user.name}</p>
            <p className="text-xs text-muted-foreground truncate capitalize">{user.role.replace('_', ' ')}</p>
          </div>
        </div>
        <div className="mb-1 flex items-center gap-2 px-3 py-2 text-sm text-sidebar-foreground/70 rounded-md">
          <Languages className="w-4 h-4 shrink-0" />
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value as "en" | "te")}
            className="flex-1 bg-transparent cursor-pointer outline-none text-sm"
          >
            <option value="en">English</option>
            <option value="te">తెలుగు</option>
          </select>
        </div>
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50 rounded-md transition-colors mb-1"
        >
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          {theme === "dark" ? t("Light Mode") : t("Dark Mode")}
        </button>
        <button
          onClick={() => {
            logout().catch(() => {});
            try { localStorage.removeItem("REACT_QUERY_OFFLINE_CACHE"); } catch {}
            window.location.href = "/login";
          }}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-md transition-colors"
        >
          <LogOut className="w-4 h-4" />
          {t("Sign Out")}
        </button>
      </div>
    </div>
  );
}

export function Sidebar() {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  if (isMobile) {
    return (
      <>
        <button
          onClick={() => setOpen(true)}
          className="fixed top-3 left-3 z-40 p-2 rounded-md bg-background border shadow-sm md:hidden"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="left" className="p-0 w-72 bg-sidebar">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <SidebarContent onNavigate={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
      </>
    );
  }

  return (
    <aside className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col h-screen sticky top-0 shrink-0">
      <SidebarContent />
    </aside>
  );
}
