
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TreePine, Coins, Home, Gamepad2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

const TreePage = () => {
  const [user, setUser] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    const savedUser = localStorage.getItem('casinoUser');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    } else {
      // Redirect to home if not logged in
      window.location.href = '/';
    }
  }, []);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-900 via-emerald-900 to-teal-900">
        <Card>
          <CardContent className="p-6">
            <p>Please log in to access the Money Tree</p>
            <Link to="/">
              <Button className="mt-4">Go to Login</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-emerald-900 to-teal-900">
      <TreeHeader user={user} />
      <div className="max-w-4xl mx-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <MoneyTreeCard user={user} setUser={setUser} />
          <EarningsStats user={user} />
          <TreeUpgrades />
          <CryptoWallet user={user} setUser={setUser} />
        </div>
      </div>
    </div>
  );
};

const TreeHeader = ({ user }: any) => {
  return (
    <header className="bg-black/20 backdrop-blur-sm p-4">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white flex items-center space-x-2">
          <TreePine className="w-8 h-8 text-green-400" />
          <span>Money Tree Farm</span>
        </h1>
        <div className="flex items-center space-x-6 text-white">
          <div className="flex items-center space-x-2">
            <Coins className="w-5 h-5 text-yellow-400" />
            <span>{user?.coins || 0} Coins</span>
          </div>
          <div className="flex items-center space-x-4">
            <Link to="/">
              <Button variant="outline" size="sm" className="flex items-center space-x-2">
                <Home className="w-4 h-4" />
                <span>Home</span>
              </Button>
            </Link>
            <Link to="/casino">
              <Button variant="outline" size="sm" className="flex items-center space-x-2">
                <Gamepad2 className="w-4 h-4" />
                <span>Casino</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
};

const MoneyTreeCard = ({ user, setUser }: any) => {
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
    <Card className="bg-green-50 border-green-200 md:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-green-700">
          <TreePine className="w-8 h-8" />
          <span>Your Money Tree</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center">
          <div className="text-8xl mb-6">🌳</div>
          <div className="mb-6">
            <p className="text-lg text-gray-600 mb-2">Next coin ready in:</p>
            <p className="text-3xl font-bold text-green-600 mb-2">{timeToNext}</p>
            <p className="text-sm text-gray-500">1 coin every 10 minutes</p>
          </div>
          <Button onClick={claimCoins} size="lg" className="w-full">
            🪙 Claim Available Coins
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const EarningsStats = ({ user }: any) => {
  const calculateStats = () => {
    const now = Date.now();
    const timeSinceLastClaim = now - (user?.treeLastClaim || now);
    const availableCoins = Math.floor(timeSinceLastClaim / (10 * 60 * 1000));
    
    return {
      availableCoins,
      dailyPotential: 144, // 24 hours * 6 coins per hour
      totalEarned: user?.coins || 0
    };
  };

  const stats = calculateStats();

  return (
    <Card className="bg-yellow-50 border-yellow-200">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-yellow-700">
          <Coins className="w-6 h-6" />
          <span>Earnings Stats</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between">
            <span className="text-gray-600">Available Now:</span>
            <span className="font-bold text-green-600">{stats.availableCoins} coins</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Daily Potential:</span>
            <span className="font-bold">{stats.dailyPotential} coins</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Total Balance:</span>
            <span className="font-bold text-yellow-600">{stats.totalEarned} coins</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const TreeUpgrades = () => {
  return (
    <Card className="bg-blue-50 border-blue-200">
      <CardHeader>
        <CardTitle className="text-blue-700">Tree Upgrades</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between items-center p-3 bg-white rounded border">
            <div>
              <p className="font-medium">Faster Growth</p>
              <p className="text-sm text-gray-600">8 min per coin</p>
            </div>
            <Button variant="outline" size="sm" disabled>
              Coming Soon
            </Button>
          </div>
          <div className="flex justify-between items-center p-3 bg-white rounded border">
            <div>
              <p className="font-medium">Double Yield</p>
              <p className="text-sm text-gray-600">2 coins per harvest</p>
            </div>
            <Button variant="outline" size="sm" disabled>
              Coming Soon
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const CryptoWallet = ({ user, setUser }: any) => {
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
    <Card className="bg-purple-50 border-purple-200">
      <CardHeader>
        <CardTitle className="text-purple-700">Convert to Chips</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="text-center p-3 bg-white rounded border">
            <p className="font-bold text-lg">1 Coin = 10 Casino Chips</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Convert Amount:</label>
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

export default TreePage;
