import { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Shield, LayoutDashboard, History, LogOut, Menu, X, User, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/state/auth';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/verifier', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/verifier/history', icon: History, label: 'Verification History' },
];

export function VerifierLayout() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, clearAuth } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    clearAuth();
    navigate('/');
  };

  const closeSidebar = () => setSidebarOpen(false);

  const SidebarContent = () => (
    <>
      <div className="p-4 border-b">
        <Link to="/" className="flex items-center gap-2" onClick={closeSidebar}>
          <div className="w-8 h-8 bg-egypt-navy rounded-lg flex items-center justify-center">
            <Shield className="h-4 w-4 text-white" />
          </div>
          <div>
            <span className="font-bold text-egypt-navy text-sm">SME Cert</span>
            <span className="text-[10px] text-muted-foreground block -mt-0.5 leading-none">Trust Platform</span>
          </div>
        </Link>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            onClick={closeSidebar}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              location.pathname === item.path
                ? 'bg-egypt-navy text-white'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="p-4 border-t">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 bg-egypt-navy/10 rounded-full flex items-center justify-center shrink-0">
            <User className="h-4 w-4 text-egypt-navy" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{user?.firstName} {user?.lastName}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>
        {user?.organizationName && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
            <Building2 className="h-3 w-3 shrink-0" />
            <span className="truncate">{user.organizationName}</span>
          </div>
        )}
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-center text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex flex-col">
      {/* Mobile Top Bar */}
      <header className="lg:hidden sticky top-0 z-40 border-b bg-white">
        <div className="flex items-center justify-between px-4 h-14">
          <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2 rounded-md hover:bg-muted">
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <p className="text-sm font-semibold leading-tight">{user?.firstName} {user?.lastName}</p>
              <p className="text-[10px] text-muted-foreground leading-tight">{user?.organizationName || 'Verifier'}</p>
            </div>
            <Badge variant="navy" className="text-[10px] px-1.5 py-0.5">Verifier</Badge>
          </div>
          <Button variant="ghost" size="icon" className="text-red-600 hover:bg-red-50 -mr-2" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Mobile Overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/50" onClick={closeSidebar} />
            <aside className="relative w-72 h-full bg-white flex flex-col shadow-xl animate-fade-in">
              <button
                onClick={closeSidebar}
                className="absolute top-3 right-3 p-1.5 rounded-md hover:bg-muted z-10"
              >
                <X className="h-4 w-4" />
              </button>
              <SidebarContent />
            </aside>
          </div>
        )}

        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex w-64 border-r bg-white flex-col shrink-0">
          <SidebarContent />
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-6 bg-gray-50/50 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
