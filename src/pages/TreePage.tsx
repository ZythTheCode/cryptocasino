import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  TreePine,
  Coins,
  Home,
  Gamepad2,
  Wallet,
  Zap,
  Clock,
  History,
  TrendingUp,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

const calculateTreeLevel = (upgrades: any) => {
  if (!upgrades) return 1;
  return upgrades.treeLevel || 1;
};

const calculateBaseCPS = (level: number) => {
  return 0.00167 * Math.pow(1.1, level - 1);
};

const calculateBonusYield = (level: number) => {
  return Math.floor(level * 0.5); // 0.5% per level
};

const calculateMaxGenerationTime = (level: number) => {
  const baseTime = 1800; // 30 minutes base
  const storageMultiplier = 1 + (level - 1) * 0.1; // 10% increase per level
  return Math.floor(baseTime * storageMultiplier);
};

const calculateLevelUpCost = (currentLevel: number) => {
  return Math.floor(100 * Math.pow(1.5, currentLevel - 1));
};

const getTreeImage = (level: number) => {
  if (level >= 80) return "🌳"; // Ancient Tree
  if (level >= 60) return "🌲"; // Mature Tree
  if (level >= 40) return "🌱"; // Growing Tree
  if (level >= 20) return "🪴"; // Young Tree
  return "🌿"; // Seedling
};

const formatDuration = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
};

const TreePage = () => {
  const [user, setUser] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    const savedUser = localStorage.getItem("casinoUser");
    if (savedUser) {
      const userData = JSON.parse(savedUser);

      // Initialize tree level if not exists
      if (!userData.upgrades?.treeLevel) {
        userData.upgrades = {
          ...userData.upgrades,
          treeLevel: 1,
        };
      }

      // Calculate offline earnings
      const lastVisit = userData.treeLastVisit || Date.now();
      const level = calculateTreeLevel(userData.upgrades);
      const maxGenerationTime = calculateMaxGenerationTime(level);
      const offlineTime = Math.min(
        Date.now() - lastVisit,
        maxGenerationTime * 1000,
      );

      if (offlineTime > 0) {
        const baseCPS = calculateBaseCPS(level);
        const offlineCoins = (offlineTime / 1000) * baseCPS;

        if (offlineCoins > 0.001) {
          userData.coins += offlineCoins;

          const transaction = {
            type: "offline",
            amount: offlineCoins,
            timestamp: Date.now(),
            description: `Offline earnings (${Math.floor(offlineTime / 60000)} minutes)`,
          };

          const transactions = JSON.parse(
            localStorage.getItem(`tree_transactions_${userData.username}`) ||
              "[]",
          );
          transactions.unshift(transaction);
          localStorage.setItem(
            `tree_transactions_${userData.username}`,
            JSON.stringify(transactions.slice(0, 50)),
          );

          localStorage.setItem("casinoUser", JSON.stringify(userData));
          const users = JSON.parse(localStorage.getItem("casinoUsers") || "{}");
          users[userData.username] = userData;
          localStorage.setItem("casinoUsers", JSON.stringify(users));

          setTimeout(() => {
            toast({
              title: "Welcome back!",
              description: `You earned ${offlineCoins.toFixed(3)} ₵ while offline!`,
            });
          }, 500);
        }
      }

      userData.treeLastVisit = Date.now();
      localStorage.setItem("casinoUser", JSON.stringify(userData));
      const users = JSON.parse(localStorage.getItem("casinoUsers") || "{}");
      users[userData.username] = userData;
      localStorage.setItem("casinoUsers", JSON.stringify(users));

      setUser(userData);
    } else {
      window.location.href = "/";
    }
  }, []);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-900 via-blue-900 to-indigo-900">
        <Card>
          <CardContent className="p-6">
            <p>Please log in to access the Tree</p>
            <Link to="/">
              <Button className="mt-4">Go to Login</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-blue-900 to-indigo-900">
      <header className="bg-black/20 backdrop-blur-sm p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white flex items-center space-x-2">
            <TreePine className="w-8 h-8 text-green-400" />
            <span>Money Tree Farm</span>
          </h1>
          <div className="flex items-center space-x-6 text-white">
            <div className="flex items-center space-x-2">
              <Coins className="w-5 h-5 text-yellow-400" />
              <span>{user?.coins?.toFixed(2) || "0.00"} ₵ Checkels</span>
            </div>
            <span className="text-white">Welcome, {user?.username}</span>
            <Link to="/">
              <Button
                variant="outline"
                size="sm"
                className="flex items-center space-x-2"
              >
                <Home className="w-4 h-4" />
                <span>Home</span>
              </Button>
            </Link>
            <Link to="/casino">
              <Button
                variant="outline"
                size="sm"
                className="flex items-center space-x-2"
              >
                <Gamepad2 className="w-4 h-4" />
                <span>Casino</span>
              </Button>
            </Link>
            <Link to="/wallet">
              <Button
                variant="outline"
                size="sm"
                className="flex items-center space-x-2"
              >
                <Wallet className="w-4 h-4" />
                <span>Wallet</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>
      <div className="max-w-6xl mx-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <MoneyTreeCard user={user} setUser={setUser} />
          <TreeLevelingCard user={user} setUser={setUser} />
          <BoosterStore user={user} setUser={setUser} />
          <TransactionHistory user={user} />
        </div>
      </div>
    </div>
  );
};

const MoneyTreeCard = ({ user, setUser }: any) => {
  const { toast } = useToast();
  const [currentCheckels, setCurrentCheckels] = useState(0);
  const [lastClaimTime, setLastClaimTime] = useState(Date.now());
  const [generationActive, setGenerationActive] = useState(true);

  const level = calculateTreeLevel(user?.upgrades);
  const baseCPS = calculateBaseCPS(level);
  const bonusYield = calculateBonusYield(level);
  const maxGenerationTime = calculateMaxGenerationTime(level);

  // Calculate total booster multiplier from active boosters
  const activeBoosters = user?.activeBoosters || [];
  const now = Date.now();
  const validBoosters = activeBoosters.filter(
    (booster: any) => now < booster.endTime,
  );
  const totalMultiplier = validBoosters.reduce(
    (total: number, booster: any) => total * booster.multiplier,
    1,
  );

  const finalCPS = baseCPS * totalMultiplier;

  useEffect(() => {
    const savedGenerationState = localStorage.getItem(
      `tree_generation_${user?.username}`,
    );
    if (savedGenerationState) {
      const state = JSON.parse(savedGenerationState);
      setCurrentCheckels(state.currentCheckels || 0);
      setLastClaimTime(state.lastClaimTime || Date.now());
      setGenerationActive(state.generationActive !== false);
    }
  }, [user?.username]);

  const saveGenerationState = () => {
    if (user?.username) {
      const state = {
        currentCheckels,
        lastClaimTime,
        generationActive,
      };
      localStorage.setItem(
        `tree_generation_${user.username}`,
        JSON.stringify(state),
      );
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();

      const activeBoosters = user?.activeBoosters || [];
      const validBoosters = activeBoosters.filter(
        (booster: any) => now < booster.endTime,
      );

      if (validBoosters.length !== activeBoosters.length) {
        const updatedUser = {
          ...user,
          activeBoosters: validBoosters,
        };
        setUser(updatedUser);
        localStorage.setItem("casinoUser", JSON.stringify(updatedUser));

        const users = JSON.parse(localStorage.getItem("casinoUsers") || "{}");
        users[user.username] = updatedUser;
        localStorage.setItem("casinoUsers", JSON.stringify(users));
      }

      const timeElapsed = (now - lastClaimTime) / 1000;

      if (timeElapsed <= maxGenerationTime && generationActive) {
        setCurrentCheckels((prev) => prev + finalCPS);
      } else {
        setGenerationActive(false);
      }

      saveGenerationState();
    }, 1000);

    return () => clearInterval(interval);
  }, [
    lastClaimTime,
    finalCPS,
    maxGenerationTime,
    user?.activeBoosters,
    currentCheckels,
    generationActive,
    user,
  ]);

  useEffect(() => {
    saveGenerationState();
  }, [user?.upgrades, finalCPS, maxGenerationTime]);

  const claimCheckels = () => {
    if (currentCheckels === 0) {
      toast({
        title: "No Checkels to claim",
        description: "Wait for Checkels to generate",
        variant: "destructive",
      });
      return;
    }

    let finalCheckels = currentCheckels;

    // Apply bonus yield
    if (bonusYield > 0) {
      finalCheckels *= 1 + (bonusYield / 100);
    }

    const updatedUser = {
      ...user,
      coins: user.coins + finalCheckels,
    };

    setUser(updatedUser);
    localStorage.setItem("casinoUser", JSON.stringify(updatedUser));

    const users = JSON.parse(localStorage.getItem("casinoUsers") || "{}");
    users[user.username] = updatedUser;
    localStorage.setItem("casinoUsers", JSON.stringify(users));

    const transaction = {
      type: "claim",
      amount: finalCheckels,
      timestamp: Date.now(),
      description: "Claimed Checkels from tree",
    };

    const transactions = JSON.parse(
      localStorage.getItem(`tree_transactions_${user.username}`) || "[]",
    );
    transactions.unshift(transaction);
    localStorage.setItem(
      `tree_transactions_${user.username}`,
      JSON.stringify(transactions.slice(0, 50)),
    );

    updatedUser.treeLastVisit = Date.now();
    localStorage.setItem("casinoUser", JSON.stringify(updatedUser));
    users[user.username] = updatedUser;
    localStorage.setItem("casinoUsers", JSON.stringify(users));

    const newClaimTime = Date.now();
    setCurrentCheckels(0);
    setLastClaimTime(newClaimTime);
    setGenerationActive(true);

    saveGenerationState();

    toast({
      title: "Checkels claimed!",
      description: `You earned ${finalCheckels.toFixed(3)} ₵Checkels`,
    });
  };

  return (
    <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center space-x-2">
            <span className="text-4xl">{getTreeImage(level)}</span>
            <span className="text-green-700">Level {level} Tree</span>
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="text-center p-4 bg-white rounded-lg border">
            <p className="text-2xl font-bold text-green-600">
              ₵{currentCheckels.toFixed(3)}
            </p>
            <p className="text-sm text-gray-600">Current Checkels</p>
          </div>

          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="text-center p-2 bg-green-50 rounded">
              <p className="font-medium">CPS</p>
              <p className="text-green-600 font-bold">
                {finalCPS.toFixed(5)}
              </p>
              {totalMultiplier > 1 && (
                <p className="text-xs text-orange-600">
                  {totalMultiplier.toFixed(1)}x Boost
                </p>
              )}
            </div>
            <div className="text-center p-2 bg-purple-50 rounded">
              <p className="font-medium">Bonus Yield</p>
              <p className="text-purple-600 font-bold">
                +{bonusYield}%
              </p>
            </div>
            <div className="text-center p-2 bg-blue-50 rounded">
              <p className="font-medium">Max Duration</p>
              <p className="text-blue-600 font-bold">
                {formatDuration(maxGenerationTime)}
              </p>
            </div>
          </div>

          {!generationActive && (
            <div className="text-center text-red-600 text-sm">
              No ₵Checkels generating – please claim to restart
            </div>
          )}

          <Button
            onClick={claimCheckels}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            Claim ₵ Checkels
          </Button>

          {/* Generation Timer */}
          <div className="text-center p-2 bg-blue-50 rounded">
            <p className="text-sm font-medium text-blue-700">Generation Timer</p>
            <p className="text-xs text-blue-600">
              {formatDuration(Math.floor((Date.now() - lastClaimTime) / 1000))} / {formatDuration(maxGenerationTime)}
            </p>
            <div className="w-full bg-blue-200 rounded-full h-1.5 mt-1">
              <div 
                className="bg-blue-600 h-1.5 rounded-full transition-all duration-1000"
                style={{ 
                  width: `${Math.min(100, ((Date.now() - lastClaimTime) / 1000 / maxGenerationTime) * 100)}%` 
                }}
              ></div>
            </div>
          </div>

          {/* Active Boosters Display */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Active Boosters</h4>
            {validBoosters.length > 0 ? (
              <div className="space-y-2">
                {validBoosters.map((booster: any, index: number) => {
                  const timeLeft = Math.max(0, (booster.endTime - Date.now()) / 1000 / 60);
                  const totalDuration = 30; // Assuming original duration, adjust based on booster type
                  const progressPercentage = Math.max(0, (timeLeft / totalDuration) * 100);
                  
                  return (
                    <div
                      key={index}
                      className="bg-orange-100 p-3 rounded border"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-orange-700">
                          {booster.multiplier}x Boost
                        </span>
                        <span className="text-xs text-orange-600">
                          {Math.ceil(timeLeft)}m left
                        </span>
                      </div>
                      <div className="w-full bg-orange-200 rounded-full h-2">
                        <div 
                          className="bg-orange-500 h-2 rounded-full transition-all duration-1000"
                          style={{ width: `${progressPercentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-gray-500">No active boosters</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const TreeLevelingCard = ({ user, setUser }: any) => {
  const { toast } = useToast();
  const currentLevel = calculateTreeLevel(user?.upgrades);
  const nextLevel = currentLevel + 1;
  const upgradeCost = calculateLevelUpCost(currentLevel);

  const currentCPS = calculateBaseCPS(currentLevel);
  const currentBonusYield = calculateBonusYield(currentLevel);
  const currentMaxTime = calculateMaxGenerationTime(currentLevel);

  const nextCPS = calculateBaseCPS(nextLevel);
  const nextBonusYield = calculateBonusYield(nextLevel);
  const nextMaxTime = calculateMaxGenerationTime(nextLevel);

  const canUpgrade = user?.coins >= upgradeCost;

  const upgradeTree = () => {
    if (!canUpgrade) {
      toast({
        title: "Insufficient ₵ Checkels",
        description: `You need ${upgradeCost} ₵ Checkels to upgrade to level ${nextLevel}`,
        variant: "destructive",
      });
      return;
    }

    const updatedUser = {
      ...user,
      coins: user.coins - upgradeCost,
      upgrades: {
        ...user.upgrades,
        treeLevel: nextLevel,
      },
    };

    setUser(updatedUser);
    localStorage.setItem("casinoUser", JSON.stringify(updatedUser));

    const users = JSON.parse(localStorage.getItem("casinoUsers") || "{}");
    users[user.username] = updatedUser;
    localStorage.setItem("casinoUsers", JSON.stringify(users));

    const transaction = {
      type: "upgrade",
      amount: -upgradeCost,
      timestamp: Date.now(),
      description: `Upgraded tree to level ${nextLevel}`,
    };

    const transactions = JSON.parse(
      localStorage.getItem(`tree_transactions_${user.username}`) || "[]",
    );
    transactions.unshift(transaction);
    localStorage.setItem(
      `tree_transactions_${user.username}`,
      JSON.stringify(transactions.slice(0, 50)),
    );

    toast({
      title: "Tree Upgraded!",
      description: `Your tree is now level ${nextLevel}!`,
    });
  };

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <TrendingUp className="w-6 h-6 text-blue-600" />
          <span className="text-blue-700">Tree Leveling</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="text-center p-3 bg-white rounded border">
            <p className="text-lg font-bold text-blue-600">
              Level {currentLevel}
            </p>
            <p className="text-sm text-gray-500">Unlimited Growth</p>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium text-sm text-gray-700">Current Stats</h4>
            <div className="grid grid-cols-1 gap-2 text-sm">
              <div className="flex justify-between p-2 bg-green-50 rounded">
                <span>CPS:</span>
                <span className="font-bold">{currentCPS.toFixed(5)}</span>
              </div>
              <div className="flex justify-between p-2 bg-purple-50 rounded">
                <span>Bonus Yield:</span>
                <span className="font-bold">+{currentBonusYield}%</span>
              </div>
              <div className="flex justify-between p-2 bg-blue-50 rounded">
                <span>Max Duration:</span>
                <span className="font-bold">
                  {formatDuration(currentMaxTime)}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium text-sm text-gray-700">Next Level ({nextLevel}) Stats</h4>
            <div className="grid grid-cols-1 gap-2 text-sm">
              <div className="flex justify-between p-2 bg-green-100 rounded">
                <span>CPS:</span>
                <span className="font-bold text-green-600">
                  {nextCPS.toFixed(5)} 
                  <span className="text-xs ml-1">
                    (+{((nextCPS - currentCPS) / currentCPS * 100).toFixed(1)}%)
                  </span>
                </span>
              </div>
              <div className="flex justify-between p-2 bg-purple-100 rounded">
                <span>Bonus Yield:</span>
                <span className="font-bold text-purple-600">
                  +{nextBonusYield}%
                  <span className="text-xs ml-1">
                    (+{nextBonusYield - currentBonusYield}%)
                  </span>
                </span>
              </div>
              <div className="flex justify-between p-2 bg-blue-100 rounded">
                <span>Max Duration:</span>
                <span className="font-bold text-blue-600">
                  {formatDuration(nextMaxTime)}
                  <span className="text-xs ml-1">
                    (+{formatDuration(nextMaxTime - currentMaxTime)})
                  </span>
                </span>
              </div>
            </div>
          </div>

          <Button
            onClick={upgradeTree}
            disabled={!canUpgrade}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300"
          >
            {canUpgrade ? (
              <span className="flex items-center space-x-2">
                <Coins className="w-4 h-4" />
                <span>Upgrade to Level {nextLevel} ({upgradeCost} ₵ Checkels)</span>
              </span>
            ) : (
              <span>Need {upgradeCost} ₵ Checkels</span>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const BoosterStore = ({ user, setUser }: any) => {
  const { toast } = useToast();

  const boosters = [
    {
      name: "2x Speed Boost",
      multiplier: 2,
      duration: 30,
      cost: 100,
      description: "Double your CPS for 30 minutes",
    },
    {
      name: "3x Speed Boost",
      multiplier: 3,
      duration: 20,
      cost: 200,
      description: "Triple your CPS for 20 minutes",
    },
    {
      name: "5x Speed Boost",
      multiplier: 5,
      duration: 10,
      cost: 400,
      description: "5x your CPS for 10 minutes",
    },
  ];

  const isBoosterActive = (boosterMultiplier: number) => {
    const activeBoosters = user?.activeBoosters || [];
    const now = Date.now();
    return activeBoosters.some(
      (booster: any) =>
        booster.multiplier === boosterMultiplier && now < booster.endTime,
    );
  };

  const activateBooster = (booster: any) => {
    if (isBoosterActive(booster.multiplier)) {
      toast({
        title: "Booster already active",
        description: `${booster.multiplier}x booster is currently running`,
        variant: "destructive",
      });
      return;
    }

    if (user.coins < booster.cost) {
      toast({
        title: "Insufficient ₵ Checkels",
        description: `You need ${booster.cost} ₵ Checkels to purchase this booster`,
        variant: "destructive",
      });
      return;
    }

    const newBooster = {
      multiplier: booster.multiplier,
      endTime: Date.now() + booster.duration * 60 * 1000,
      name: booster.name,
    };

    const updatedUser = {
      ...user,
      coins: user.coins - booster.cost,
      activeBoosters: [...(user.activeBoosters || []), newBooster],
    };

    setUser(updatedUser);
    localStorage.setItem("casinoUser", JSON.stringify(updatedUser));

    const users = JSON.parse(localStorage.getItem("casinoUsers") || "{}");
    users[user.username] = updatedUser;
    localStorage.setItem("casinoUsers", JSON.stringify(users));

    const transaction = {
      type: "booster",
      amount: -booster.cost,
      timestamp: Date.now(),
      description: `Purchased ${booster.name}`,
    };

    const transactions = JSON.parse(
      localStorage.getItem(`tree_transactions_${user.username}`) || "[]",
    );
    transactions.unshift(transaction);
    localStorage.setItem(
      `tree_transactions_${user.username}`,
      JSON.stringify(transactions.slice(0, 50)),
    );

    toast({
      title: "Booster activated!",
      description: `${booster.multiplier}x CPS for ${booster.duration} minutes`,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Zap className="w-6 h-6 text-orange-500" />
          <span>Booster Store</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {boosters.map((booster, index) => {
            const isActive = isBoosterActive(booster.multiplier);
            return (
              <div
                key={index}
                className={`p-3 border rounded ${isActive ? "bg-gradient-to-r from-green-50 to-emerald-50 border-green-300" : "bg-gradient-to-r from-orange-50 to-yellow-50"}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <p
                      className={`font-medium ${isActive ? "text-green-700" : "text-orange-700"}`}
                    >
                      {booster.name}
                      {isActive && (
                        <span className="ml-2 text-xs bg-green-200 px-2 py-1 rounded">
                          ACTIVE
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-gray-600">
                      {booster.description}
                    </p>
                    <p
                      className={`text-xs mt-1 ${isActive ? "text-green-600" : "text-orange-600"}`}
                    >
                      {booster.multiplier}x CPS for {booster.duration} minutes
                    </p>
                  </div>
                  <Button
                    onClick={() => activateBooster(booster)}
                    disabled={isActive}
                    variant="outline"
                    size="sm"
                    className={
                      isActive
                        ? "border-green-300 text-green-700 bg-green-100 cursor-not-allowed"
                        : "border-orange-300 text-orange-700 hover:bg-orange-100"
                    }
                  >
                    {isActive ? (
                      <span className="text-xs">Active</span>
                    ) : (
                      <span className="flex items-center space-x-1">
                        <Coins className="w-3 h-3" />
                        <span>{booster.cost}</span>
                      </span>
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

const TransactionHistory = ({ user }: any) => {
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      const savedTransactions = localStorage.getItem(
        `tree_transactions_${user.username}`,
      );
      setTransactions(savedTransactions ? JSON.parse(savedTransactions) : []);
    }
  }, [user]);

  return (
    <Card className="lg:col-span-3">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <History className="w-6 h-6 text-blue-500" />
          <span>Transaction History</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {transactions.slice(0, 50).map((transaction, index) => (
            <div
              key={index}
              className="p-2 bg-white rounded border text-sm flex justify-between items-center"
            >
              <div className="flex-1">
                <p className="font-medium">{transaction.description}</p>
                <p className="text-xs text-gray-500">
                  {new Date(transaction.timestamp).toLocaleString()}
                </p>
              </div>
              <div
                className={`font-bold ${transaction.amount >= 0 ? "text-green-600" : "text-red-600"}`}
              >
                {transaction.amount >= 0 ? "+" : ""}
                {transaction.amount.toFixed(3)} ₵ Checkels
              </div>
            </div>
          ))}
          {transactions.length === 0 && (
            <p className="text-center text-gray-500 text-sm py-4">
              No transactions yet
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TreePage;