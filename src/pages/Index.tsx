import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Gamepad2, Wallet, TreePine, Settings, Home } from "lucide-react";
import { Link } from "react-router-dom";
import { CheckelsIcon, ChipsIcon } from "@/components/ui/icons";
import { signIn, signUp } from "@/lib/database";
import { useLocation, useNavigate } from "react-router-dom";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const Index = () => {
  const [users, setUsers] = useState<any>({});
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const savedUsers = localStorage.getItem("casinoUsers");
    if (savedUsers) {
      setUsers(JSON.parse(savedUsers));
    }

    const savedUser = localStorage.getItem("casinoUser");
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setCurrentUser(parsedUser);
      
      // Sync with Supabase to get latest data
      syncUserWithSupabase(parsedUser);
    }
  }, []);

  const syncUserWithSupabase = async (localUser: any) => {
    try {
      // Get fresh user data from Supabase
      const freshUser = await signIn(localUser.username, localUser.password_hash || 'migrated_user');
      
      // Update localStorage with fresh data
      localStorage.setItem('casinoUser', JSON.stringify(freshUser));
      setCurrentUser(freshUser);
    } catch (error) {
      console.log('Could not sync with Supabase, using localStorage data');
    }
  };

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
        const user = await signIn(username, password);

        // Store current user in localStorage for session management
        localStorage.setItem('casinoUser', JSON.stringify(user));
        setCurrentUser(user);

        toast({
          title: "Login Successful",
          description: `Welcome back, ${username}!`,
        });

        // Navigate to trigger React Router re-render
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 500);
      } else {
        // Use Supabase signUp function
        const newUser = await signUp(username, password);

        // Store user in localStorage for session management
        localStorage.setItem('casinoUser', JSON.stringify(newUser));
        setCurrentUser(newUser);

        toast({
          title: "Registration Successful",
          description: `Welcome, ${username}!`,
        });

        // Navigate to trigger React Router re-render
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 500);
      }

      setUsername("");
      setPassword("");
    } catch (error: any) {
      toast({
        title: isLogin ? "Login Failed" : "Registration Failed", 
        description: error.message || (isLogin ? "Invalid username or password" : "Failed to create account"),
        variant: "destructive",
      });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("casinoUser");
    setCurrentUser(null);
    setUsername("");
    setPassword("");
    toast({
      title: "Logged Out",
      description: "You have been logged out successfully",
    });
    // Trigger re-render
    navigate('/', { replace: true });
  };

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
              <div className="flex items-center space-x-4 bg-black/20 rounded-full px-4 py-2 border border-white/10">
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
                <span className="text-white/90 font-medium">Welcome, {currentUser?.username}</span>
                <Button
                  onClick={handleLogout}
                  variant="outline"
                  size="sm"
                  className="bg-red-500/20 border-red-400/30 text-red-100 hover:bg-red-500/30"
                >
                  Logout
                </Button>
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

const WelcomeCard = ({ user }: any) => {
  const calculateTreeLevel = (upgrades: any) => {
    if (!upgrades) return 1;
    return upgrades.treeLevel || 1;
  };

  const getTreeImage = (level: number) => {
    if (level >= 80) return "🌳";
    if (level >= 60) return "🌲";
    if (level >= 40) return "🌱";
    if (level >= 20) return "🪴";
    return "🌿";
  };

  const level = calculateTreeLevel(user?.upgrades);

  return (
    <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 shadow-lg">
      <CardHeader>
        <CardTitle className="text-green-700 flex items-center space-x-2">
          <span className="text-2xl">{getTreeImage(level)}</span>
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
              Level {level}
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
  const [users, setUsers] = useState<any>({});
  const [currentUser, setCurrentUser] = useState<any>(null);
  const { toast } = useToast();
  const [pendingChanges, setPendingChanges] = useState(false);

  useEffect(() => {
    const savedUsers = JSON.parse(localStorage.getItem("casinoUsers") || "{}");
    const savedCurrentUser = JSON.parse(localStorage.getItem("casinoUser") || "{}");
    setUsers(savedUsers);
    setCurrentUser(savedCurrentUser);
  }, [activeTab]);

  const calculateTreeLevel = (upgrades: any) => {
    if (!upgrades) return 1;
    return upgrades.treeLevel || 1;
  };

  const executeActionWithConfirmation = (action: () => void) => {
    action();
    setPendingChanges(true);
  };

  const handleSaveChanges = () => {
    localStorage.setItem("casinoUsers", JSON.stringify(users));

    // Update current user if they were modified
    const updatedCurrentUser = users[currentUser.username];
    if (updatedCurrentUser) {
      localStorage.setItem("casinoUser", JSON.stringify(updatedCurrentUser));
    }

    toast({
      title: "Changes Saved",
      description: "Page will reload to apply changes...",
    });

    // Force page reload after a short delay to show the toast
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  const handleCancelChanges = () => {
    setPendingChanges(false);
    // Reload users from localStorage to reset any pending changes
    const savedUsers = JSON.parse(localStorage.getItem("casinoUsers") || "{}");
    setUsers(savedUsers);
  };

  const handleAddCoins = (username: string, amount: number) => {
    const action = () => {
      const updatedUsers = { ...users };
      updatedUsers[username].coins = (updatedUsers[username].coins || 0) + amount;
      setUsers(updatedUsers);

      if (currentUser.username === username) {
        const updatedCurrentUser = updatedUsers[username];
        localStorage.setItem("casinoUser", JSON.stringify(updatedCurrentUser));
        setCurrentUser(updatedCurrentUser);
      }

      toast({
        title: "₵ Checkels Added",
        description: `Added ${amount} ₵ Checkels to ${username}`,
      });
    };

    executeActionWithConfirmation(action);
  };

  const handleAddChips = (username: string, amount: number) => {
    const action = () => {
      const updatedUsers = { ...users };
      updatedUsers[username].chips = (updatedUsers[username].chips || 0) + amount;
      setUsers(updatedUsers);

      if (currentUser.username === username) {
        const updatedCurrentUser = updatedUsers[username];
        localStorage.setItem("casinoUser", JSON.stringify(updatedCurrentUser));
        setCurrentUser(updatedCurrentUser);
      }

      toast({
        title: "Chips Added",
        description: `Added ${amount} chips to ${username}`,
      });
    };

    executeActionWithConfirmation(action);
  };

  const handleBanUser = (username: string) => {
    const action = () => {
      const updatedUsers = { ...users };
      updatedUsers[username] = {
        ...updatedUsers[username],
        banned: true,
        bannedAt: Date.now()
      };
      setUsers(updatedUsers);

      toast({
        title: "User Banned",
        description: `${username} has been banned from the casino`,
        variant: "destructive",
      });
    };
    executeActionWithConfirmation(action);
  };

  const handleUnbanUser = (username: string) => {
    const action = () => {
      const updatedUsers = { ...users };
      updatedUsers[username] = {
        ...updatedUsers[username],
        banned: false
      };
      delete updatedUsers[username].bannedAt;
      setUsers(updatedUsers);

      toast({
        title: "User Unbanned",
        description: `${username} has been unbanned`,
      });
    };
    executeActionWithConfirmation(action);
  };

  const handleDeleteUser = (username: string) => {
    const action = () => {
      if (users[username]?.isAdmin) {
        toast({
          title: "Cannot Delete Admin",
          description: "Admin accounts cannot be deleted",
          variant: "destructive",
        });
        return;
      }

      const confirmed = window.confirm(
        `Are you sure you want to permanently delete user "${username}"?\n\nThis action cannot be undone and will:\n• Remove all user data\n• Clear transaction history\n• Delete tree progress\n• Remove wallet data`
      );

      if (!confirmed) {
        return;
      }

      // Remove user from users object
      const updatedUsers = { ...users };
      delete updatedUsers[username];
      setUsers(updatedUsers);

      // Remove all user-specific data from localStorage
      localStorage.removeItem(`tree_transactions_${username}`);
      localStorage.removeItem(`transactions_${username}`);
      localStorage.removeItem(`tree_generation_${username}`);
      localStorage.removeItem(`casino_transactions_${username}`);
      localStorage.removeItem(`user_boosters_${username}`);
      localStorage.removeItem(`user_settings_${username}`);

      toast({
        title: "User Deleted",
        description: `${username} has been permanently deleted from the database`,
      });
    };
    executeActionWithConfirmation(action);
  };

  const handleResetAdminAccount = () => {
    const adminUsername = currentUser.username;
    const updatedUsers = { ...users };

    updatedUsers[adminUsername] = {
      ...updatedUsers[adminUsername],
      coins: 0,
      chips: 0,
      upgrades: { treeLevel: 1 },
      activeBoosters: [],
      lastLogin: Date.now(),
    };

    localStorage.setItem("casinoUsers", JSON.stringify(updatedUsers));
    localStorage.setItem("casinoUser", JSON.stringify(updatedUsers[adminUsername]));

    // Clear admin's transaction histories
    localStorage.removeItem(`tree_transactions_${adminUsername}`);
    localStorage.removeItem(`transactions_${adminUsername}`);
    localStorage.removeItem(`tree_generation_${adminUsername}`);

    setUsers(updatedUsers);
    setCurrentUser(updatedUsers[adminUsername]);

    toast({
      title: "Admin Account Reset",
      description: "Your admin account has been reset for testing",
    });

    // Reload the page to reflect changes
    setTimeout(() => window.location.reload(), 1000);
  };

  const getTotalStats = () => {
    const userList = Object.values(users);
    const nonAdminUsers = userList.filter((user: any) => !user.isAdmin);
    return {
      totalUsers: nonAdminUsers.length,
      totalCoins: nonAdminUsers.reduce((sum: number, user: any) => sum + (user.coins || 0), 0),
      totalChips: nonAdminUsers.reduce((sum: number, user: any) => sum + (user.chips || 0), 0),
      activeUsers: nonAdminUsers.filter((user: any) =>
        user.lastLogin && Date.now() - user.lastLogin < 24 * 60 * 60 * 1000
      ).length,
      bannedUsers: nonAdminUsers.filter((user: any) => user.banned).length
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
            <div className="flex space-x-2">
              <Button size="sm" variant="outline" onClick={() => setActiveTab("users")}>
                User Management
              </Button>
              <Button size="sm" variant="outline" onClick={() => setActiveTab("testing")}>
                Testing Tools
              </Button>
            </div>
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
                {Object.entries(users)
                  .filter(([, userData]: [string, any]) => !userData.isAdmin)
                  .sort(([, a]: [string, any], [, b]: [string, any]) => (b.coins || 0) - (a.coins || 0))
                  .slice(0, 5)
                  .map(([username, userData]: [string, any], index) => (
                    <div key={username} className="flex justify-between items-center text-sm p-2 bg-gray-50 rounded">
                      <span className="flex items-center space-x-2">
                        <span className="font-bold">#{index + 1}</span>
                        <span>{username}</span>
                        {userData.isAdmin && <span className="text-red-500 text-xs">(Admin)</span>}
                        {userData.banned && <span className="text-red-600 text-xs">🚫</span>}
                      </span>
                      <span className="font-medium text-green-600">{(userData.coins || 0).toFixed(2)} ₵</span>
                    </div>
                  ))}
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border shadow-sm">
              <h3 className="font-bold mb-3 text-gray-700">💰 Top Players by Chips</h3>
              <div className="space-y-2">
                {Object.entries(users)
                  .filter(([, userData]: [string, any]) => !userData.isAdmin)
                  .sort(([, a]: [string, any], [, b]: [string, any]) => (b.chips || 0) - (a.chips || 0))
                  .slice(0, 5)
                  .map(([username, userData]: [string, any], index) => (
                    <div key={username} className="flex justify-between items-center text-sm p-2 bg-gray-50 rounded">
                      <span className="flex items-center space-x-2">
                        <span className="font-bold">#{index + 1}</span>
                        <span>{username}</span>
                        {userData.isAdmin && <span className="text-red-500 text-xs">(Admin)</span>}
                        {userData.banned && <span className="text-red-600 text-xs">🚫</span>}
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
            {Object.entries(users).map(([username, userData]: [string, any]) => (
              <div key={username} className={`p-4 bg-white rounded-lg border shadow-sm ${userData.banned ? 'border-red-300 bg-red-50' : ''}`}>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-bold text-lg flex items-center space-x-2">
                      <span>{username}</span>
                      {userData.isAdmin && <span className="text-red-500 text-sm bg-red-100 px-2 py-1 rounded">(Admin)</span>}
                      {userData.banned && <span className="text-red-600 text-sm bg-red-200 px-2 py-1 rounded">🚫 BANNED</span>}
                    </h3>
                    <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                      <div>₵ Checkels: <span className="font-medium text-green-600">{(userData.coins || 0).toFixed(2)}</span></div>
                      <div>Chips: <span className="font-medium text-purple-600">{(userData.chips || 0).toFixed(2)}</span></div>
                      <div>Tree Level: <span className="font-medium text-blue-600">{calculateTreeLevel(userData.upgrades)}</span></div>
                      <div>Status: <span className={`font-medium ${userData.banned ? 'text-red-600' : 'text-green-600'}`}>
                        {userData.banned ? 'Banned' : 'Active'}
                      </span></div>
                    </div>
                    <div className="mt-2 text-xs text-gray-600">
                      <div>Last Login: {userData.lastLogin ? new Date(userData.lastLogin).toLocaleString() : 'Never'}</div>
                      {userData.bannedAt && <div className="text-red-600">Banned: {new Date(userData.bannedAt).toLocaleString()}</div>}
                    </div>
                  </div>
                  <div className="flex flex-col space-y-2 ml-4">
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline" onClick={() => handleAddCoins(username, 1000)}>
                        +1000 ₵
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleAddChips(username, 1000)}>
                        +1000 💰
                      </Button>
                    </div>
                    {!userData.banned ? (
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={userData.isAdmin}
                        onClick={() => handleBanUser(username)}
                      >
                        🚫 Ban User
                      </Button>
                    ) : (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleUnbanUser(username)}
                      >
                        ✅ Unban User
                      </Button>
                    )}
                    {!userData.isAdmin && (
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => handleDeleteUser(username)}
                      >
                        🗑️ Delete User
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {pendingChanges && (
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-yellow-800">Unsaved Changes</h3>
                  <p className="text-sm text-yellow-700">You have made changes that need to be saved. The page will reload to apply changes.</p>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" onClick={handleCancelChanges}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSaveChanges} className="bg-green-600 hover:bg-green-700">
                    Save Changes
                  </Button>
                </div>
              </div>
            </div>
          )}
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
                className="bg-orange-600 hover:bg-orange-700"
              >
                🔄 Reset My Admin Account for Testing
              </Button>
            </div>

            <div className="bg-white p-6 rounded-lg border shadow-sm">
              <h3 className="font-bold text-lg mb-4 text-gray-700">🎮 Quick Actions</h3>
              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  onClick={() => handleAddCoins(currentUser.username, 10000)}
                  className="bg-green-50 hover:bg-green-100 border-green-200"
                >
                  Give Myself 10,000 ₵ Checkels
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleAddChips(currentUser.username, 10000)}
                  className="bg-purple-50 hover:bg-purple-100 border-purple-200"
                >
                  Give Myself 10,000 Chips
                </Button>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border shadow-sm">
              <h3 className="font-bold text-lg mb-4 text-gray-700">⚠️ Danger Zone</h3>
              <div className="space-y-3">
                <Button
                  variant="destructive"
                  onClick={() => {
                    Object.keys(users).forEach(username => {
                      if (!users[username].isAdmin) {
                        localStorage.removeItem(`tree_transactions_${username}`);
                        localStorage.removeItem(`transactions_${username}`);
                        localStorage.removeItem(`tree_generation_${username}`);
                      }
                    });
                    toast({
                      title: "System Reset",
                      description: "All non-admin transaction histories cleared",
                    });
                  }}
                  className="w-full"
                >
                  🗑️ Clear All User Transactions
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    const updatedUsers = { ...users };
                    Object.keys(updatedUsers).forEach(username => {
                      if (!updatedUsers[username].isAdmin) {
                        updatedUsers[username].activeBoosters = [];
                        updatedUsers[username].coins = 0;
                        updatedUsers[username].chips = 0;
                        updatedUsers[username].upgrades = { treeLevel: 1 };
                      }
                    });
                    localStorage.setItem('casinoUsers', JSON.stringify(updatedUsers));
                    setUsers(updatedUsers);
                    toast({
                      title: "Economy Reset",
                      description: "All non-admin accounts reset",
                    });
                  }}
                  className="w-full"
                >
                  💥 Reset All User Accounts
                </Button>
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

const Authentication = () => {
  const [signInUsername, setSignInUsername] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [signUpUsername, setSignUpUsername] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [user, setUser] = useState<any>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const savedUser = localStorage.getItem('casinoUser');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    handleLogin();
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    handleRegister();
  };

  const handleRegister = async () => {
    if (signUpPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    try {
      // Try to register in Supabase first
      const supabaseUser = await signUp(signUpUsername, signUpPassword);
      if (supabaseUser) {
        localStorage.setItem('casinoUser', JSON.stringify(supabaseUser));
        setUser(supabaseUser);
        toast({
          title: "Registration successful!",
          description: `Welcome, ${signUpUsername}!`,
        });
        // Navigate to trigger React Router re-render
        setTimeout(() => navigate('/', { replace: true }), 500);
        return;
      }
    } catch (error) {
      console.error('Supabase registration failed, using localStorage fallback:', error);
    }
  };

  const handleLogin = async () => {
    if (!signInUsername || !signInPassword) {
      toast({
        title: "Missing credentials",
        description: "Please enter both username and password",
        variant: "destructive",
      });
      return;
    }

    try {
      // Try Supabase login first
      const supabaseUser = await signIn(signInUsername, signInPassword);
      if (supabaseUser) {
        localStorage.setItem('casinoUser', JSON.stringify(supabaseUser));
        setUser(supabaseUser);
        toast({
          title: "Login successful!",
          description: `Welcome back, ${signInUsername}!`,
        });
        // Navigate to trigger React Router re-render
        setTimeout(() => navigate('/', { replace: true }), 500);
        return;
      }
    } catch (error) {
      console.error('Supabase login failed, trying localStorage fallback:', error);
    }
  };


  if (user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900"></div>
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
            Sign In or Sign Up
          </p>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="sign-in" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="sign-in">Sign In</TabsTrigger>
              <TabsTrigger value="sign-up">Sign Up</TabsTrigger>
            </TabsList>
            <TabsContent value="sign-in" className="space-y-4">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <Label htmlFor="signInUsername" className="text-white/90">
                    Username
                  </Label>
                  <Input
                    id="signInUsername"
                    type="text"
                    value={signInUsername}
                    onChange={(e) => setSignInUsername(e.target.value)}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                    placeholder="Enter your username"
                  />
                </div>
                <div>
                  <Label htmlFor="signInPassword" className="text-white/90">
                    Password
                  </Label>
                  <Input
                    id="signInPassword"
                    type="password"
                    value={signInPassword}
                    onChange={(e) => setSignInPassword(e.target.value)}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                    placeholder="Enter your password"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                >
                  Sign In
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="sign-up" className="space-y-4">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div>
                  <Label htmlFor="signUpUsername" className="text-white/90">
                    Username
                  </Label>
                  <Input
                    id="signUpUsername"
                    type="text"
                    value={signUpUsername}
                    onChange={(e) => setSignUpUsername(e.target.value)}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                    placeholder="Enter your username"
                  />
                </div>
                <div>
                  <Label htmlFor="signUpPassword" className="text-white/90">
                    Password
                  </Label>
                  <Input
                    id="signUpPassword"
                    type="password"
                    value={signUpPassword}
                    onChange={(e) => setSignUpPassword(e.target.value)}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                    placeholder="Enter your password"
                  />
                </div>
                <div>
                  <Label htmlFor="confirmPassword" className="text-white/90">
                    Confirm Password
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                    placeholder="Confirm your password"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                >
                  Sign Up
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};


export default Index;