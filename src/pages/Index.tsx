
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Coins, TreePine, Gamepad2, Settings, Wallet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
      <CasinoDashboard user={user} setUser={setUser} />
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

const CasinoDashboard = ({ user, setUser }: any) => {
  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <MoneyTree user={user} setUser={setUser} />
        <WalletCard user={user} setUser={setUser} />
        <GamesGrid />
        {user?.isAdmin && <AdminPanel />}
      </div>
    </div>
  );
};

const MoneyTree = ({ user, setUser }: any) => {
  const [timeToNext, setTimeToNext] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const timeSinceLastClaim = now - (user?.treeLastClaim || now);
      const timeToNextCoin = 10 * 60 * 1000 - (timeSinceLastClaim % (10 * 60 * 1000));
      
      const minutes = Math.floor(timeToNextCoin / 60000);
      const seconds = Math.floor((timeToNextCoin % 60000) / 1000);
      setTimeToNext(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [user]);

  const claimCoins = () => {
    const now = Date.now();
    const timeSinceLastClaim = now - (user?.treeLastClaim || 0);
    const coinsToAdd = Math.floor(timeSinceLastClaim / (10 * 60 * 1000));
    
    if (coinsToAdd > 0) {
      const updatedUser = {
        ...user,
        coins: user.coins + coinsToAdd,
        treeLastClaim: now
      };
      
      setUser(updatedUser);
      localStorage.setItem('casinoUser', JSON.stringify(updatedUser));
      
      const users = JSON.parse(localStorage.getItem('casinoUsers') || '{}');
      users[user.username] = updatedUser;
      localStorage.setItem('casinoUsers', JSON.stringify(users));
      
      toast({
        title: "Coins Claimed!",
        description: `You earned ${coinsToAdd} coins from your Money Tree!`,
      });
    } else {
      toast({
        title: "No coins ready",
        description: "Wait for the next coin to be ready!",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="bg-green-50 border-green-200">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <TreePine className="w-6 h-6 text-green-600" />
          <span>Money Tree</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center">
          <div className="text-4xl mb-4">🌳</div>
          <p className="text-sm text-gray-600 mb-2">Next coin in:</p>
          <p className="text-xl font-bold text-green-600 mb-4">{timeToNext}</p>
          <Button onClick={claimCoins} className="w-full">
            Claim Coins
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const WalletCard = ({ user, setUser }: any) => {
  const [convertAmount, setConvertAmount] = useState(1);
  const { toast } = useToast();

  const handleConvert = () => {
    if (convertAmount > user.coins) {
      toast({
        title: "Insufficient coins",
        description: "You don't have enough coins to convert",
        variant: "destructive",
      });
      return;
    }

    const updatedUser = {
      ...user,
      coins: user.coins - convertAmount,
      chips: user.chips + (convertAmount * 10)
    };

    setUser(updatedUser);
    localStorage.setItem('casinoUser', JSON.stringify(updatedUser));
    
    const users = JSON.parse(localStorage.getItem('casinoUsers') || '{}');
    users[user.username] = updatedUser;
    localStorage.setItem('casinoUsers', JSON.stringify(users));

    toast({
      title: "Conversion successful!",
      description: `Converted ${convertAmount} coins to ${convertAmount * 10} chips`,
    });
  };

  return (
    <Card className="bg-blue-50 border-blue-200">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Wallet className="w-6 h-6 text-blue-600" />
          <span>Wallet</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600">Exchange Rate:</p>
            <p className="font-bold">1 Coin = 10 Chips</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Convert Coins:</label>
            <input
              type="number"
              min="1"
              max={user?.coins || 0}
              value={convertAmount}
              onChange={(e) => setConvertAmount(parseInt(e.target.value) || 1)}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
          <Button onClick={handleConvert} className="w-full" disabled={!user?.coins}>
            Convert to {convertAmount * 10} Chips
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const GamesGrid = () => {
  const games = [
    { name: 'Color Game', icon: '🎨', path: '/color-game' },
    { name: 'Blackjack', icon: '🃏', path: '/blackjack' },
    { name: 'Poker', icon: '♠️', path: '/poker' },
    { name: 'Slot Machine', icon: '🎰', path: '/slots' },
    { name: 'Baccarat', icon: '🎲', path: '/baccarat' },
  ];

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Gamepad2 className="w-6 h-6" />
          <span>Casino Games</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {games.map((game) => (
            <Button
              key={game.name}
              variant="outline"
              className="h-20 flex flex-col items-center justify-center space-y-2"
              onClick={() => alert(`${game.name} coming soon!`)}
            >
              <span className="text-2xl">{game.icon}</span>
              <span className="text-sm">{game.name}</span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

const AdminPanel = () => {
  return (
    <Card className="border-red-200 bg-red-50">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-red-600">
          <Settings className="w-6 h-6" />
          <span>Admin Panel</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Button variant="outline" className="w-full" onClick={() => alert('Admin features coming soon!')}>
            View All Users
          </Button>
          <Button variant="outline" className="w-full" onClick={() => alert('Admin features coming soon!')}>
            Game Logs
          </Button>
          <Button variant="outline" className="w-full" onClick={() => alert('Admin features coming soon!')}>
            Manage Balances
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default Index;
