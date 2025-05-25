
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TreePine, Coins, Home, Gamepad2, Wallet } from "lucide-react";
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
          <TreeUpgrades user={user} setUser={setUser} />
          <TreeBoosters user={user} setUser={setUser} />
          <WalletCard user={user} />
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
            <Link to="/wallet">
              <Button variant="outline" size="sm" className="flex items-center space-x-2">
                <Wallet className="w-4 h-4" />
                <span>Wallet</span>
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
    const baseInterval = user?.upgrades?.faster_growth ? 8 * 60 * 1000 : 10 * 60 * 1000;
    let coinsToAdd = Math.floor(timeSinceLastClaim / baseInterval);
    
    // Apply upgrades
    if (user?.upgrades?.double_yield) {
      coinsToAdd *= 2;
    }

    // Apply active boosters
    const activeBoosters = JSON.parse(localStorage.getItem('activeBoosters') || '{}');
    Object.entries(activeBoosters).forEach(([id, endTime]: [string, any]) => {
      if (endTime > now) {
        switch(id) {
          case 'double_coins': coinsToAdd *= 2; break;
          case 'triple_coins': coinsToAdd *= 3; break;
          case 'super_boost': coinsToAdd *= 5; break;
        }
      }
    });
    
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

const TreeUpgrades = ({ user, setUser }: any) => {
  const { toast } = useToast();

  const upgrades = [
    {
      id: 'faster_growth',
      name: 'Faster Growth',
      description: '8 min per coin',
      cost: 100,
      effect: 0.8 // 20% faster
    },
    {
      id: 'double_yield',
      name: 'Double Yield',
      description: '2 coins per harvest',
      cost: 200,
      effect: 2
    },
    {
      id: 'auto_harvest',
      name: 'Auto Harvester',
      description: 'Auto claims every hour',
      cost: 300,
      effect: true
    }
  ];

  const purchaseUpgrade = (upgrade: any) => {
    if (user.coins < upgrade.cost) {
      toast({
        title: "Insufficient coins",
        description: `You need ${upgrade.cost} coins to purchase this upgrade`,
        variant: "destructive"
      });
      return;
    }

    const updatedUser = {
      ...user,
      coins: user.coins - upgrade.cost,
      upgrades: {
        ...user.upgrades,
        [upgrade.id]: true
      }
    };

    setUser(updatedUser);
    localStorage.setItem('casinoUser', JSON.stringify(updatedUser));
    
    toast({
      title: "Upgrade Purchased!",
      description: `You have acquired ${upgrade.name}!`,
    });
  };

  return (
    <Card className="bg-blue-50 border-blue-200">
      <CardHeader>
        <CardTitle className="text-blue-700">Tree Upgrades</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {upgrades.map((upgrade) => (
            <div key={upgrade.id} className="flex justify-between items-center p-3 bg-white rounded border">
              <div>
                <p className="font-medium">{upgrade.name}</p>
                <p className="text-sm text-gray-600">{upgrade.description}</p>
                <p className="text-xs text-purple-600">Cost: {upgrade.cost} coins</p>
              </div>
              <Button
                variant={user?.upgrades?.[upgrade.id] ? "ghost" : "outline"}
                size="sm"
                onClick={() => purchaseUpgrade(upgrade)}
                disabled={user?.upgrades?.[upgrade.id]}
              >
                {user?.upgrades?.[upgrade.id] ? "Purchased" : "Buy"}
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

const WalletCard = ({ user }: any) => {
  return (
    <Card className="bg-purple-50 border-purple-200">
      <CardHeader>
        <CardTitle className="text-purple-700">Quick Balance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 p-3 bg-white rounded border">
            <div className="text-center">
              <p className="text-sm text-gray-600">Available Coins</p>
              <p className="font-bold text-lg text-yellow-600">{user.coins}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Casino Chips</p>
              <p className="font-bold text-lg text-green-600">{user.chips}</p>
            </div>
          </div>
          <Link to="/wallet">
            <Button className="w-full">
              Manage Wallet
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};

export default TreePage;


const TreeBoosters = ({ user, setUser }: any) => {
  const { toast } = useToast();
  const [activeBoosters, setActiveBoosters] = useState<{[key: string]: number}>(
    JSON.parse(localStorage.getItem('activeBoosters') || '{}')
  );

  const boosters = [
    {
      id: 'double_coins',
      name: '2x Coins',
      description: 'Double coins for 1 hour',
      duration: 3600000, // 1 hour in ms
      cost: 50,
      multiplier: 2
    },
    {
      id: 'triple_coins',
      name: '3x Coins',
      description: 'Triple coins for 30 minutes',
      duration: 1800000, // 30 minutes in ms
      cost: 100,
      multiplier: 3
    },
    {
      id: 'super_boost',
      name: '5x Coins',
      description: 'Five times coins for 10 minutes',
      duration: 600000, // 10 minutes in ms
      cost: 150,
      multiplier: 5
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const updatedBoosters = { ...activeBoosters };
      let changed = false;

      Object.entries(updatedBoosters).forEach(([id, endTime]) => {
        if (endTime < now) {
          delete updatedBoosters[id];
          changed = true;
          toast({
            title: "Booster Expired",
            description: `The ${boosters.find(b => b.id === id)?.name} booster has expired!`,
          });
        }
      });

      if (changed) {
        setActiveBoosters(updatedBoosters);
        localStorage.setItem('activeBoosters', JSON.stringify(updatedBoosters));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeBoosters]);

  const activateBooster = (booster: any) => {
    if (user.coins < booster.cost) {
      toast({
        title: "Insufficient coins",
        description: `You need ${booster.cost} coins to activate this booster`,
        variant: "destructive"
      });
      return;
    }

    const now = Date.now();
    const updatedBoosters = {
      ...activeBoosters,
      [booster.id]: now + booster.duration
    };

    const updatedUser = {
      ...user,
      coins: user.coins - booster.cost
    };

    setActiveBoosters(updatedBoosters);
    setUser(updatedUser);
    
    localStorage.setItem('activeBoosters', JSON.stringify(updatedBoosters));
    localStorage.setItem('casinoUser', JSON.stringify(updatedUser));

    toast({
      title: "Booster Activated!",
      description: `${booster.name} is now active!`,
    });
  };

  const getTimeRemaining = (endTime: number) => {
    const remaining = Math.max(0, endTime - Date.now());
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="bg-purple-50 border-purple-200">
      <CardHeader>
        <CardTitle className="text-purple-700">Boosters</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {boosters.map((booster) => (
            <div key={booster.id} className="flex justify-between items-center p-3 bg-white rounded border">
              <div>
                <p className="font-medium">{booster.name}</p>
                <p className="text-sm text-gray-600">{booster.description}</p>
                <p className="text-xs text-purple-600">Cost: {booster.cost} coins</p>
                {activeBoosters[booster.id] && (
                  <p className="text-xs text-green-600">
                    Time remaining: {getTimeRemaining(activeBoosters[booster.id])}
                  </p>
                )}
              </div>
              <Button
                variant={activeBoosters[booster.id] ? "ghost" : "outline"}
                size="sm"
                onClick={() => activateBooster(booster)}
                disabled={!!activeBoosters[booster.id]}
              >
                {activeBoosters[booster.id] ? "Active" : "Activate"}
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
