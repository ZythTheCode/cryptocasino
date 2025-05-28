
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X, Home, TreePine, Gamepad2, Wallet, LogOut, User } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { CheckelsIcon, ChipsIcon } from "@/components/ui/icons";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface MobileNavigationProps {
  user?: any;
  currentPage?: string;
}

const MobileNavigation = ({ user, currentPage }: MobileNavigationProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('casinoUser');
    setIsOpen(false);
    navigate('/');
  };

  const navigationItems = [
    {
      label: "Home",
      href: "/",
      icon: Home,
      description: "Dashboard & Overview"
    },
    {
      label: "Money Tree",
      href: "/tree",
      icon: TreePine,
      description: "Grow your wealth"
    },
    {
      label: "Casino",
      href: "/casino",
      icon: Gamepad2,
      description: "Games & Entertainment"
    },
    {
      label: "Wallet",
      href: "/wallet",
      icon: Wallet,
      description: "Manage your funds"
    }
  ];

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/10 md:hidden"
        >
          <Menu className="h-6 w-6" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent 
        side="right" 
        className="w-80 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 border-l border-white/20 text-white flex flex-col h-full"
      >
        <SheetHeader className="border-b border-white/10 pb-4 flex-shrink-0">
          <SheetTitle className="text-white flex items-center space-x-2">
            <User className="w-5 h-5" />
            <span>Navigation Menu</span>
          </SheetTitle>
          <SheetDescription className="text-white/80">
            {user ? `Welcome, ${user.username}` : 'Please sign in to continue'}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6 flex-1 overflow-y-auto">
          {/* User Balance Card */}
          {user && (
            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <h3 className="text-sm font-medium text-white/90 mb-3">Account Balance</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CheckelsIcon className="w-4 h-4 text-yellow-400" />
                    <span className="text-sm text-white/80">Checkels</span>
                  </div>
                  <span className="font-bold text-yellow-300">
                    {(user?.coins || 0).toFixed(2)} ₵
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <ChipsIcon className="w-4 h-4 text-green-400" />
                    <span className="text-sm text-white/80">Chips</span>
                  </div>
                  <span className="font-bold text-green-300">
                    {(user?.chips || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Links */}
          <div className="space-y-1">
            <h3 className="text-sm font-medium text-white/60 uppercase tracking-wider mb-3">
              Navigation
            </h3>
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.href || 
                (currentPage === '/' && item.href === '/') ||
                (currentPage?.startsWith(item.href) && item.href !== '/');
              
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center space-x-3 py-3 px-4 rounded-lg transition-colors ${
                    isActive 
                      ? 'bg-white/10 text-white border-l-4 border-blue-400' 
                      : 'text-white/80 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <div className="flex-1">
                    <div className="font-medium">{item.label}</div>
                    <div className="text-xs text-white/60">{item.description}</div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Admin Panel Link */}
          {user && (user.isAdmin || user.is_admin) && (
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-white/60 uppercase tracking-wider mb-3">
                Administration
              </h3>
              <Link
                to="/admin"
                onClick={() => setIsOpen(false)}
                className="flex items-center space-x-3 py-3 px-4 rounded-lg transition-colors text-red-300 hover:bg-red-500/10 hover:text-red-200"
              >
                <User className="w-5 h-5" />
                <div className="flex-1">
                  <div className="font-medium">Admin Dashboard</div>
                  <div className="text-xs text-red-400">Management tools</div>
                </div>
              </Link>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-1 pt-4 border-t border-white/10">
            {user ? (
              <Button
                variant="ghost"
                className="w-full justify-start text-red-300 hover:bg-red-500/10 hover:text-red-200"
                onClick={handleLogout}
              >
                <LogOut className="w-5 h-5 mr-3" />
                <div className="flex-1 text-left">
                  <div className="font-medium">Sign Out</div>
                  <div className="text-xs text-red-400">Logout from account</div>
                </div>
              </Button>
            ) : (
              <Link
                to="/"
                onClick={() => setIsOpen(false)}
                className="flex items-center space-x-3 py-3 px-4 rounded-lg transition-colors text-blue-300 hover:bg-blue-500/10 hover:text-blue-200"
              >
                <User className="w-5 h-5" />
                <div className="flex-1">
                  <div className="font-medium">Sign In</div>
                  <div className="text-xs text-blue-400">Access your account</div>
                </div>
              </Link>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MobileNavigation;
