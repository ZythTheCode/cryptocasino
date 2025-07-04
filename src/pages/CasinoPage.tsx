import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Gamepad2, Home, TreePine, Wallet, ArrowLeft, Settings } from "lucide-react";
import { CheckelsIcon, ChipsIcon } from "@/components/ui/icons";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import MobileNavigation from "@/components/MobileNavigation";
import SlotMachine from "@/components/games/SlotMachine";
import Blackjack from "@/components/games/Blackjack";
import ColorGame from "@/components/games/ColorGame";
import Minebomb from "@/components/games/Minebomb";
import Baccarat from "@/components/games/Baccarat";
import { addTransaction, updateUserBalance, signIn } from "@/lib/database";

const CasinoPage = () => {
  const [user, setUser] = useState<any>(null);
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    const loadUserData = async () => {
      const savedUser = localStorage.getItem('casinoUser');
      if (!savedUser) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      const parsedUser = JSON.parse(savedUser);

      try {
        // Show loading message first
        toast({
          title: "Loading Casino",
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

        // Wait a bit for data to sync
        setTimeout(() => {
          toast({
            title: "Casino Ready! 🎰",
            description: `Welcome to the casino, ${freshUser.username}!`,
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
        const userWithDefaults = {
          ...parsedUser,
          coins: parsedUser.coins || 0,
          chips: parsedUser.chips || 0,
          isAdmin: parsedUser.isAdmin || parsedUser.is_admin || false
        };
        setUser(userWithDefaults);
        localStorage.setItem('casinoUser', JSON.stringify(userWithDefaults));
      } finally {
        setIsLoading(false);
        // Add extra time for data synchronization
        setTimeout(() => setPageLoading(false), 1500);
      }
    };

    loadUserData();
  }, [navigate, toast]);

  const updateUser = async (updatedUser: any) => {
    try {
      // Update in database
      const dbUser = await updateUserBalance(updatedUser.id, {
        coins: updatedUser.coins,
        chips: updatedUser.chips
      });

      // Update local state
      setUser(dbUser);
      localStorage.setItem('casinoUser', JSON.stringify(dbUser));
    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        title: "Error",
        description: "Failed to update user balance",
        variant: "destructive",
      });
    }
  };

  const addTransactionRecord = async (transaction: any) => {
    try {
      await addTransaction({
        user_id: user.id,
        type: transaction.type,
        game: transaction.game,
        amount: transaction.amount,
        description: transaction.description
      });
    } catch (error) {
      console.error('Error adding transaction:', error);
    }
  };

  if (isLoading || pageLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="flex items-center space-x-2 text-white">
          <Gamepad2 className="w-6 h-6 animate-pulse text-purple-400" />
          <div className="w-6 h-6 border-2 border-purple-400 border-t-transparent animate-spin rounded-full"></div>
          <span>Loading Casino...</span>
        </div>
      </div>
    );
  }

  if (user === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <Card>
          <CardContent className="p-6">
            <p>Please log in to access the Casino</p>
            <Link to="/">
              <Button className="mt-4">Go to Login</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const updateUserChips = async (newChips: number, transaction?: any) => {
    try {
      // Update user balance in Supabase
      const updatedUser = await updateUserBalance(user.id, {
        chips: newChips
      });

      // Add transaction record if provided
      if (transaction) {
        await addTransaction({
          user_id: user.id,
          type: transaction.type === 'win' ? 'win' : 'bet',
          game: transaction.game,
          amount: transaction.amount,
          description: transaction.description
        });
      }

      // Update localStorage for session
      localStorage.setItem("casinoUser", JSON.stringify(updatedUser));
      setUser(updatedUser);
    } catch (error) {
      console.error('Error updating user chips:', error);
      toast({
        title: "Error",
        description: "Failed to update chips. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleApproveTopUp = async (topUpId: string) => {
    try {
      const { updateTopupRequestStatus, getPendingTopupRequests } = await import('@/lib/database');

      await updateTopupRequestStatus(topUpId, 'approved', user.username);

      toast({
        title: "Top-up Approved",
        description: "Top-up request has been approved successfully",
      });

      // Reload data to update UI
      const pendingRequests = await getPendingTopupRequests();
      // Update local state if needed

    } catch (error) {
      console.error('Error approving top-up:', error);
      toast({
        title: "Error",
        description: "Failed to approve top-up request",
        variant: "destructive",
      });
    }
  };

  const handleRejectTopUp = async (topUpId: string) => {
    try {
      const { updateTopupRequestStatus, getPendingTopupRequests } = await import('@/lib/database');

      await updateTopupRequestStatus(topUpId, 'rejected', user.username);

      toast({
        title: "Top-up Rejected",
        description: "Top-up request has been rejected",
        variant: "destructive",
      });

      // Reload data to update UI
      const pendingRequests = await getPendingTopupRequests();
      // Update local state if needed

    } catch (error) {
      console.error('Error rejecting top-up:', error);
      toast({
        title: "Error",
        description: "Failed to reject top-up request",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <CasinoHeader user={user} />
      <div className="max-w-7xl mx-auto p-6">
          {!selectedGame ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <GameCard
                title="Slot Machine"
                description="Spin the reels and match symbols to win big!"
                emoji="🎰"
                status="available"
                onPlay={() => setSelectedGame('slots')}
              />
              <GameCard
                title="Blackjack"
                description="Get as close to 21 as possible without going over"
                emoji="♠️"
                status="available"
                onPlay={() => setSelectedGame('blackjack')}
              />
              <GameCard
                title="Color Game"
                description="Bet on colors and watch the wheel spin!"
                emoji="🌈"
                status="available"
                onPlay={() => setSelectedGame('color')}
              />
              <GameCard
                title="Mine Bomb"
                description="Avoid the bombs and collect treasures safely"
                emoji="💣"
                status="available"
                onPlay={() => setSelectedGame('minebomb')}
              />
              <GameCard
                title="Baccarat"
                description="Classic card game of chance and strategy"
                emoji="🃏"
                status="available"
                onPlay={() => setSelectedGame('baccarat')}
              />
              <GameCard
                title="More Games"
                description="More exciting games coming soon!"
                emoji="🎮"
                status="coming-soon"
              />
            </div>
          ) : (
            <div className="space-y-4">
              <Button 
                onClick={() => setSelectedGame(null)}
                variant="outline"
                className="mb-4 bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Games
              </Button>

              {selectedGame === 'slots' && (
                <SlotMachine 
                  user={user} 
                  onUpdateUser={updateUser}
                  onAddTransaction={addTransactionRecord}
                />
              )}
              {selectedGame === 'blackjack' && (
                <Blackjack 
                  user={user} 
                  onUpdateUser={updateUser}
                  onAddTransaction={addTransactionRecord}
                />
              )}
              {selectedGame === 'color' && (
                <ColorGame 
                  user={user} 
                  onUpdateUser={updateUser}
                  onAddTransaction={addTransactionRecord}
                />
              )}
              {selectedGame === 'minebomb' && (
                <Minebomb 
                  user={user} 
                  onUpdateUser={updateUser}
                  onAddTransaction={addTransactionRecord}
                />
              )}
              {selectedGame === 'baccarat' && (
                <Baccarat 
                  user={user} 
                  onUpdateUser={updateUser}
                  onAddTransaction={addTransactionRecord}
                />
              )}
            </div>
          )}
        </div>
    </div>
  );
};

const CasinoHeader = ({ user }: any) => {
  const navigate = useNavigate();

  return (
    <header className="bg-gradient-to-r from-purple-800/90 to-indigo-800/90 backdrop-blur-lg border-b border-white/10 p-4 shadow-xl">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white flex items-center space-x-3">
          <Gamepad2 className="w-8 h-8 text-purple-400" />
          <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Crypto Casino
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
              <Link to="/tree">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex items-center space-x-2 bg-green-500/20 border-green-400/30 text-green-100 hover:bg-green-500/30"
                >
                  <TreePine className="w-4 h-4" />
                  <span>Money Tree</span>
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

            <MobileNavigation user={user} currentPage="/casino" />
          </div>
        </div>
      </div>
    </header>
  );
};

const ChipsWallet = ({ user }: any) => {
  return (
    <Card className="bg-green-50 border-green-200">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-green-700">
          <Wallet className="w-6 h-6" />
          <span>Casino Wallet</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center">
          <div className="text-6xl mb-4">💰</div>
          <div className="space-y-2">
            <p className="text-2xl font-bold text-green-600">{(user?.chips || 0).toFixed(2)} Chips</p>
            <p className="text-gray-600">Ready to play!</p>
            <Link to="/wallet">
              <Button variant="outline" className="w-full mt-4">
                Convert ₵ Checkels to Chips
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const GameSelector = ({ selectedGame, onSelectGame }: any) => {
  const games = [
    { id: 'color-game', name: 'Color Game', icon: '🎨', description: 'Filipino perya-style betting', available: true, bgColor: 'bg-red' },
    { id: 'blackjack', name: 'Blackjack', icon: '♠️', description: 'Classic card game', available: true, bgColor: 'bg-gray' },
    { id: 'slots', name: 'Slot Machine', icon: '🎰', description: 'Spin the reels', available: true, bgColor: 'bg-yellow' },
    { id: 'baccarat', name: 'Baccarat', icon: '🎴', description: 'High-stakes card game', available: true, bgColor: 'bg-blue' },
    { id: 'minebomb', name: 'Minebomb', icon: '💣', description: 'Avoid the bombs, cash out big!', bgColor: 'bg-orange', available: true },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-purple-700">
          <Gamepad2 className="w-6 h-6" />
          <span>Casino Games</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {games.map((game) => (
            <button
              key={game.id}
              onClick={() => onSelectGame(game.available ? game.id : '')}
              className={`w-full p-3 text-left rounded-lg border transition-all ${
                selectedGame === game.id
                  ? 'border-purple-500 bg-purple-50'
                  : game.available 
                    ? 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    : 'border-gray-200 bg-gray-100 opacity-60 cursor-not-allowed'
              }`}
              disabled={!game.available}
            >
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{game.icon}</span>
                <div className="flex-1">
                  <p className="font-medium text-sm">{game.name}</p>
                  <p className="text-xs text-gray-600">{game.description}</p>
                  {!game.available && (
                    <p className="text-xs text-amber-600 font-medium">Coming Soon</p>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

const ComingSoonGame = ({ name, icon, description }: any) => {
  return (
    <Card className="h-full flex items-center justify-center">
      <CardContent className="text-center p-8">
        <div className="text-8xl mb-4">{icon}</div>
        <h2 className="text-3xl font-bold mb-2">{name}</h2>
        <p className="text-gray-600 mb-4">{description}</p>
        <div className="inline-block px-4 py-2 bg-amber-100 text-amber-800 rounded-full text-sm font-medium">
          🚧 Coming Soon
        </div>
      </CardContent>
    </Card>
  );
};

const AdminPanel = () => {
  const [showPanel, setShowPanel] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (showPanel) {
      loadAllUsers();
    }
  }, [showPanel]);

  const loadAllUsers = async () => {
    try {
      const { getAllUsers } = await import('@/lib/database');
      const users = await getAllUsers();
      setAllUsers(users);
    } catch (error) {
      console.error('Error loading users:', error);
      toast({
        title: "Error",
        description: "Failed to load users from database",
        variant: "destructive",
      });
      setAllUsers([]);
    }
  };

  const handleAddCoins = async (userId: string, username: string, amount: number) => {
    try {
      const { addUserBalance } = await import('@/lib/database');
      await addUserBalance(userId, amount, 0);
      await loadAllUsers();

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
    }
  };

  const handleAddChips = async (userId: string, username: string, amount: number) => {
    try {
      const { addUserBalance } = await import('@/lib/database');
      await addUserBalance(userId, 0, amount);
      await loadAllUsers();

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
    }
  };

  const handleBanUser = async (userId: string, username: string, isBanned: boolean) => {
    try {
      const { banUser, unbanUser } = await import('@/lib/database');
      if (isBanned) {
        await unbanUser(userId);
      } else {
        await banUser(userId);
      }
      await loadAllUsers();

      toast({
        title: isBanned ? "User Unbanned" : "User Banned",
        description: `${username} has been ${isBanned ? 'unbanned' : 'banned'}`,
      });
    } catch (error) {
      console.error('Error banning/unbanning user:', error);
      toast({
        title: "Error",
        description: "Failed to update user status",
        variant: "destructive",
      });
    }
  };

  const handleResetUser = async (userId: string, username: string) => {
    try {
      const { resetUserBalance } = await import('@/lib/database');
      await resetUserBalance(userId);
      await loadAllUsers();

      toast({
        title: "User Reset",
        description: `${username}'s balance has been reset`,
      });
    } catch (error) {
      console.error('Error resetting user:', error);
      toast({
        title: "Error",
        description: "Failed to reset user balance",
        variant: "destructive",
      });
    }
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    if (!confirm(`Are you sure you want to delete ${username}? This action cannot be undone.`)) {
      return;
    }

    try {
      const { deleteUser } = await import('@/lib/database');
      await deleteUser(userId);
      await loadAllUsers();

      toast({
        title: "User Deleted",
        description: `${username} has been deleted`,
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive",
      });
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

    toast({
      title: "LocalStorage Cleared",
      description: "All casino data has been removed from localStorage. Page will reload...",
    });

    // Reload the page
    setTimeout(() => window.location.reload(), 1500);
  };

  if (showPanel) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-red-600">
            <span className="flex items-center space-x-2">
              <Settings className="w-6 h-6" />
              <span>Casino Admin</span>
            </span>
            <Button variant="outline" size="sm" onClick={() => setShowPanel(false)}>
              Close
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-h-80 overflow-y-auto">
            {allUsers.map((userData: any) => (
              <div key={userData.id} className="p-3 bg-white rounded border">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <h3 className="font-bold flex items-center space-x-2">
                        <span>{userData.username}</span>
                        {userData.is_admin && <span className="text-red-500 text-xs bg-red-100 px-2 py-1 rounded">Admin</span>}
                        {userData.is_banned && <span className="text-red-600 text-xs bg-red-100 px-2 py-1 rounded">🚫 Banned</span>}
                      </h3>
                      <div className="text-sm text-gray-600 grid grid-cols-2 gap-2">
                        <span>₵ Checkels: <span className="font-medium text-yellow-600">{(userData.coins || 0).toFixed(2)}</span></span>
                        <span>Chips: <span className="font-medium text-green-600">{(userData.chips || 0).toFixed(2)}</span></span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <Button size="sm" variant="outline" onClick={() => handleAddCoins(userData.id, userData.username, 100)}>
                      +100 ₵
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleAddChips(userData.id, userData.username, 100)}>
                      +100 Chips
                    </Button>
                    <Button 
                      size="sm" 
                      variant={userData.is_banned ? "default" : "destructive"} 
                      onClick={() => handleBanUser(userData.id, userData.username, userData.is_banned)}
                    >
                      {userData.is_banned ? "Unban" : "Ban"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleResetUser(userData.id, userData.username)}>
                      Reset
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDeleteUser(userData.id, userData.username)}>
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
        <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200">
            <h4 className="text-lg font-semibold text-red-700 mb-2">Danger Zone</h4>
            <p className="text-sm text-red-600 mb-3">These actions are irreversible!</p>
            <div className="space-y-2">
              <Button
                variant="destructive" 
                size="sm" 
                onClick={clearAllLocalStorageData}
                className="w-full"
              >
                🧹 Clear ALL LocalStorage Data
              </Button>
              <Button
                variant="destructive" 
                size="sm" 
                onClick={() => {
                  allUsers.forEach(userData => {
                    if (!userData.is_admin) {
                      handleResetUser(userData.id, userData.username);
                    }
                  });
                }}
                className="w-full"
              >
                💥 Reset All User Accounts
              </Button>
            </div>
          </div>
      </Card>
    );
  }

  return (
    <Card className="border-red-200 bg-red-50">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-red-600">
          <Settings className="w-6 h-6" />
          <span>Admin Panel</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Button variant="outline" className="w-full" onClick={() => setShowPanel(true)}>
          Open Casino Admin
        </Button>
      </CardContent>
    </Card>
  );
};

import TransactionHistory from "@/components/TransactionHistory";

const GameCard = ({ title, description, emoji, status, onPlay }: {
  title: string;
  description: string;
  emoji: string;
  status: "available" | "coming-soon";
  onPlay?: () => void;
}) => {
  return (
    <Card className="bg-white/10 backdrop-blur-lg border-white/20 hover:bg-white/15 transition-all">
      <CardHeader>
        <CardTitle className="text-white flex items-center space-x-3">
          <span className="text-3xl">{emoji}</span>
          <span>{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-white/80 mb-4">{description}</p>
        <div className="flex justify-between items-center">
          <Badge 
            variant={status === "available" ? "default" : "secondary"}
            className={status === "available" ? "bg-green-500/20 text-green-100" : "bg-yellow-500/20 text-yellow-100"}
          >
            {status === "available" ? "Available" : "Coming Soon"}
          </Badge>
          <Button 
            size="sm" 
            disabled={status !== "available"}
            onClick={onPlay}
            className="bg-purple-500/20 border-purple-400/30 text-purple-100 hover:bg-purple-500/30"
            variant="outline"
          >
            {status === "available" ? "Play Now" : "Soon"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CasinoPage;