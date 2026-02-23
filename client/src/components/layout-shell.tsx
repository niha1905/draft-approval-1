import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useNotifications, useMarkNotificationRead } from "@/hooks/use-notifications";
import {
  LayoutDashboard,
  FileText,
  Settings,
  Bell,
  LogOut,
  User,
  Menu,
  CheckCircle2,
  Activity,
  Users
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function LayoutShell({ children }: { children: ReactNode }) {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();
  const { data: notifications } = useNotifications();
  const markRead = useMarkNotificationRead();

  const unreadCount = notifications?.filter(n => !n.readAt).length || 0;

  const NavItem = ({ href, icon: Icon, label }: { href: string; icon: any; label: string }) => {
    const isActive = location === href;
    return (
      <Link href={href} className={`
        flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200
        ${isActive 
          ? 'bg-primary/10 text-primary' 
          : 'text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-foreground'}
      `}>
        <Icon className="w-4 h-4" />
        {label}
      </Link>
    );
  };

  const navLinks = [
    { href: "/", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/drafts", icon: FileText, label: "Drafts & Approvals" },
    ...(user?.role === "Head Authority" ? [
      { href: "/activity-logs", icon: Activity, label: "Activity Logs" },
      { href: "/user-management", icon: Users, label: "User Management" }
    ] : []),
    { href: "/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r bg-white dark:bg-slate-900 h-screen sticky top-0 z-30">
        <div className="p-6 border-b">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 p-2 rounded-lg">
              <CheckCircle2 className="w-6 h-6 text-primary" />
            </div>
            <span className="font-display font-bold text-xl tracking-tight text-slate-900 dark:text-white">
              DraftFlow
            </span>
          </div>
        </div>

        <div className="flex-1 py-6 px-4 space-y-1">
          {navLinks.map((link) => (
            <NavItem key={link.href} {...link} />
          ))}
        </div>

        <div className="p-4 border-t bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={`https://ui-avatars.com/api/?name=${user?.name}&background=random`} />
              <AvatarFallback>{user?.name?.[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.role}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => logoutMutation.mutate()}>
              <LogOut className="w-4 h-4 text-muted-foreground" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white dark:bg-slate-900 border-b z-40 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <div className="p-6 border-b">
                <span className="font-display font-bold text-xl">DraftFlow</span>
              </div>
              <div className="flex-col flex gap-1 p-4">
                {navLinks.map((link) => (
                  <NavItem key={link.href} {...link} />
                ))}
              </div>
            </SheetContent>
          </Sheet>
          <span className="font-display font-bold text-lg">DraftFlow</span>
        </div>
        
        <div className="flex items-center gap-2">
           {/* Notification Dropdown Mobile */}
           <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="w-5 h-5 text-muted-foreground" />
                {unreadCount > 0 && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="max-h-80 overflow-y-auto">
                {notifications?.length === 0 && (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No new notifications
                  </div>
                )}
                {notifications?.map((n) => (
                  <DropdownMenuItem 
                    key={n.id} 
                    className="flex flex-col items-start gap-1 p-3 cursor-pointer"
                    onClick={() => !n.readAt && markRead.mutate(n.id)}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-medium text-xs text-primary uppercase">{n.type}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(n.createdAt!).toLocaleDateString()}
                      </span>
                    </div>
                    <p className={`text-sm ${!n.readAt ? 'font-semibold' : 'text-muted-foreground'}`}>
                      {n.message}
                    </p>
                  </DropdownMenuItem>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen pt-16 md:pt-0">
        <header className="hidden md:flex h-16 border-b bg-white dark:bg-slate-900 items-center justify-between px-8 sticky top-0 z-20">
          <h1 className="text-xl font-display font-semibold text-slate-800 dark:text-white capitalize">
            {location === '/' ? 'Dashboard' : location.slice(1)}
          </h1>
          
          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="w-5 h-5 text-slate-500" />
                  {unreadCount > 0 && (
                    <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 border-2 border-white dark:border-slate-900 rounded-full" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="max-h-80 overflow-y-auto">
                   {notifications?.length === 0 && (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      No new notifications
                    </div>
                  )}
                  {notifications?.map((n) => (
                    <DropdownMenuItem 
                      key={n.id} 
                      className="flex flex-col items-start gap-1 p-3 cursor-pointer focus:bg-slate-50"
                      onClick={() => !n.readAt && markRead.mutate(n.id)}
                    >
                      <div className="flex items-center justify-between w-full">
                        <Badge variant="outline" className="text-[10px] h-5">{n.type}</Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(n.createdAt!).toLocaleDateString()}
                        </span>
                      </div>
                      <p className={`text-sm mt-1 ${!n.readAt ? 'font-medium text-slate-900' : 'text-slate-500'}`}>
                        {n.message}
                      </p>
                    </DropdownMenuItem>
                  ))}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <div className="flex-1 p-4 md:p-8 overflow-y-auto bg-slate-50/50 dark:bg-black/20">
          <div className="max-w-7xl mx-auto w-full animate-enter">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
