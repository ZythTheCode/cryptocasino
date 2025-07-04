import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Home, 
  Coins, 
  CreditCard, 
  Gamepad2,
  Leaf,
  Settings,
  TrendingUp,
  Users,
  Crown,
  Wallet,
  LogOut,
  Menu,
  X,
  TreePine
} from "lucide-react";
import { Link } from "react-router-dom";
import { CheckelsIcon, ChipsIcon } from "@/components/ui/icons";
import { signIn, signUp } from '@/lib/database';
import { supabase } from '@/lib/supabase';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useNavigate } from "react-router-dom";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import MobileNavigation from "@/components/MobileNavigation";

const Index = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingAfterLogin, setIsLoadingAfterLogin] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const savedUser = localStorage.getItem("casinoUser");
        if (savedUser) {
          const parsedUser = JSON.parse(savedUser);

          // Set user immediately with localStorage data
          setCurrentUser(parsedUser);

          // Try to sync with database for latest data (including tree level)
          try {
            const freshUser = await signIn(parsedUser.username, parsedUser.password_hash || 'migrated_user');

            if (freshUser.is_banned) {
              localStorage.removeItem('casinoUser');
              setCurrentUser(null);
              toast({
                title: "Account Banned",
                description: "Your account has been banned. Please contact support.",
                variant: "destructive",
              });
              return;
            }

            // Update with fresh data from database
            localStorage.setItem('casinoUser', JSON.stringify(freshUser));
            setCurrentUser(freshUser);
          } catch (syncError) {
            console.log('Failed to sync with database, using cached data:', syncError);
            // Continue with cached data if sync fails
          }
        }
      } catch (error) {
        console.error('Error loading user:', error);
        localStorage.removeItem("casinoUser");
        setCurrentUser(null);
      }
    };

    loadUser();
  }, [toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username || !password) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    try {
      if (isLogin) {
        // Use Supabase signIn function
        const userData = await signIn(username, password);

        // Check if user is banned
        if (userData.is_banned) {
          // Clear any existing session
          localStorage.removeItem('casinoUser');
          toast({
            title: "Account Banned",
            description: "Your account has been banned. Please contact an administrator.",
            variant: "destructive",
          });
          return;
        }

        setCurrentUser(userData);
        localStorage.setItem('casinoUser', JSON.stringify(userData));

        // Show loading state while syncing data
        setIsLoadingAfterLogin(true);

        toast({
          title: "Login Successful",
          description: "Syncing your data with database...",
        });

        // Simulate data sync time to ensure database consistency
        setTimeout(() => {
          setIsLoadingAfterLogin(false);

          toast({
            title: "Welcome back!",
            description: `Your data has been synchronized, ${userData.username}!`,
          });

          // Navigate to trigger React Router re-render
          navigate('/', { replace: true });
        }, 2000);
      } else {
        // Use Supabase signUp function
        const newUser = await signUp(username, password);

        // Store user in localStorage for session management
        localStorage.setItem('casinoUser', JSON.stringify(newUser));
        setCurrentUser(newUser);

        toast({
          title: "🎉 Registration Successful",
          description: `Welcome, ${username}! You received 10 free checkels to start.`,
        });

        // Navigate to trigger React Router re-render
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 1000);
      }

      setUsername("");
      setPassword("");
    } catch (error: any) {
      toast({
        title: `❌ ${isLogin ? "Login Failed" : "Registration Failed"}`, 
        description: error.message || (isLogin ? "Invalid username or password" : "Failed to create account"),
        variant: "destructive",
        className: "bg-red-50 border-red-200 text-red-800",
      });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("casinoUser");
    setCurrentUser(null);
    setUsername("");
    setPassword("");
    toast({
      title: "👋 Logged Out",
      description: "You have been logged out successfully",
      className: "bg-gray-50 border-gray-200 text-gray-800",
    });
    // Trigger re-render
    navigate('/', { replace: true });
  };

  if (isLoading || isLoadingAfterLogin) {
    const loadingMessage = isLoadingAfterLogin 
      ? 'Loading your dashboard...' 
      : isLogin 
        ? 'Signing you in...' 
        : 'Creating your account...';

    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="flex items-center justify-center space-x-3 text-white mb-4">
            <div className="w-8 h-8 border-3 border-white border-t-transparent animate-spin rounded-full"></div>
            <span className="text-xl font-medium">{loadingMessage}</span>
          </div>
          {isLoadingAfterLogin && (
            <div className="max-w-md mx-auto">
              <div className="bg-white/10 backdrop-blur-lg rounded-lg p-4 border border-white/20">
                <div className="flex items-center space-x-2 text-white/80">
                  <div className="w-4 h-4 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-sm">Syncing account data</span>
                </div>
                <div className="flex items-center space-x-2 text-white/80 mt-2">
                  <div className="w-4 h-4 bg-blue-400 rounded-full animate-pulse" style={{animationDelay: '0.5s'}}></div>
                  <span className="text-sm">Loading dashboard</span>
                </div>
                <div className="flex items-center space-x-2 text-white/80 mt-2">
                  <div className="w-4 h-4 bg-purple-400 rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
                  <span className="text-sm">Preparing your experience</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
        <header className="bg-gradient-to-r from-blue-800/90 to-purple-800/90 backdrop-blur-lg border-b border-white/10 p-4 shadow-xl">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <h1 className="text-3xl font-bold text-white flex items-center space-x-3">
              <Home className="w-8 h-8 text-blue-400" />
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                ₵ Checkels Dashboard
              </span>
            </h1>
            <div className="flex items-center space-x-6">
              <div className="hidden md:flex items-center space-x-4 bg-black/20 rounded-full px-4 py-2 border border-white/10">
                <div className="flex items-center space-x-2">
                  <CheckelsIcon className="w-5 h-5 text-yellow-400" />
                  <span className="text-yellow-100 font-semibold">
                    {(currentUser?.coins || 0).toFixed(2)} ₵ Checkels
                  </span>
                </div>
                <div className="w-px h-6 bg-white/20"></div>
                <div className="flex items-center space-x-2">
                  <ChipsIcon className="w-5 h-5 text-green-400" />
                  <span className="text-green-100 font-semibold">
                    {(currentUser?.chips || 0).toFixed(2)} Chips
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <span className="hidden md:block text-white/90 font-medium">Welcome, {currentUser?.username}</span>
                <Button
                  onClick={handleLogout}
                  variant="outline"
                  size="sm"
                  className="hidden md:flex bg-red-500/20 border-red-400/30 text-red-100 hover:bg-red-500/30"
                >
                  Logout
                </Button>

                <MobileNavigation user={currentUser} currentPage="/" />
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <WelcomeCard user={currentUser} />
            <QuickStatsCard user={currentUser} />
            <NavigationCard />
            {(currentUser?.isAdmin || currentUser?.is_admin) && <AdminPanel />}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white/10 backdrop-blur-lg border-white/20">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-white flex items-center justify-center space-x-3">
            <CheckelsIcon className="w-8 h-8 text-yellow-400" />
            <span className="bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
              ₵ Checkels
            </span>
          </CardTitle>
          <p className="text-white/80 mt-2">
            {isLogin ? "Welcome back!" : "Join the ₵ Checkels ecosystem"}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="username" className="text-white/90">
                Username
              </Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                placeholder="Enter your username"
              />
            </div>
            <div>
              <Label htmlFor="password" className="text-white/90">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                placeholder="Enter your password"
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
            >
              {isLogin ? "Login" : "Register"}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <Button
              variant="link"
              onClick={() => setIsLogin(!isLogin)}
              className="text-white/80 hover:text-white"
            >
              {isLogin
                ? "Don't have an account? Register"
                : "Already have an account? Login"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const WelcomeCard = ({ user }: { user: any }) => {
  const [treeLevel, setTreeLevel] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadTreeLevel = async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      try {
        const { getTreeUpgrade } = await import('@/lib/database');
        let upgrade = await getTreeUpgrade(user.id);

        if (!upgrade) {
          const { createTreeUpgrade } = await import('@/lib/database');
          upgrade = await createTreeUpgrade(user.id);
        }

        setTreeLevel(upgrade.tree_level || 1);
      } catch (error) {
        console.error('Error loading tree level:', error);
        setTreeLevel(1); // Default fallback
      } finally {
        setIsLoading(false);
      }
    };

    loadTreeLevel();
  }, [user?.id]);

  const getTreeImage = (level: number) => {
    if (level >= 80) return "🌳"; // Ancient Tree
    if (level >= 60) return "🌲"; // Mature Tree
    if (level >= 40) return "🌱"; // Growing Tree
    if (level >= 20) return "🪴"; // Young Tree
    return "🌿"; // Seedling
  };

  return (
    <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 shadow-lg">
      <CardHeader>
        <CardTitle className="text-green-700 flex items-center space-x-2">
          <span className="text-2xl">{getTreeImage(treeLevel)}</span>
          <span>Welcome Back!</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <p className="text-green-600">
            Ready to grow your ₵ Checkels tree?
          </p>
          <div className="bg-white p-3 rounded border">
            <p className="text-sm text-gray-600">Your Tree Status</p>
            <p className="font-bold text-lg text-green-600">
              {isLoading ? "Loading..." : `Level ${treeLevel}`}
            </p>
          </div>
          <Link to="/tree">
            <Button className="w-full bg-green-600 hover:bg-green-700">
              Visit Your Tree
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};

const QuickStatsCard = ({ user }: any) => {
  return (
    <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200 shadow-lg">
      <CardHeader>
        <CardTitle className="text-purple-700 flex items-center space-x-2">
          <CheckelsIcon className="w-6 h-6" />
          <span>Your Wealth</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-3 bg-yellow-50 rounded border border-yellow-200">
              <p className="text-xs text-gray-600">₵ Checkels</p>
              <p className="font-bold text-lg text-yellow-600">
                {(user?.coins || 0).toFixed(2)}
              </p>
            </div>
            <div className="text-center p-3 bg-green-50 rounded border border-green-200">
              <p className="text-xs text-gray-600">Chips</p>
              <p className="font-bold text-lg text-green-600">
                {(user?.chips || 0).toFixed(2)}
              </p>
            </div>
          </div>
          <div className="flex space-x-2">
            <Link to="/wallet" className="flex-1">
              <Button variant="outline" size="sm" className="w-full">
                Wallet
              </Button>
            </Link>
            <Link to="/casino" className="flex-1">
              <Button variant="outline" size="sm" className="w-full">
                Casino
              </Button>
            </Link>
            {(user?.isAdmin || user?.is_admin) && (
              <Link to="/admin" className="flex-1">
                <Button variant="outline" size="sm" className="w-full bg-red-50 border-red-200 text-red-600 hover:bg-red-100">
                  Admin
                </Button>
              </Link>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const NavigationCard = () => {
  return (
    <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200 shadow-lg">
      <CardHeader>
        <CardTitle className="text-blue-700 flex items-center space-x-2">
          <Home className="w-6 h-6" />
          <span>Quick Access</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <Link to="/tree">
            <Button className="w-full bg-green-600 hover:bg-green-700 flex items-center space-x-2 mb-3">
              <TreePine className="w-4 h-4" />
              <span>Money Tree Farm</span>
            </Button>
          </Link>
          <Link to="/casino">
            <Button className="w-full bg-purple-600 hover:bg-purple-700 flex items-center space-x-2 mb-3">
              <Gamepad2 className="w-4 h-4" />
              <span>Crypto Casino</span>
            </Button>
          </Link>
          <Link to="/wallet">
            <Button className="w-full bg-indigo-600 hover:bg-indigo-700 flex items-center space-x-2">
              <Wallet className="w-4 h-4" />
              <span>₵ Checkels Wallet</span>
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [users, setUsers] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const savedCurrentUser = JSON.parse(localStorage.getItem("casinoUser") || "{}");
    setCurrentUser(savedCurrentUser);
    loadUsersFromSupabase();
  }, [activeTab]);

  useEffect(() => {
    const loadUserAndSetupRealtime = async () => {
      const savedUser = localStorage.getItem('casinoUser');
      if (savedUser) {
        const parsedUser = JSON.parse(savedUser);

        try {
          // Refresh user data from database to get latest balance
          const freshUser = await signIn(parsedUser.username, parsedUser.password_hash || 'migrated_user');
          setUser(freshUser);
          localStorage.setItem('casinoUser', JSON.stringify(freshUser));

          // Set up real-time subscription for balance updates
          if (supabase && freshUser.id) {
            const subscription = supabase
              .channel(`user_balance_realtime_${freshUser.id}_${Date.now()}`)
              .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'users',
                filter: `id=eq.${freshUser.id}`
              }, (payload) => {
                console.log('User balance updated in real-time:', payload);
                const updatedUser = { ...freshUser, ...payload.new };
                setUser(updatedUser);
                localStorage.setItem('casinoUser', JSON.stringify(updatedUser));
              })
              .subscribe();

            // Cleanup subscription on unmount
            return () => {
              subscription.unsubscribe();
            };
          }
        } catch (error) {
          console.error('Failed to refresh user data:', error);
          setUser(parsedUser); // Fallback to cached user
        }
      } else {
        // Redirect to login if no user found
        window.location.href = '/login';
      }
    };

    loadUserAndSetupRealtime();
  }, []);

  const loadUsersFromSupabase = async () => {
    try {
      setIsLoading(true);
      const { getAllUsers } = await import('@/lib/database');
      const supabaseUsers = await getAllUsers();
      setUsers(supabaseUsers || []);
    } catch (error) {
      console.error('Error loading users from Supabase:', error);
      toast({
        title: "Error",
        description: "Failed to load users from database",
        variant: "destructive",
      });
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateTreeLevel = (upgrades: any) => {
    if (!upgrades) return 1;
    return upgrades.tree_level || upgrades.treeLevel || 1;
  };

  const handleAddCoins = async (userId: string, username: string, amount: number) => {
    try {
      setIsLoading(true);
      console.log(`Adding ${amount} coins to user ${username} (${userId})`);

      const { addUserBalance, signIn } = await import('@/lib/database');
      const result = await addUserBalance(userId, amount, 0);
      console.log('Add coins result:', result);

      // Update current user if it's the same user
      if (user?.id === userId) {
        const updatedUser = { ...user, coins: result.coins, chips: result.chips };
        setUser(updatedUser);
        localStorage.setItem("casinoUser", JSON.stringify(updatedUser));
      }

      await loadUsersFromSupabase();

      toast({
        title: "Checkels Added",
        description: `Added ${amount} ₵ Checkels to ${username}`,
      });
    } catch (error) {
      console.error('Error adding checkels:', error);
      toast({
        title: "Error",
        description: "Failed to add checkels",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddChips = async (userId: string, username: string, amount: number) => {
    try {
      setIsLoading(true);
      console.log(`Adding ${amount} chips to user ${username} (${userId})`);

      const { addUserBalance } = await import('@/lib/database');
      const result = await addUserBalance(userId, 0, amount);
      console.log('Add chips result:', result);

      // Update current user if it's the same user
      if (user?.id === userId) {
        const updatedUser = { ...user, coins: result.coins, chips: result.chips };
        setUser(updatedUser);
        localStorage.setItem("casinoUser", JSON.stringify(updatedUser));
      }

      await loadUsersFromSupabase();

      toast({
        title: "Chips Added",
        description: `Added ${amount} chips to ${username}`,
      });
    } catch (error) {
      console.error('Error adding chips:', error);
      toast({
        title: "Error",
        description: "Failed to add chips",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBanUser = async (userId: string, username: string) => {
    if (!confirm(`Are you sure you want to ban user "${username}"?`)) return;

    try {
      setIsLoading(true);
      console.log(`Banning user ${username} (${userId})`);

      const { banUser } = await import('@/lib/database');
      const result = await banUser(userId);
      console.log('Ban user result:', result);

      // Force refresh all user data
      await loadUsersFromSupabase();

      // If the banned user is currently logged in anywhere, they should be logged out
      const currentUserData = JSON.parse(localStorage.getItem('casinoUser') || '{}');
      if (currentUserData.id === userId) {
        localStorage.removeItem('casinoUser');
        setCurrentUser(null);
        window.location.reload();
      }

      toast({
        title: "User Banned",
        description: `${username} has been banned successfully`,
      });
    } catch (error: any) {
      console.error('Error banning user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to ban user",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnbanUser = async (userId: string, username: string) => {
    try {
      setIsLoading(true);
      console.log(`Unbanning user ${username} (${userId})`);

      const { unbanUser } = await import('@/lib/database');
      const result = await unbanUser(userId);
      console.log('Unban user result:', result);

      // Reload users to show updated data
      await loadUsersFromSupabase();

      toast({
        title: "User Unbanned",
        description: `${username} has been unbanned successfully`,
      });
    } catch (error: any) {
      console.error('Error unbanning user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to unban user",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    if (!confirm(`Are you sure you want to PERMANENTLY DELETE user "${username}"? This action cannot be undone.`)) return;

    try {
      setIsLoading(true);
      console.log(`Deleting user ${username} (${userId})`);

      const { deleteUser } = await import('@/lib/database');
      const result = await deleteUser(userId);
      console.log('Delete user result:', result);

      // Reload users to show updated data
      await loadUsersFromSupabase();

      toast({
        title: "User Deleted",
        description: `${username} has been deleted permanently`,
      });
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetAdminAccount = async () => {
    if (!confirm("Are you sure you want to reset your admin account? This will reset your balance to 0.")) return;

    try {
      setIsLoading(true);
      console.log(`Resetting admin account ${currentUser.username} (${currentUser.id})`);

      const { resetUserBalance, signIn } = await import('@/lib/database');
      const result = await resetUserBalance(currentUser.id);
      console.log('Reset admin account result:', result);

      // Update current user session
      try {
        const freshUser = await signIn(currentUser.username, currentUser.password_hash);
        localStorage.setItem('casinoUser', JSON.stringify(freshUser));
        setCurrentUser(freshUser);
      } catch (error) {
        console.log('Failed to refresh admin session after reset:', error);
        // Fallback: manually update the current user
        const updatedUser = { ...currentUser, coins: 0, chips: 0 };
        localStorage.setItem("casinoUser", JSON.stringify(updatedUser));
        setCurrentUser(updatedUser);
      }

      // Reload users to show updated data
      await loadUsersFromSupabase();

      toast({
        title: "Admin Account Reset",
        description: "Your admin account has been reset for testing",
      });
    } catch (error: any) {
      console.error('Error resetting admin account:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to reset admin account",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const clearAllLocalStorageData = () => {
    // Get all localStorage keys
    const keys = Object.keys(localStorage);

    // Remove all casino-related data
    keys.forEach(key => {
      if (key.includes('casino') || 
          key.includes('tree_') || 
          key.includes('transactions_') || 
          key.includes('pendingTopUps') ||
          key.includes('receipt_')) {
        localStorage.removeItem(key);
      }
    });

    // Reset states
    setUsers({});
    setCurrentUser(null);

    toast({
      title: "LocalStorage Cleared",
      description: "All casino data has been removed from localStorage. Page will reload...",
    });

    // Reload the page
    setTimeout(() => window.location.reload(), 1500);
  };

  const getTotalStats = () => {
    const nonAdminUsers = users.filter((user: any) => !user.is_admin);
    return {
      totalUsers: nonAdminUsers.length,
      totalCoins: nonAdminUsers.reduce((sum: number, user: any) => sum + (user.coins || 0), 0),
      totalChips: nonAdminUsers.reduce((sum: number, user: any) => sum + (user.chips || 0), 0),
      activeUsers: nonAdminUsers.filter((user: any) =>
        user.updated_at && Date.now() - new Date(user.updated_at).getTime() < 24 * 60 * 60 * 1000
      ).length,
      bannedUsers: nonAdminUsers.filter((user: any) => user.is_banned).length
    };
  };

  const stats = getTotalStats();

  if (activeTab === "overview") {
    return (
      <Card className="border-red-200 bg-gradient-to-br from-red-50 to-orange-50 lg:col-span-3">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-red-700">
            <span className="flex items-center space-x-2">
              <Settings className="w-6 h-6" />
              <span>🎰 Casino Admin Panel</span>
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <div className="text-center p-4 bg-white rounded-lg border shadow-sm">
              <h3 className="font-bold text-2xl text-blue-600">{stats.totalUsers}</h3>
              <p className="text-sm text-gray-600">Total Players</p>
            </div>
            <div className="text-center p-4 bg-white rounded-lg border shadow-sm">
              <h3 className="font-bold text-2xl text-green-600">{stats.totalCoins.toFixed(0)}</h3>
              <p className="text-sm text-gray-600">Total ₵ Checkels</p>
            </div>
            <div className="text-center p-4 bg-white rounded-lg border shadow-sm">
              <h3 className="font-bold text-2xl text-purple-600">{stats.totalChips.toFixed(0)}</h3>
              <p className="text-sm text-gray-600">Total Chips</p>
            </div>
            <div className="text-center p-4 bg-white rounded-lg border shadow-sm">
              <h3 className="font-bold text-2xl text-orange-600">{stats.activeUsers}</h3>
              <p className="text-sm text-gray-600">Active (24h)</p>
            </div>
            <div className="text-center p-4 bg-white rounded-lg border shadow-sm">
              <h3 className="font-bold text-2xl text-red-600">{stats.bannedUsers}</h3>
              <p className="text-sm text-gray-600">Banned Users</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-4 rounded-lg border shadow-sm">
              <h3 className="font-bold mb-3 text-gray-700">🏆 Top Players by ₵ Checkels</h3>
              <div className="space-y-2">
                {users
                  .filter((userData: any) => !userData.is_admin)
                  .sort((a: any, b: any) => (b.coins || 0) - (a.coins || 0))
                  .slice(0, 5)
                  .map((userData: any, index) => (
                    <div key={userData.id} className="flex justify-between items-center text-sm p-2 bg-gray-50 rounded">
                      <span className="flex items-center space-x-2">
                        <span className="font-bold">#{index + 1}</span>
                        <span>{userData.username}</span>
                        {userData.is_admin && <span className="text-red-500 text-xs">(Admin)</span>}
                        {userData.is_banned && <span className="text-red-600 text-xs">🚫</span>}
                      </span>
                      <span className="font-medium text-green-600">{(userData.coins || 0).toFixed(2)} ₵</span>
                    </div>
                  ))}
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border shadow-sm">
              <h3 className="font-bold mb-3 text-gray-700">💰 Top Players by Chips</h3>
              <div className="space-y-2">
                {users
                  .filter((userData: any) => !userData.is_admin)
                  .sort((a: any, b: any) => (b.chips || 0) - (a.chips || 0))
                  .slice(0, 5)
                  .map((userData: any, index) => (
                    <div key={userData.id} className="flex justify-between items-center text-sm p-2 bg-gray-50 rounded">
                      <span className="flex items-center space-x-2">
                        <span className="font-bold">#{index + 1}</span>
                        <span>{userData.username}</span>
                        {userData.is_admin && <span className="text-red-500 text-xs">(Admin)</span>}
                        {userData.is_banned && <span className="text-red-600 text-xs">🚫</span>}
                      </span>
                      <span className="font-medium text-purple-600">{(userData.chips || 0).toFixed(2)} chips</span>
                    </div>
                  ))}
              </div>
            </div>

          </div>
        </CardContent>
      </Card>
    );
  }

  if (activeTab === "users") {
    return (
      <Card className="border-red-200 bg-gradient-to-br from-red-50 to-orange-50 lg:col-span-3">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-red-700">
            <span className="flex items-center space-x-2">
              <Settings className="w-6 h-6" />
              <span>👥 User Management</span>
            </span>
            <Button size="sm" variant="outline" onClick={() => setActiveTab("overview")}>
              Back to Overview
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="text-center py-8">
                <span className="text-lg">Loading users...</span>
              </div>
            ) : (
              users.map((userData: any) => (
                <div key={userData.id} className={`p-4 bg-white rounded-lg border shadow-sm ${userData.is_banned ? 'border-red-300 bg-red-50' : ''}`}>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg flex items-center space-x-2">
                        <span>{userData.username}</span>
                        {userData.is_admin && <span className="text-red-500 text-xs bg-red-100 px-2 py-1 rounded">Admin</span>}
                        {userData.is_banned && <span className="text-red-600 text-xs bg-red-100 px-2 py-1 rounded">🚫 Banned</span>}
                      </h3>
                      <div className="text-sm text-gray-600 grid grid-cols-2 gap-2 mt-1">
                        <span>₵ Checkels: <span className="font-medium text-yellow-600">{(userData.coins || 0).toFixed(2)}</span></span>
                        <span>Chips: <span className="font-medium text-green-600">{(userData.chips || 0).toFixed(2)}</span></span>
                      </div>
                      <div className="text-right text-sm text-gray-500 mt-2">
                        <p>Total Value: ₱{((userData.chips || 0) * 10).toFixed(2)}</p>
                        <p>Joined: {new Date(userData.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex flex-col space-y-2 ml-4">
                      {!userData.is_admin && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAddBalance(userData.id, userData.username)}
                            disabled={isLoading}
                          >
                            💰 Add Balance
                          </Button>
                          <Button
                            size="sm"
                            variant={userData.is_banned ? "default" : "destructive"}
                            onClick={() => handleBanUser(userData.id, userData.username)}
                            disabled={isLoading}
                          >
                            {userData.is_banned ? "✅ Unban" : "🚫 Ban"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleResetBalance(userData.id, userData.username)}
                            disabled={isLoading}
                          >
                            🔄 Reset Balance
                          </Button>
                          {userData.is_admin && (
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => handleDeleteUser(userData.id, userData.username)}
                              disabled={isLoading}
                            >
                              🗑️ Delete User
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (activeTab === "users") {
    return (
      <Card className="border-red-200 bg-gradient-to-br from-red-50 to-orange-50 lg:col-span-3">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-red-700">
            <span className="flex items-center space-x-2">
              <Settings className="w-6 h-6" />
              <span>👥 User Management</span>
            </span>
            <Button size="sm" variant="outline" onClick={() => setActiveTab("overview")}>
              Back to Overview
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="text-center py-8">
                <span className="text-lg">Loading users...</span>
              </div>
            ) : (
              users.map((userData: any) => (
                <div key={userData.id} className={`p-4 bg-white rounded-lg border shadow-sm ${userData.is_banned ? 'border-red-300 bg-red-50' : ''}`}>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg flex items-center space-x-2">
                        <span>{userData.username}</span>
                        {userData.is_admin && <span className="text-red-500 text-sm bg-red-100 px-2 py-1 rounded">(Admin)</span>}
                        {userData.is_banned && <span className="text-red-600 text-sm bg-red-200 px-2 py-1 rounded">🚫 BANNED</span>}
                      </h3>
                      <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                        <div>₵ Checkels: <span className="font-medium text-green-600">{(userData.coins || 0).toFixed(2)}</span></div>
                        <div>Chips: <span className="font-medium text-purple-600">{(userData.chips || 0).toFixed(2)}</span></div>
                        <div>Tree Level: <span className="font-medium text-blue-600">{calculateTreeLevel(userData.tree_upgrades?.[0])}</span></div>
                        <div>Status: <span className={`font-medium ${userData.is_banned ? 'text-red-600' : 'text-green-600'}`}>
                          {userData.is_banned ? 'Banned' : 'Active'}
                        </span></div>
                      </div>
                      <div className="mt-2 text-xs text-gray-600">
                        <div>Created: {new Date(userData.created_at).toLocaleString()}</div>
                        <div>Last Updated: {new Date(userData.updated_at).toLocaleString()}</div>
                      </div>
                    </div>
                    <div className="flex flex-col space-y-2 ml-4">
                      <div className="flex space-x-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleAddCoins(userData.id, userData.username, 1000)}
                          disabled={isLoading}
                        >
                          +1000 ₵
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleAddChips(userData.id, userData.username, 1000)}
                          disabled={isLoading}
                        >
                          +1000 💰
                        </Button>
                      </div>
                      {!userData.is_banned ? (
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={userData.is_admin || isLoading}
                          onClick={() => handleBanUser(userData.id, userData.username)}
                        >
                          🚫 Ban User
                        </Button>
                      ) : (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleUnbanUser(userData.id, userData.username)}
                          disabled={isLoading}
                        >
                          ✅ Unban User
                        </Button>
                      )}
                      {!userData.is_admin && (
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => handleDeleteUser(userData.id, userData.username)}
                          disabled={isLoading}
                        >
                          🗑️ Delete User
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (activeTab === "testing") {
    return (
      <Card className="border-red-200 bg-gradient-to-br from-red-50 to-orange-50 lg:col-span-3">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-red-700">
            <span className="flex items-center space-x-2">
              <Settings className="w-6 h-6" />
              <span>🧪 Testing Tools</span>
            </span>
            <Button size="sm" variant="outline" onClick={() => setActiveTab("overview")}>
              Back to Overview
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg border shadow-sm">
              <h3 className="font-bold text-lg mb-4 text-gray-700">🔄 Admin Account Reset</h3>
              <p className="text-gray-600 mb-4">
                Reset your admin account to test the tree farm from the beginning. This will:
              </p>
              <ul className="text-sm text-gray-600 mb-4 space-y-1 ml-4">
                <li>• Reset ₵ Checkels to 0</li>
                <li>• Reset Chips to 0</li>
                <li>• Reset Tree Level to 1</li>
                <li>• Clear all active boosters</li>
                <li>• Clear all transaction history</li>
              </ul>
              <Button
                variant="destructive"
                onClick={handleResetAdminAccount}
                className="w-full mb-4"
                disabled={isLoading}
              >
                🔄 Reset My Admin Account
              </Button>
              
              <div className="border-t pt-4">
                <h3 className="font-bold text-lg mb-4 text-gray-700">💥 Mass Operations</h3>
                <div className="space-y-3">
                  <Button
                    variant="destructive"
                    onClick={async () => {
                      if (!confirm("This will reset ALL non-admin users' balances to 0. Continue?")) return;

                      try {
                        setIsLoading(true);
                        const { resetUserBalance, addTransaction } = await import('@/lib/database');

                        let resetCount = 0;
                        // Reset all non-admin users
                        for (const user of users) {
                          if (!user.is_admin) {
                            try {
                              console.log(`Resetting balance for user: ${user.username} (${user.id})`);
                              await resetUserBalance(user.id);

                              // Add transaction record
                              await addTransaction({
                                user_id: user.id,
                                type: 'topup',
                                description: `Admin mass balance reset by ${currentUser.username}`,
                                coins_amount: 0,
                                chips_amount: 0
                              });

                              resetCount++;
                            } catch (userError) {
                              console.error(`Failed to reset user ${user.username}:`, userError);
                            }
                          }
                        }

                        await loadUsersFromSupabase();

                        toast({
                          title: "Economy Reset",
                          description: `${resetCount} non-admin accounts reset to 0 balance`,
                        });
                      } catch (error: any) {
                        console.error('Error in mass reset:', error);
                        toast({
                          title: "Error",
                          description: error.message || "Failed to reset user accounts",
                          variant: "destructive",
                        });
                      } finally {
                        setIsLoading(false);
                      }
                    }}
                    className="w-full"
                    disabled={isLoading}
                  >
                    💥 Reset All User Balances
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      // Clear localStorage data but keep the main user session
                      const currentUserData = localStorage.getItem('casinoUser');
                      localStorage.clear();
                      if (currentUserData) {
                        localStorage.setItem('casinoUser', currentUserData);
                      }
                      
                      toast({
                        title: "Cache Cleared",
                        description: "Local cache has been cleared (user session preserved)",
                      });
                      
                      setTimeout(() => window.location.reload(), 1500);
                    }}
                    className="w-full"
                    disabled={isLoading}
                  >
                    🗑️ Clear Cache & Reload
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-red-200 bg-gradient-to-br from-red-50 to-orange-50">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-red-700">
          <Settings className="w-6 h-6" />
          <span>🎰 Casino Admin</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Button variant="outline" className="w-full" onClick={() => setActiveTab("overview")}>
            <Settings className="w-4 h-4 mr-2" />
            Open Admin Panel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default Index;