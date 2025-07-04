import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Coins, DollarSign, Home, Gamepad2, Wallet, Users, Leaf, Menu, LogOut } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { signIn, updateUserBalance, addTransaction, updateTreeUpgrade, createTreeUpgrade, getTreeUpgrade, getUserTransactions, saveTreeState, clearOfflineGeneration } from '@/lib/database';
import { TreePine, ShoppingCart, Zap, Star, TrendingUp, History } from "lucide-react";
import { CheckelsIcon, ChipsIcon } from "@/components/ui/icons";
import { supabase } from '@/lib/supabase';
import MobileNavigation from "@/components/MobileNavigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const calculateTreeLevel = (upgrades: any) => {
  if (!upgrades) return 1;
  return upgrades.tree_level || upgrades.treeLevel || 1;
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
  const [treeUpgrade, setTreeUpgrade] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const loadUser = async () => {
      const savedUser = localStorage.getItem("casinoUser");
      if (!savedUser) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      const parsedUser = JSON.parse(savedUser);

      try {
        // Show loading message first
        toast({
          title: "Loading Tree Farm",
          description: "Syncing with database...",
        });

        const freshUser = await signIn(parsedUser.username, parsedUser.password_hash || 'migrated_user');

        if (freshUser.is_banned) {
          toast({
            title: "Account Banned",
            description: "Your account has been banned. Redirecting to login.",
            variant: "destructive",
          });
          localStorage.removeItem('casinoUser');
          setTimeout(() => navigate('/'), 2000);
          return;
        }

        localStorage.setItem('casinoUser', JSON.stringify(freshUser));
        setUser(freshUser);

        // Wait a bit for tree data to load
        setTimeout(() => {
          toast({
            title: "Tree Farm Ready! 🌱",
            description: `Welcome back to your money tree, ${freshUser.username}!`,
          });
        }, 1000);
      } catch (error) {
        console.log('Failed to load user from Supabase:', error);
        toast({
          title: "Connection Error",
          description: "Failed to sync with database. Using offline mode.",
          variant: "destructive",
        });
        // Don't remove user, allow offline mode
        setUser(parsedUser);
      } finally {
        setIsLoading(false);
        // Add extra time for data synchronization
        setTimeout(() => setPageLoading(false), 1500);
      }
    };

    loadUser();
  }, [navigate, toast]);

  const updateUserAndSync = async (updatedUserData: any) => {
    try {
      const dbUser = await updateUserBalance(updatedUserData.id, {
        coins: updatedUserData.coins,
        chips: updatedUserData.chips
      });

      const mergedUser = {
        ...updatedUserData,
        ...dbUser
      };

      setUser(mergedUser);
      localStorage.setItem('casinoUser', JSON.stringify(mergedUser));

      return mergedUser;
    } catch (error) {
      console.error('Error syncing with Supabase, using localStorage:', error);
      setUser(updatedUserData);
      localStorage.setItem('casinoUser', JSON.stringify(updatedUserData));
      return updatedUserData;
    }
  };

  useEffect(() => {
    const loadTreeData = async () => {
        if (!user?.id) return;

        try {
            let upgrade = await getTreeUpgrade(user.id);
            if (!upgrade) {
                upgrade = await createTreeUpgrade(user.id);
            }

            setTreeUpgrade(upgrade);

            // Load persisted boosters from localStorage
            const savedBoosters = localStorage.getItem(`activeBoosters_${user.id}`);
            let activeBoosters = [];

            if (savedBoosters) {
                const parsedBoosters = JSON.parse(savedBoosters);
                // Filter out expired boosters
                activeBoosters = parsedBoosters.filter((booster: any) => Date.now() < booster.endTime);
                // Update localStorage with filtered boosters
                localStorage.setItem(`activeBoosters_${user.id}`, JSON.stringify(activeBoosters));
            }

            const updatedUser = {
                ...user,
                activeBoosters,
                upgrades: {
                    ...user.upgrades,
                    treeLevel: upgrade.tree_level
                }
            };

            setUser(updatedUser);
            localStorage.setItem('casinoUser', JSON.stringify(updatedUser));

            if (supabase) {
              const treeSubscription = supabase
                .channel(`tree_upgrades_realtime_${user.id}_${Date.now()}`)
                .on('postgres_changes', {
                  event: '*',
                  schema: 'public',
                  table: 'tree_upgrades',
                  filter: `user_id=eq.${user.id}`
                }, (payload) => {
                  console.log('Tree upgrade change detected:', payload);
                  if (payload.eventType === 'UPDATE') {
                    setTreeUpgrade(payload.new);
                  }
                })
                .subscribe();

              const userSubscription = supabase
                .channel(`user_balance_realtime_${user.id}_${Date.now()}`)
                .on('postgres_changes', {
                  event: 'UPDATE',
                  schema: 'public',
                  table: 'users',
                  filter: `id=eq.${user.id}`
                }, (payload) => {
                  console.log('User balance updated:', payload);
                  const updatedUser = { ...user, ...payload.new };
                  setUser(updatedUser);
                  localStorage.setItem('casinoUser', JSON.stringify(updatedUser));
                })
                .subscribe();

              return () => {
                supabase.removeChannel(treeSubscription);
                supabase.removeChannel(userSubscription);
              };
            }
        } catch (error) {
            console.error('Failed to load tree data from Supabase:', error);
            setTreeUpgrade({
                tree_level: 1,
                last_claim: new Date().toISOString(),
                user_id: user.id,
                current_checkels: 0,
                offline_generation_active: false
            });
        }
    };

    if (user && user.id) {
        loadTreeData();
    }
  }, [user?.id]);

  // Save tree state when leaving the page
  useEffect(() => {
    const handleBeforeUnload = async () => {
      if (user?.id && treeUpgrade) {
        try {
          await saveTreeState(user.id, 0, new Date()); // Will be handled by MoneyTreeCard
        } catch (error) {
          console.error('Error saving tree state on page unload:', error);
        }
      }
    };

    const handleVisibilityChange = async () => {
      if (document.hidden && user?.id && treeUpgrade) {
        try {
          await saveTreeState(user.id, 0, new Date()); // Will be handled by MoneyTreeCard
        } catch (error) {
          console.error('Error saving tree state on visibility change:', error);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user?.id, treeUpgrade]);

  if (isLoading || pageLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="flex items-center space-x-2 text-white">
          <TreePine className="w-6 h-6 animate-pulse text-green-400" />
          <div className="w-6 h-6 border-2 border-green-400 border-t-transparent animate-spin rounded-full"></div>
          <span>Loading Money Tree Farm...</span>
        </div>
      </div>
    );
  }

  if (user === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="p-6 text-center">
            <p>Please log in to access the Money Tree.</p>
            <Button onClick={() => window.location.href = '/'} className="mt-4">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-blue-900 to-indigo-900">
      <header className="bg-gradient-to-r from-green-800/90 to-blue-800/90 backdrop-blur-lg border-b border-white/10 p-4 shadow-xl">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-3xl font-bold text-white flex items-center space-x-3">
            <TreePine className="w-8 h-8 text-green-400" />
            <span className="bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
              Money Tree Farm
            </span>
          </h1>

          <div className="flex items-center space-x-6">
            <div className="hidden md:flex items-center space-x-4 bg-black/20 rounded-full px-4 py-2 border border-white/10">
              <div className="flex items-center space-x-2">
                <CheckelsIcon className="w-5 h-5 text-yellow-400" />
                <span className="text-yellow-100 font-semibold">
                  {(user?.coins || 0).toFixed(2)} ₵ Checkels
                </span>
              </div>
              <div className="w-px h-6 bg-white/20"></div>
              <div className="flex items-center space-x-2">
                <ChipsIcon className="w-5 h-5 text-green-400" />
                <span className="text-green-100 font-semibold">
                  {(user?.chips || 0).toFixed(2)} Chips
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <span className="hidden md:block text-white/90 font-medium">Welcome, {user?.username}</span>
              <div className="hidden md:flex space-x-2">
                <Link to="/">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex items-center space-x-2 bg-blue-500/20 border-blue-400/30 text-blue-100 hover:bg-blue-500/30"
                  >
                    <Home className="w-4 h-4" />
                    <span>Home</span>
                  </Button>
                </Link>
                <Link to="/casino">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex items-center space-x-2 bg-purple-500/20 border-purple-400/30 text-purple-100 hover:bg-purple-500/30"
                  >
                    <Gamepad2 className="w-4 h-4" />
                    <span>Casino</span>
                  </Button>
                </Link>
                <Link to="/wallet">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex items-center space-x-2 bg-indigo-500/20 border-indigo-400/30 text-indigo-100 hover:bg-indigo-500/30"
                  >
                    <Wallet className="w-4 h-4" />
                    <span>Wallet</span>
                  </Button>
                </Link>
              </div>

              <MobileNavigation user={user} currentPage="/tree" />
            </div>
          </div>
        </div>
      </header>
      <div className="max-w-6xl mx-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <MoneyTreeCard user={user} setUser={setUser} treeUpgrade={treeUpgrade} setTreeUpgrade={setTreeUpgrade} updateUserAndSync={updateUserAndSync} />
          <TreeLevelingCard user={user} setUser={setUser} treeUpgrade={treeUpgrade} setTreeUpgrade={setTreeUpgrade} updateUserAndSync={updateUserAndSync} />
          <BoosterStore user={user} setUser={setUser} updateUserAndSync={updateUserAndSync} />
          <TransactionHistory user={user} />
        </div>
      </div>
    </div>
  );
};

const MoneyTreeCard = ({ user, setUser, treeUpgrade, setTreeUpgrade, updateUserAndSync }: any) => {
  const { toast } = useToast();
  const [currentCheckels, setCurrentCheckels] = useState(0);
  const [lastClaimTime, setLastClaimTime] = useState(Date.now());
  const [generationActive, setGenerationActive] = useState(true);
  const [offlineGenerated, setOfflineGenerated] = useState(0);
  const [showClaimDialog, setShowClaimDialog] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const hasCalculatedOffline = useRef(false);

  const level = calculateTreeLevel(treeUpgrade);
  const baseCPS = calculateBaseCPS(level);
  const bonusYield = calculateBonusYield(level);
  const maxGenerationTime = calculateMaxGenerationTime(level);

  const activeBoosters = user?.activeBoosters || [];
  const now = Date.now();

  const validBoosters = activeBoosters.filter(
    (booster: any) => now < booster.endTime,
  );

  useEffect(() => {
    if (validBoosters.length !== activeBoosters.length) {
      const updatedUser = {
        ...user,
        activeBoosters: validBoosters,
      };
      setUser(updatedUser);
      localStorage.setItem("casinoUser", JSON.stringify(updatedUser));
      localStorage.setItem(`activeBoosters_${user.id}`, JSON.stringify(validBoosters));
    }
  }, [validBoosters.length, activeBoosters.length, user, setUser]);

  const totalMultiplier = validBoosters.reduce(
    (total: number, booster: any) => total * booster.multiplier,
    1,
  );

  const finalCPS = baseCPS * totalMultiplier;

  // Calculate offline generation when component mounts
  useEffect(() => {
    const calculateOfflineGeneration = async () => {
      if (!treeUpgrade || !user?.id || hasCalculatedOffline.current) return;

      hasCalculatedOffline.current = true;

      // Check for saved tree state in localStorage
      const savedTreeState = localStorage.getItem(`treeState_${user.id}`);

      if (savedTreeState) {
        try {
          const parsedState = JSON.parse(savedTreeState);
          const leaveTime = new Date(parsedState.last_leave_time).getTime();
          const returnTime = Date.now();
          const timeOfflineSeconds = Math.max(0, (returnTime - leaveTime) / 1000);

          if (timeOfflineSeconds > 5) { // Only if offline for more than 5 seconds
            // Get the original session start time
            const originalSessionStart = parsedState.session_start_time ? 
              new Date(parsedState.session_start_time).getTime() : 
              new Date(treeUpgrade.last_claim).getTime();

            // Calculate total time elapsed since session started (including offline time)
            const totalElapsedTime = (returnTime - originalSessionStart) / 1000;

            // Cap total time to max generation duration
            const cappedTotalTime = Math.min(totalElapsedTime, maxGenerationTime);

            // Calculate offline generation with current level's CPS, but cap it to max duration
            const maxOfflineGeneration = calculateBaseCPS(level) * maxGenerationTime;
            const actualOfflineGeneration = Math.min(calculateBaseCPS(level) * timeOfflineSeconds, maxOfflineGeneration);
            
            // Calculate total checkels including what was already generated before leaving
            const previousCheckels = parsedState.current_checkels || 0;
            const totalPossibleForSession = maxOfflineGeneration;
            const totalCheckels = Math.min(previousCheckels + actualOfflineGeneration, totalPossibleForSession);

            setCurrentCheckels(totalCheckels);
            setOfflineGenerated(actualOfflineGeneration);

            // Set last claim time to maintain the total elapsed time continuity
            const adjustedClaimTime = returnTime - (cappedTotalTime * 1000);
            setLastClaimTime(adjustedClaimTime);

            // Determine if generation should continue
            const shouldContinueGeneration = cappedTotalTime < maxGenerationTime;
            setGenerationActive(shouldContinueGeneration);

            // Show offline generation notification
            if (actualOfflineGeneration > 0) {
              toast({
                title: "Welcome back!",
                description: `Your tree generated ${actualOfflineGeneration.toFixed(4)} ₵ Checkels while you were away! Timer: ${formatDuration(Math.floor(cappedTotalTime))}/${formatDuration(maxGenerationTime)} ${!shouldContinueGeneration ? 'Generation complete.' : ''}`,
              });
            }

            // Clear offline generation flag
            try {
              await clearOfflineGeneration(user.id);
            } catch (error) {
              console.error('Error clearing offline generation:', error);
            }
          } else {
            // Short absence, restore saved state with original timing
            const originalSessionStart = parsedState.session_start_time ? 
              new Date(parsedState.session_start_time).getTime() : 
              new Date(treeUpgrade.last_claim).getTime();

            const totalElapsedTime = (returnTime - originalSessionStart) / 1000;
            const cappedTotalTime = Math.min(totalElapsedTime, maxGenerationTime);
            const adjustedClaimTime = returnTime - (cappedTotalTime * 1000);

            setCurrentCheckels(parsedState.current_checkels || 0);
            setLastClaimTime(adjustedClaimTime);
            setGenerationActive(cappedTotalTime < maxGenerationTime);
          }
        } catch (error) {
          console.error('Error parsing saved tree state:', error);
          // Fall back to fresh start
          setCurrentCheckels(0);
          setOfflineGenerated(0);
          setLastClaimTime(treeUpgrade.last_claim ? new Date(treeUpgrade.last_claim).getTime() : Date.now());
          setGenerationActive(true);
        }
      } else {
        // No saved state, start fresh
        setCurrentCheckels(0);
        setOfflineGenerated(0);
        setLastClaimTime(treeUpgrade.last_claim ? new Date(treeUpgrade.last_claim).getTime() : Date.now());
        setGenerationActive(true);
      }
    };

    if (treeUpgrade && user?.id) {
      calculateOfflineGeneration();
    }
  }, [treeUpgrade, level, toast, user?.id, maxGenerationTime]);

  // Real-time timer update
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Real-time generation timer
  useEffect(() => {
    if (!generationActive || !treeUpgrade) return;

    intervalRef.current = setInterval(() => {
      const now = Date.now();
      const timeElapsed = (now - lastClaimTime) / 1000;

      if (timeElapsed < maxGenerationTime) {
        setCurrentCheckels((prev) => {
          const newValue = prev + finalCPS;
          // Cap at max possible generation for this level (total for the entire session)
          const maxPossibleForSession = calculateBaseCPS(level) * maxGenerationTime;
          return Math.min(newValue, maxPossibleForSession);
        });
      } else {
        // Stop generation when max time is reached
        setGenerationActive(false);
        toast({
          title: "Generation Complete",
          description: `Your tree has reached maximum generation time. Claim your Checkels to restart!`,
        });
      }
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [
    lastClaimTime,
    finalCPS,
    maxGenerationTime,
    generationActive,
    treeUpgrade,
    offlineGenerated,
    level,
    toast
  ]);

  // Save state when leaving
  useEffect(() => {
    const saveCurrentState = async () => {
      if (user?.id) {
        try {
          // Save state with session start time for proper timer continuity
          const treeState = {
            current_checkels: currentCheckels,
            last_leave_time: new Date().toISOString(),
            session_start_time: new Date(lastClaimTime).toISOString(),
            offline_generation_active: true
          };

          localStorage.setItem(`treeState_${user.id}`, JSON.stringify(treeState));

          await saveTreeState(user.id, currentCheckels, new Date());
        } catch (error) {
          console.error('Error saving tree state:', error);
        }
      }
    };

    const handleBeforeUnload = () => saveCurrentState();
    const handleVisibilityChange = () => {
      if (document.hidden) saveCurrentState();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      saveCurrentState();
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user?.id, currentCheckels, lastClaimTime]);

  const handleClaimClick = () => {
    if (currentCheckels === 0) {
      toast({
        title: "No Checkels to claim",
        description: "Wait for Checkels to generate",
        variant: "destructive",
      });
      return;
    }
    setShowClaimDialog(true);
  };

  const claimCheckels = async () => {
    let finalCheckels = currentCheckels;

    if (bonusYield > 0) {
      finalCheckels = finalCheckels * (1 + (bonusYield / 100));
    }

    const updatedUser = {
      ...user,
      coins: user.coins + finalCheckels,
    };

    await updateUserAndSync(updatedUser);

    try {
      await addTransaction({
        user_id: user.id,
        type: 'conversion',
        coins_amount: finalCheckels,
        description: offlineGenerated > 0 
          ? `Claimed Checkels from tree (${(finalCheckels - offlineGenerated).toFixed(4)} generated + ${offlineGenerated.toFixed(4)} offline)`
          : 'Claimed Checkels from tree',
      });
    } catch (error) {
      console.error('Error adding transaction to Supabase:', error);
      toast({
        title: "Warning",
        description: "Transaction not recorded due to database error",
        variant: "destructive",
      });
    }

    const newClaimTime = Date.now();
    setCurrentCheckels(0);
    setOfflineGenerated(0);
    setLastClaimTime(newClaimTime);
    setGenerationActive(true);

    // Clear saved tree state since we're starting fresh
    localStorage.removeItem(`treeState_${user.id}`);

    try {
      const updatedTreeUpgrade = await updateTreeUpgrade(user.id, {
        last_claim: new Date(newClaimTime).toISOString()
      });
      setTreeUpgrade(updatedTreeUpgrade);
    } catch (error) {
      console.error('Error updating tree upgrade:', error);
    }

    toast({
      title: "Checkels claimed!",
      description: offlineGenerated > 0 
        ? `You earned ${finalCheckels.toFixed(4)} ₵ Checkels (including ${offlineGenerated.toFixed(4)} offline generation)`
        : `You earned ${finalCheckels.toFixed(4)} ₵ Checkels`,
    });

    setShowClaimDialog(false);
  };

  return (
    <>
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
                ₵{currentCheckels.toFixed(5)}
              </p>
              <p className="text-sm text-gray-600">Current Checkels</p>
              {offlineGenerated > 0 && (
                <p className="text-xs text-blue-600 mt-1">
                  +{offlineGenerated.toFixed(5)} while away
                </p>
              )}
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
                No ₵ Checkels generating – please claim to restart
              </div>
            )}

            <Button
              onClick={handleClaimClick}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              Claim ₵ Checkels
            </Button>

            <div className="text-center p-2 bg-blue-50 rounded">
              <p className="text-sm font-medium text-blue-700">Generation Timer</p>
              <p className="text-xs text-blue-600">
                {formatDuration(Math.floor((currentTime - lastClaimTime) / 1000))} / {formatDuration(maxGenerationTime)}
              </p>
              <div className="w-full bg-blue-200 rounded-full h-1.5 mt-1">
                <div 
                  className="bg-blue-600 h-1.5 rounded-full transition-all duration-1000"
                  style={{ 
                    width: `${Math.min(100, ((currentTime - lastClaimTime) / 1000 / maxGenerationTime) * 100)}%` 
                  }}
                ></div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-sm">Active Boosters</h4>
              {validBoosters.length > 0 ? (
                <div className="space-y-2">
                  {validBoosters.map((booster: any, index: number) => {
                    const timeLeft = Math.max(0, (booster.endTime - Date.now()) / 1000 / 60);
                    const totalDuration = 30;
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

      <AlertDialog open={showClaimDialog} onOpenChange={setShowClaimDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Claim Checkels</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to claim {currentCheckels.toFixed(4)} ₵ Checkels
              {offlineGenerated > 0 && (
                <span className="text-blue-600">
                  <br />This includes {offlineGenerated.toFixed(4)} ₵ generated while you were offline
                </span>
              )}
              {bonusYield > 0 && ` with a ${bonusYield}% bonus yield (+${(currentCheckels * bonusYield / 100).toFixed(4)} extra)`}.
              <br />This will reset your generation timer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={claimCheckels}>Claim</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

const TreeLevelingCard = ({ user, setUser, treeUpgrade, setTreeUpgrade, updateUserAndSync }: any) => {
  const { toast } = useToast();
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);

  const currentLevel = calculateTreeLevel(treeUpgrade);
  const nextLevel = currentLevel + 1;
  const upgradeCost = calculateLevelUpCost(currentLevel);

  const currentCPS = calculateBaseCPS(currentLevel);
  const currentBonusYield = calculateBonusYield(currentLevel);
  const currentMaxTime = calculateMaxGenerationTime(currentLevel);

  const nextCPS = calculateBaseCPS(nextLevel);
  const nextBonusYield = calculateBonusYield(nextLevel);
  const nextMaxTime = calculateMaxGenerationTime(nextLevel);

  const canUpgrade = user?.coins >= upgradeCost;

  const handleUpgradeClick = () => {
    if (!canUpgrade) {
      toast({
        title: "Cannot Upgrade",
        description: `You need ${upgradeCost} ₵ Checkels to upgrade`,
        variant: "destructive",
      });
      return;
    }
    setShowUpgradeDialog(true);
  };

  const upgradeTree = async () => {
    if (!treeUpgrade || user.coins < upgradeCost) {
      toast({
        title: "Cannot Upgrade",
        description: `You need ${upgradeCost} ₵ Checkels to upgrade`,
        variant: "destructive",
      });
      return;
    }

    try {
      const newTreeUpgrade = await updateTreeUpgrade(user.id, {
        tree_level: treeUpgrade.tree_level + 1
      });

      const updatedUser = {
        ...user,
        coins: Math.round((user.coins - upgradeCost) * 100) / 100,
        upgrades: {
          ...user.upgrades,
          treeLevel: newTreeUpgrade.tree_level
        }
      };

      await updateUserAndSync(updatedUser);

      try {
        await addTransaction({
          user_id: user.id,
          type: 'conversion',
          coins_amount: -upgradeCost,
          description: `Upgraded tree to level ${newTreeUpgrade.tree_level}`,
        });
      } catch (transactionError) {
        console.error('Failed to record transaction:', transactionError);
      }

      setTreeUpgrade(newTreeUpgrade);

      toast({
        title: "Tree Upgraded!",
        description: `Your tree is now level ${newTreeUpgrade.tree_level}!`,
      });
    } catch (error) {
      console.error('Error upgrading tree in Supabase:', error);

      toast({
        title: "Upgrade Failed",
        description: "Failed to upgrade tree. Please try again later.",
        variant: "destructive",
      });
    }

    setShowUpgradeDialog(false);
  };

  return (
    <>
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
              onClick={handleUpgradeClick}
              disabled={!canUpgrade}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300"
            >
              {canUpgrade ? (
                <span className="flex items-center space-x-2">
                  <CheckelsIcon className="w-4 h-4" />
                  <span>Upgrade to Level {nextLevel} ({upgradeCost} ₵ Checkels)</span>
                </span>
              ) : (
                <span>Need {upgradeCost} ₵ Checkels</span>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Upgrade Tree</AlertDialogTitle>
            <AlertDialogDescription>
              Upgrade your tree from level {currentLevel} to level {nextLevel} for {upgradeCost} ₵ Checkels?
              <br /><br />
              <strong>Improvements:</strong>
              <br />• CPS: {currentCPS.toFixed(5)} → {nextCPS.toFixed(5)} (+{((nextCPS - currentCPS) / currentCPS * 100).toFixed(1)}%)
              <br />• Bonus Yield: +{currentBonusYield}% → +{nextBonusYield}% (+{nextBonusYield - currentBonusYield}%)
              <br />• Max Duration: {formatDuration(currentMaxTime)} → {formatDuration(nextMaxTime)} (+{formatDuration(nextMaxTime - currentMaxTime)})
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={upgradeTree}>Upgrade</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

const BoosterStore = ({ user, setUser, updateUserAndSync }: any) => {
  const { toast } = useToast();
  const [selectedBooster, setSelectedBooster] = useState<any>(null);
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);

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

  const handlePurchaseClick = (booster: any) => {
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

    setSelectedBooster(booster);
    setShowPurchaseDialog(true);
  };

  const activateBooster = async () => {
    if (!selectedBooster) return;

    try {
      const newBooster = {
        multiplier: selectedBooster.multiplier,
        endTime: Date.now() + selectedBooster.duration * 60 * 1000,
        name: selectedBooster.name,
      };

      const updatedBoosters = [...(user.activeBoosters || []), newBooster];

      const updatedUser = {
        ...user,
        coins: user.coins - selectedBooster.cost,
        activeBoosters: updatedBoosters,
      };

      // Persist boosters to localStorage
      localStorage.setItem(`activeBoosters_${user.id}`, JSON.stringify(updatedBoosters));

      await updateUserAndSync(updatedUser);

      try {
        await addTransaction({
          user_id: user.id,
          type: 'conversion',
          coins_amount: -selectedBooster.cost,
          description: `Purchased ${selectedBooster.name}`,
        });
      } catch (transactionError) {
        console.error('Error adding transaction to Supabase:', transactionError);
      }

      toast({
        title: "Booster activated!",
        description: `${selectedBooster.multiplier}x CPS for ${selectedBooster.duration} minutes`,
      });
    } catch (error) {
      console.error('Error activating booster:', error);
      toast({
        title: "Activation Failed",
        description: "Failed to activate booster. Please try again.",
        variant: "destructive",
      });
    }

    setShowPurchaseDialog(false);
    setSelectedBooster(null);
  };

  return (
    <>
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
                      onClick={() => handlePurchaseClick(booster)}
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
                          <CheckelsIcon className="w-3 h-3" />
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

      <AlertDialog open={showPurchaseDialog} onOpenChange={setShowPurchaseDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Purchase Booster</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedBooster && (
                <>
                  Purchase {selectedBooster.name} for {selectedBooster.cost} ₵ Checkels?
                  <br /><br />
                  This will give you {selectedBooster.multiplier}x CPS for {selectedBooster.duration} minutes.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedBooster(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={activateBooster}>Purchase</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

const TransactionHistory = ({ user }: any) => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const loadTransactions = async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      const supabaseTransactions = await getUserTransactions(user.id, 50);

      // Filter only tree-related transactions
      const treeTransactions = supabaseTransactions.filter((tx: any) => 
        tx.description?.includes('tree') || 
        tx.description?.includes('Claimed Checkels') ||
        tx.description?.includes('Upgraded tree') ||
        tx.description?.includes('booster') ||
        tx.description?.includes('Purchased')
      );

      const formattedTransactions = treeTransactions.map((tx: any) => ({
        id: tx.id,
        type: tx.type,
        amount: tx.coins_amount || tx.amount || 0,
        timestamp: new Date(tx.created_at).getTime(),
        description: tx.description
      }));

      setTransactions(formattedTransactions);
    } catch (error) {
      console.error('Error loading tree transactions from Supabase:', error);
      setTransactions([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      loadTransactions();
    }

    // Set up real-time subscription for immediate updates only
    if (user?.id && supabase) {
      const subscription = supabase
        .channel(`tree_transactions_realtime_${user.id}_${Date.now()}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: `user_id=eq.${user.id}`
        }, (payload) => {
          console.log('Tree transaction change detected:', payload);

          // Check if it's a tree-related transaction
          const isTreeTransaction = payload.new?.description?.includes('tree') || 
              payload.new?.description?.includes('Claimed Checkels') ||
              payload.new?.description?.includes('Upgraded tree') ||
              payload.new?.description?.includes('booster') ||
              payload.new?.description?.includes('Purchased');

          if (isTreeTransaction) {
            if (payload.eventType === 'INSERT') {
              const newTransaction = {
                id: payload.new.id,
                type: payload.new.type,
                amount: payload.new.coins_amount || payload.new.amount || 0,
                timestamp: new Date(payload.new.created_at).getTime(),
                description: payload.new.description
              };

              setTransactions(prev => [newTransaction, ...prev].slice(0, 50));
            } else if (payload.eventType === 'UPDATE') {
              setTransactions(prev => 
                prev.map(tx => tx.id === payload.new.id ? {
                  ...tx,
                  type: payload.new.type,
                  amount: payload.new.coins_amount || payload.new.amount || 0,
                  description: payload.new.description
                } : tx)
              );
            }
          }
        })
        .subscribe();

      return () => {
        supabase.removeChannel(subscription);
      };
    }
  }, [user?.id]);

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
          {isLoading ? (
            <div className="text-center py-4">
              <span className="text-gray-500 text-sm">Loading transactions...</span>
            </div>
          ) : (
            <>
              {transactions.slice(0, 50).map((transaction, index) => (
                <div
                  key={`${transaction.id || index}-${transaction.timestamp}`}
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
                    {transaction.amount.toFixed(4)} ₵ Checkels
                  </div>
                </div>
              ))}
              {transactions.length === 0 && (
                <p className="text-center text-gray-500 text-sm py-4">
                  No transactions yet
                </p>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TreePage;