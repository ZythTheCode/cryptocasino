import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Coins, TreePine, Gamepad2, Settings, Wallet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

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
        coins: 100, // Starting coins
        chips: 0,
        lastLogin: Date.now(),
        isAdmin: username === 'admin',
        treeLastClaim: Date.now()
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
            <span>{user?.coins || 0} Coins</span>
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
              <span>Coins</span>
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
        </div>
      </CardContent>
    </Card>
  );
};

const AdminQuickAccess = () => {
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
          <Button variant="outline" className="w-full" onClick={() => alert('Admin features coming soon!')}>
            Manage Users
          </Button>
          <Button variant="outline" className="w-full" onClick={() => alert('Admin features coming soon!')}>
            View Reports
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default Index;
