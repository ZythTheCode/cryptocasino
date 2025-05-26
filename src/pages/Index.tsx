import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Coins, TreePine, Gamepad2, Settings, Wallet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

// Import calculateTreeLevel function for admin features
const calculateTreeLevel = (upgrades: any) => {
  if (!upgrades) return 1;
  const tier = upgrades.tier || 1;
  return tier; // Tree level directly matches the tier
};

const Index = () => {
  const [user, setUser] = useState<any>(null);
  const [showLogin, setShowLogin] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('casinoUser');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
      setShowLogin(false);
    }
  }, []);

  const handleLogin = (userData: any) => {
    setUser(userData);
    setShowLogin(false);
    localStorage.setItem('casinoUser', JSON.stringify(userData));
  };

  if (showLogin) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <Header user={user} setUser={setUser} setShowLogin={setShowLogin} />
      <MainDashboard user={user} />
    </div>
  );
};

const LoginScreen = ({ onLogin }: { onLogin: (user: any) => void }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!username || !password) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    const users = JSON.parse(localStorage.getItem('casinoUsers') || '{}');

    if (isRegister) {
      if (users[username]) {
        toast({
          title: "Error",
          description: "Username already exists",
          variant: "destructive",
        });
        return;
      }

      const newUser = {
        username,
        password, // In real app, this would be hashed
        coins: username === 'admin' ? 10000 : 100, // More coins for admin
        chips: username === 'admin' ? 1000 : 0,
        lastLogin: Date.now(),
        isAdmin: username === 'admin',
        treeLastClaim: Date.now(),
        upgrades: {}
      };

      users[username] = newUser;
      localStorage.setItem('casinoUsers', JSON.stringify(users));
      onLogin(newUser);

      toast({
        title: "Success",
        description: "Account created successfully!",
      });
    } else {
      const user = users[username];
      if (!user || user.password !== password) {
        toast({
          title: "Error",
          description: "Invalid username or password",
          variant: "destructive",
        });
        return;
      }

      // Calculate offline coins
      const timeDiff = Date.now() - user.lastLogin;
      const offlineCoins = Math.floor(timeDiff / (10 * 60 * 1000)); // 1 coin per 10 minutes
      user.coins += offlineCoins;
      user.lastLogin = Date.now();

      users[username] = user;
      localStorage.setItem('casinoUsers', JSON.stringify(users));
      onLogin(user);

      if (offlineCoins > 0) {
        toast({
          title: "Welcome back!",
          description: `You earned ${offlineCoins} coins while away!`,
        });
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-bold">
            🎰 Crypto Casino
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="Enter username"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="Enter password"
              />
            </div>
            <Button type="submit" className="w-full">
              {isRegister ? 'Register' : 'Login'}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              className="w-full"
              onClick={() => setIsRegister(!isRegister)}
            >
              {isRegister ? 'Already have an account? Login' : 'Need an account? Register'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

const Header = ({ user, setUser, setShowLogin }: any) => {
  const handleLogout = () => {
    localStorage.removeItem('casinoUser');
    setUser(null);
    setShowLogin(true);
  };

  return (
    <header className="bg-black/20 backdrop-blur-sm p-4">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">🎰 Crypto Casino</h1>
        <div className="flex items-center space-x-6 text-white">
          <div className="flex items-center space-x-2">
            <Coins className="w-5 h-5 text-yellow-400" />
            <span>{user?.coins || 0} ₵checkels</span>
          </div>
          <div className="flex items-center space-x-2">
            <Wallet className="w-5 h-5 text-green-400" />
            <span>{user?.chips || 0} Chips</span>
          </div>
          <span>Welcome, {user?.username}</span>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
};

const MainDashboard = ({ user }: any) => {
  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <QuickStats user={user} />
        <NavigationCard />
        {user?.isAdmin && <AdminQuickAccess />}
      </div>
    </div>
  );
};

const QuickStats = ({ user }: any) => {
  return (
    <Card className="bg-gradient-to-r from-yellow-50 to-green-50 border-yellow-200">
      <CardHeader>
        <CardTitle className="text-yellow-700">Your Crypto Empire</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="flex items-center space-x-2">
              <Coins className="w-4 h-4 text-yellow-600" />
              <span>₵checkels</span>
            </span>
            <span className="font-bold text-yellow-600">{user?.coins || 0}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="flex items-center space-x-2">
              <Wallet className="w-4 h-4 text-green-600" />
              <span>Chips</span>
            </span>
            <span className="font-bold text-green-600">{user?.chips || 0}</span>
          </div>
          <div className="text-center pt-4">
            <p className="text-sm text-gray-600">Welcome back, {user?.username}!</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const NavigationCard = () => {
  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>Choose Your Adventure</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link to="/tree">
            <Card className="hover:bg-green-50 transition-colors cursor-pointer">
              <CardContent className="p-6 text-center">
                <TreePine className="w-12 h-12 text-green-600 mx-auto mb-4" />
                <h3 className="font-bold text-lg mb-2">Money Tree Farm</h3>
                <p className="text-gray-600 text-sm">Grow your crypto coins passively</p>
                <Button className="mt-4 w-full" variant="outline">
                  Visit Tree
                </Button>
              </CardContent>
            </Card>
          </Link>

          <Link to="/casino">
            <Card className="hover:bg-purple-50 transition-colors cursor-pointer">
              <CardContent className="p-6 text-center">
                <Gamepad2 className="w-12 h-12 text-purple-600 mx-auto mb-4" />
                <h3 className="font-bold text-lg mb-2">Casino Games</h3>
                <p className="text-gray-600 text-sm">Play games and win big</p>
                <Button className="mt-4 w-full" variant="outline">
                  Enter Casino
                </Button>
              </CardContent>
            </Card>
          </Link>

          <Link to="/wallet">
            <Card className="hover:bg-blue-50 transition-colors cursor-pointer">
              <CardContent className="p-6 text-center">
                <Wallet className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                <h3 className="font-bold text-lg mb-2">Crypto Wallet</h3>
                <p className="text-gray-600 text-sm">Manage your coins and chips</p>
                <Button className="mt-4 w-full" variant="outline">
                  Open Wallet
                </Button>
              </CardContent>
            </Card>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};

const AdminQuickAccess = () => {
  const [showUserManager, setShowUserManager] = useState(false);
  const [showReports, setShowReports] = useState(false);
  const [users, setUsers] = useState<any>({});
  const { toast } = useToast();

  useEffect(() => {
    const savedUsers = JSON.parse(localStorage.getItem('casinoUsers') || '{}');
    setUsers(savedUsers);
  }, [showUserManager, showReports]);

  const handleAddCoins = (username: string, amount: number) => {
    const updatedUsers = { ...users };
    updatedUsers[username].coins += amount;

    localStorage.setItem('casinoUsers', JSON.stringify(updatedUsers));
    setUsers(updatedUsers);

    // Update current user if it's the same user
    const currentUser = JSON.parse(localStorage.getItem('casinoUser') || '{}');
    if (currentUser.username === username) {
      localStorage.setItem('casinoUser', JSON.stringify(updatedUsers[username]));
    }

    toast({
      title: "Coins Added",
      description: `Added ${amount} coins to ${username}`,
    });
  };

  const handleResetUser = (username: string) => {
    const updatedUsers = { ...users };
    updatedUsers[username] = {
      ...updatedUsers[username],
      coins: 100,
      chips: 0,
      upgrades: {},
      activeBoosters: [],
      upgradeResetTime: null
    };

    localStorage.setItem('casinoUsers', JSON.stringify(updatedUsers));
    setUsers(updatedUsers);

    // Clear user transactions
    localStorage.removeItem(`tree_transactions_${username}`);
    localStorage.removeItem(`transactions_${username}`);

    // Update current user if it's the same user
    const currentUser = JSON.parse(localStorage.getItem('casinoUser') || '{}');
    if (currentUser.username === username) {
      localStorage.setItem('casinoUser', JSON.stringify(updatedUsers[username]));
    }

    toast({
      title: "User Reset",
      description: `${username} has been reset to default state`,
    });
  };

  const handleDeleteUser = (username: string) => {
    if (username === 'admin') {
      toast({
        title: "Cannot Delete",
        description: "Cannot delete admin account",
        variant: "destructive",
      });
      return;
    }

    const updatedUsers = { ...users };
    delete updatedUsers[username];

    localStorage.setItem('casinoUsers', JSON.stringify(updatedUsers));
    setUsers(updatedUsers);

    // Clear user transactions
    localStorage.removeItem(`tree_transactions_${username}`);
    localStorage.removeItem(`transactions_${username}`);

    toast({
      title: "User Deleted",
      description: `${username} has been deleted`,
    });
  };

  const getTotalStats = () => {
    const userList = Object.values(users);
    return {
      totalUsers: userList.length,
      totalCoins: userList.reduce((sum: number, user: any) => sum + (user.coins || 0), 0),
      totalChips: userList.reduce((sum: number, user: any) => sum + (user.chips || 0), 0),
      activeUsers: userList.filter((user: any) => 
        user.lastLogin && Date.now() - user.lastLogin < 24 * 60 * 60 * 1000
      ).length
    };
  };

  if (showUserManager) {
    return (
      <Card className="border-red-200 bg-red-50 lg:col-span-3">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-red-600">
            <span className="flex items-center space-x-2">
              <Settings className="w-6 h-6" />
              <span>User Management</span>
            </span>
            <Button variant="outline" size="sm" onClick={() => setShowUserManager(false)}>
              Close
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {Object.entries(users).map(([username, userData]: [string, any]) => (
              <div key={username} className="p-4 bg-white rounded border">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-bold text-lg">
                      {username} {userData.isAdmin && <span className="text-red-500 text-sm">(Admin)</span>}
                    </h3>
                    <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                      <div>Coins: <span className="font-medium text-green-600">{userData.coins || 0}</span></div>
                      <div>Chips: <span className="font-medium text-blue-600">{userData.chips || 0}</span></div>
                      <div>Level: <span className="font-medium">{calculateTreeLevel(userData.upgrades)}</span></div>
                      <div>Last Login: <span className="font-medium">
                        {userData.lastLogin ? new Date(userData.lastLogin).toLocaleDateString() : 'Never'}
                      </span></div>
                    </div>
                    <div className="mt-2">
                      <p className="text-xs text-gray-600">
                        Upgrades: {Object.values(userData.upgrades || {}).filter(Boolean).length}/3
                      </p>
                      <p className="text-xs text-gray-600">
                        Active Boosters: {(userData.activeBoosters || []).filter((b: any) => Date.now() < b.endTime).length}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col space-y-2 ml-4">
                    <Button size="sm" variant="outline" onClick={() => handleAddCoins(username, 1000)}>
                      +1000 Coins
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleAddCoins(username, 10000)}>
                      +10000 Coins
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleResetUser(username)}>
                      Reset User
                    </Button>
                    {!userData.isAdmin && (
                      <Button size="sm" variant="destructive" onClick={() => handleDeleteUser(username)}>
                        Delete User
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (showReports) {
    const stats = getTotalStats();
    return (
      <Card className="border-red-200 bg-red-50 lg:col-span-3">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-red-600">
            <span className="flex items-center space-x-2">
              <Settings className="w-6 h-6" />
              <span>System Reports</span>
            </span>
            <Button variant="outline" size="sm" onClick={() => setShowReports(false)}>
              Close
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-white rounded border">
              <h3 className="font-bold text-2xl text-blue-600">{stats.totalUsers}</h3>
              <p className="text-sm text-gray-600">Total Users</p>
            </div>
            <div className="text-center p-4 bg-white rounded border">
              <h3 className="font-bold text-2xl text-green-600">{stats.totalCoins.toFixed(0)}</h3>
              <p className="text-sm text-gray-600">Total Coins</p>
            </div>
            <div className="text-center p-4 bg-white rounded border">
              <h3 className="font-bold text-2xl text-purple-600">{stats.totalChips.toFixed(0)}</h3>
              <p className="text-sm text-gray-600">Total Chips</p>
            </div>
            <div className="text-center p-4 bg-white rounded border">
              <h3 className="font-bold text-2xl text-orange-600">{stats.activeUsers}</h3>
              <p className="text-sm text-gray-600">Active Users (24h)</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white p-4 rounded border">
              <h3 className="font-bold mb-3">Top Users by Coins</h3>
              <div className="space-y-2">
                {Object.entries(users)
                  .sort(([,a]: [string, any], [,b]: [string, any]) => (b.coins || 0) - (a.coins || 0))
                  .slice(0, 5)
                  .map(([username, userData]: [string, any], index) => (
                    <div key={username} className="flex justify-between items-center text-sm">
                      <span>#{index + 1} {username}</span>
                      <span className="font-medium text-green-600">{userData.coins || 0} coins</span>
                    </div>
                  ))}
              </div>
            </div>

            <div className="bg-white p-4 rounded border">
              <h3 className="font-bold mb-3">User Activity Summary</h3>
              <div className="space-y-2 text-sm">
                {Object.entries(users).map(([username, userData]: [string, any]) => (
                  <div key={username} className="flex justify-between items-center">
                    <span>{username}</span>
                    <div className="text-right">
                      <div>Level {calculateTreeLevel(userData.upgrades)}</div>
                      <div className="text-xs text-gray-500">
                        {userData.lastLogin ? 
                          `Active ${Math.floor((Date.now() - userData.lastLogin) / (1000 * 60 * 60 * 24))}d ago` : 
                          'Never logged in'
                        }
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-4 rounded border">
              <h3 className="font-bold mb-3">Economy Controls</h3>
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    // Clear all transactions
                    Object.keys(users).forEach(username => {
                      localStorage.removeItem(`tree_transactions_${username}`);
                      localStorage.removeItem(`transactions_${username}`);
                    });
                    toast({
                      title: "Economy Reset",
                      description: "All transaction histories cleared",
                    });
                  }}
                >
                  Clear All Transactions
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    // Reset all user boosters
                    const updatedUsers = { ...users };
                    Object.keys(updatedUsers).forEach(username => {
                      updatedUsers[username].activeBoosters = [];
                      updatedUsers[username].upgradeResetTime = null;
                    });
                    localStorage.setItem('casinoUsers', JSON.stringify(updatedUsers));
                    setUsers(updatedUsers);
                    toast({
                      title: "Boosters Reset",
                      description: "All active boosters cleared",
                    });
                  }}
                >
                  Clear All Boosters
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-red-200 bg-red-50">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-red-600">
          <Settings className="w-6 h-6" />
          <span>Admin Access</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Button variant="outline" className="w-full" onClick={() => setShowUserManager(true)}>
            Manage Users
          </Button>
          <Button variant="outline" className="w-full" onClick={() => setShowReports(true)}>
            View Reports
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default Index;