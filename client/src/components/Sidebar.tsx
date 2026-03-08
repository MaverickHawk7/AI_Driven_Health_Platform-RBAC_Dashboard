import { useState, useEffect } from "react";
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

  Languages,
  Menu,
  Moon,
  Sun,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { useUnreadCount } from "@/hooks/use-resources";
import { useLanguage } from "@/hooks/use-language";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const NAV_ITEMS = [
  {
    role: ["field_worker"],
    items: [
      { href: "/field-worker/home", label: "Overview", icon: Activity },
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
      { href: "/dwcweo-dashboard", label: "Overview", icon: MapPin },
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

function getStoredCollapsed(): boolean {
  try {
    return localStorage.getItem("sidebar_collapsed") === "true";
  } catch { return false; }
}

function NavItem({ item, location, collapsed, unreadCount, t, onNavigate }: {
  item: { href: string; label: string; icon: any };
  location: string;
  collapsed: boolean;
  unreadCount: number;
  t: (s: string) => string;
  onNavigate?: () => void;
}) {
  const isActive = location === item.href;
  const content = (
    <Link href={item.href}>
      <div
        onClick={onNavigate}
        className={cn(
          "flex items-center gap-3 rounded-md text-sm font-medium transition-all duration-200 cursor-pointer",
          collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2",
          isActive
            ? "bg-purple-500/15 text-purple-700 dark:text-purple-300 shadow-sm border-l-2 border-purple-500"
            : "text-sidebar-foreground/70 hover:bg-purple-500/10 hover:text-purple-600 dark:hover:text-purple-300"
        )}
      >
        <item.icon className="w-4 h-4 shrink-0" />
        {!collapsed && (
          <>
            <span className="truncate">{t(item.label)}</span>
            {item.href === "/messages" && unreadCount > 0 && (
              <span className="ml-auto bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </>
        )}
        {collapsed && item.href === "/messages" && unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </div>
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <div className="relative">{content}</div>
        </TooltipTrigger>
        <TooltipContent side="right" className="text-xs">
          {t(item.label)}
        </TooltipContent>
      </Tooltip>
    );
  }

  return content;
}

function SidebarContent({ collapsed = false, onNavigate, onToggle }: {
  collapsed?: boolean;
  onNavigate?: () => void;
  onToggle?: () => void;
}) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const { data: unreadData } = useUnreadCount();
  const unreadCount = unreadData?.count ?? 0;
  const { t, setLang, lang } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  if (!user) return null;

  return (
    <div className="flex flex-col h-full">
      <div className={cn("flex-1 overflow-y-auto", collapsed ? "p-2" : "p-6")}>
        {/* Header */}
        <div className={cn("flex items-center mb-6", collapsed ? "justify-center" : "gap-2")}>
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg shrink-0">
            H
          </div>
          {!collapsed && (
            <span className="font-bold text-xl tracking-tight text-sidebar-foreground">HealthTrack</span>
          )}
        </div>

        {/* Collapse toggle (desktop only, not in sheet) */}
        {onToggle && (
          <button
            onClick={onToggle}
            className={cn(
              "flex items-center gap-2 rounded-md text-sm text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors mb-4",
              collapsed ? "justify-center px-2 py-2 w-full" : "px-3 py-1.5"
            )}
          >
            {collapsed ? <ChevronsRight className="w-4 h-4" /> : <ChevronsLeft className="w-4 h-4" />}
            {!collapsed && <span className="text-xs">Collapse</span>}
          </button>
        )}

        {/* Nav items */}
        <div className="space-y-6">
          {NAV_ITEMS.map((group, idx) => {
            if (group.role.includes(user.role as any)) {
              return (
                <div key={idx} className="space-y-1">
                  {group.items.map((item) => (
                    <NavItem
                      key={item.href}
                      item={item}
                      location={location}
                      collapsed={collapsed}
                      unreadCount={unreadCount}
                      t={t}
                      onNavigate={onNavigate}
                    />
                  ))}
                </div>
              );
            }
            return null;
          })}
        </div>
      </div>

      {/* Footer */}
      <div className={cn("border-t border-sidebar-border", collapsed ? "p-2" : "p-6")}>
        {/* User info */}
        {collapsed ? (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <div className="w-8 h-8 mx-auto mb-2 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-xs cursor-default">
                {user.name.split(' ').map(n => n[0]).join('')}
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">
              {user.name} — {user.role.replace('_', ' ')}
            </TooltipContent>
          </Tooltip>
        ) : (
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-xs shrink-0">
              {user.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium truncate text-sidebar-foreground">{user.name}</p>
              <p className="text-xs text-muted-foreground truncate capitalize">{user.role.replace('_', ' ')}</p>
            </div>
          </div>
        )}

        {/* Language */}
        {collapsed ? (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                onClick={() => setLang(lang === "en" ? "te" : "en")}
                className="w-full flex justify-center py-2 text-sidebar-foreground/70 hover:bg-sidebar-accent/50 rounded-md transition-colors mb-1"
              >
                <Languages className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">
              {lang === "en" ? "తెలుగు" : "English"}
            </TooltipContent>
          </Tooltip>
        ) : (
          <div className="mb-1 flex items-center gap-2 px-3 py-2 text-sm text-sidebar-foreground/70 rounded-md hover:text-purple-600 dark:hover:text-purple-300 transition-colors duration-200 cursor-pointer active:text-purple-700 dark:active:text-purple-400">
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
        )}

        {/* Theme toggle */}
        {collapsed ? (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                onClick={toggleTheme}
                className="w-full flex justify-center py-2 text-sidebar-foreground/70 hover:bg-sidebar-accent/50 rounded-md transition-colors mb-1"
              >
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">
              {theme === "dark" ? t("Light Mode") : t("Dark Mode")}
            </TooltipContent>
          </Tooltip>
        ) : (
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-sidebar-foreground/70 hover:text-purple-600 dark:hover:text-purple-300 rounded-md transition-colors duration-200 cursor-pointer active:text-purple-700 dark:active:text-purple-400 mb-1"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {theme === "dark" ? t("Light Mode") : t("Dark Mode")}
          </button>
        )}

        {/* Logout */}
        {collapsed ? (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                onClick={() => {
                  logout().catch(() => {});
                  try { localStorage.removeItem("REACT_QUERY_OFFLINE_CACHE"); } catch {}
                  window.location.href = "/login";
                }}
                className="w-full flex justify-center py-2 text-destructive hover:bg-destructive/10 rounded-md transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">
              {t("Sign Out")}
            </TooltipContent>
          </Tooltip>
        ) : (
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
        )}
      </div>
    </div>
  );
}

export function Sidebar() {
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(getStoredCollapsed);

  useEffect(() => {
    try { localStorage.setItem("sidebar_collapsed", String(collapsed)); } catch {}
  }, [collapsed]);

  if (isMobile) {
    return (
      <>
        <button
          onClick={() => setMobileOpen(true)}
          className="fixed top-3 left-3 z-40 p-2 rounded-md bg-background border shadow-sm md:hidden"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="p-0 w-72 !bg-background border-r">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>
      </>
    );
  }

  return (
    <aside
      className={cn(
        "bg-sidebar border-r border-sidebar-border flex flex-col h-screen sticky top-0 shrink-0 transition-[width] duration-200",
        collapsed ? "w-14" : "w-64"
      )}
    >
      <SidebarContent collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
    </aside>
  );
}
