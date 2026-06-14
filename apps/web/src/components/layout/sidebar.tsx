"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { clearAuth, getRefreshToken, getUser } from "@/lib/auth";
import { api } from "@/lib/api";
import {
  Terminal,
  ShieldCheck,
  LayoutDashboard,
  FileCode2,
  Building2,
  Settings,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/reviews", label: "Reviews", icon: FileCode2 },
  { href: "/dashboard/organizations", label: "Organizations", icon: Building2 },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = getUser();
  const initials = ((user?.display_name as string) || "U")
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  async function handleLogout() {
    const rt = getRefreshToken();
    if (rt) {
      try {
        await api.logout(rt);
      } catch {
        /* best-effort */
      }
    }
    clearAuth();
    router.push("/login");
  }

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-border/40 bg-card">
      <div className="flex h-16 items-center gap-2.5 border-b border-border/40 px-6">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Terminal className="h-3.5 w-3.5" />
        </div>
        <span className="font-mono text-base font-bold">Codence</span>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {[
          ...navItems,
          ...(user?.is_admin
            ? [
                {
                  href: "/dashboard/admin",
                  label: "Admin",
                  icon: ShieldCheck,
                },
              ]
            : []),
        ].map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 font-mono text-sm transition-colors",
                active
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border/40 p-3">
        <div className="flex items-center gap-3 rounded-lg px-3 py-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary/15 text-primary font-mono text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 truncate">
            <p className="truncate font-mono text-sm font-medium">
              {(user?.display_name as string) || "User"}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {(user?.email as string) || ""}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
