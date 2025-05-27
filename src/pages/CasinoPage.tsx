import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Gamepad2, DollarSign, Coins, Home, TreePine, Wallet, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import SlotMachine from "@/components/games/SlotMachine";
import Blackjack from "@/components/games/Blackjack";
import Baccarat from "@/components/games/Baccarat";
import ColorGame from "@/components/games/ColorGame";
import Minebomb from "@/components/games/Minebomb";
import { updateUserBalance, addTransaction, signIn } from "@/lib/database";
import { CheckelsIcon, ChipsIcon } from "@/components/ui/icons";

const CasinoPage = () => {
  const [user, setUser] = useState<any>(null);
  const [selectedGame, setSelectedGame] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    const loadUserData = async () => {
      const savedUser = localStorage.getItem('casinoUser');
      if (savedUser) {
        const parsedUser = JSON.parse(savedUser);

        // Set user immediately with localStorage data
        setUser(parsedUser);

        // Try to sync with Supabase to get latest data
        try {
          const freshUser = await signIn(parsedUser.username, parsedUser.password_hash || 'migrated_user');
          localStorage.setItem('casinoUser', JSON.stringify(freshUser));
          setUser(freshUser);
        } catch (error) {
          console.log('Using localStorage data, Supabase sync failed:', error);
          // Ensure user has required fields for casino
          const userWithDefaults = {
            ...parsedUser,
            coins: parsedUser.coins || 0,
            chips: parsedUser.chips || 0,
            isAdmin: parsedUser.isAdmin || parsedUser.is_admin || false
          };
          setUser(userWithDefaults);
          localStorage.setItem('casinoUser', JSON.stringify(userWithDefaults));
        }
      } else {
        // Redirect to home if no user data
        window.location.href = '/';
      }
    };

    loadUserData();
  }, []);

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
      const { addTransaction } = await import('@/lib/database');
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

  if (!user) {
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <CasinoHeader user={user} />
      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          {/* Left Sidebar - Wallet & Game Selection */}
          <div className="xl:col-span-1 space-y-6">
            <ChipsWallet user={user} />
            <GameSelector selectedGame={selectedGame} onSelectGame={setSelectedGame} />
            {user?.isAdmin && <AdminPanel />}
          </div>

          {/* Main Content - Game */}
          <div className="xl:col-span-2">
            {selectedGame === 'color-game' && (
              <ColorGame 
                user={user} 
                onUpdateUser={updateUser} 
                onAddTransaction={addTransactionRecord} 
              />
            )}
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
            {selectedGame === 'baccarat' && (
              <Baccarat user={user} onUpdateUser={updateUser} onAddTransaction={addTransactionRecord} />
            )}
            {selectedGame === 'minebomb' && (
              <Minebomb user={user} onUpdateUser={updateUser} onAddTransaction={addTransactionRecord} />
            )}
            {selectedGame === 'roulette' && (
              <ComingSoonGame name="Roulette" icon="🔴" description="Red, black, or green" />
            )}
            {!selectedGame && (
              <Card className="h-full flex items-center justify-center">
                <CardContent className="text-center p-8">
                  <div className="text-6xl mb-4">🎮</div>
                  <h2 className="text-2xl font-bold mb-2">Welcome to the Casino!</h2>
                  <p className="text-gray-600">Select a game from the left to start playing</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Sidebar - Transaction History (wider) */}
          <div className="xl:col-span-2">
            <TransactionHistory user={user} />
          </div>
        </div>
      </div>
    </div>
  );
};

const CasinoHeader = ({ user }: any) => {
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
          <div className="flex items-center space-x-4 bg-black/20 rounded-full px-4 py-2 border border-white/10">
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
            <span className="text-white/90 font-medium">Welcome, {user?.username}</span>
            <div className="flex space-x-2">
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
    { id: 'color-game', name: 'Color Game', icon: '🎨', description: 'Filipino perya-style betting', available: true, bgColor: 'bg-red', available: true },
    { id: 'blackjack', name: 'Blackjack', icon: '♠️', description: 'Classic card game', available: true, bgColor: 'bg-gray', available: true },
    { id: 'slots', name: 'Slot Machine', icon: '🎰', description: 'Spin the reels', available: true, bgColor: 'bg-yellow', available: true },
    { id: 'baccarat', name: 'Baccarat', icon: '🎴', description: 'High-stakes card game', available: true, bgColor: 'bg-blue', available: true },
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

const TransactionHistory = ({ user }: any) => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const loadTransactions = async () => {
      if (user?.id) {
        try {
          setIsLoading(true);
          const { getUserTransactions } = await import('@/lib/database');
          const dbTransactions = await getUserTransactions(user.id, 50);
          
          // Format transactions for display
          const formattedTransactions = dbTransactions.map((tx: any) => ({
            ...tx,
            timestamp: new Date(tx.created_at).getTime(),
            description: tx.description || `${tx.type} transaction`
          }));
          
          setTransactions(formattedTransactions);
        } catch (error) {
          console.error('Error loading transactions from Supabase:', error);
          toast({
            title: "Warning",
            description: "Failed to load transaction history",
            variant: "destructive",
          });
          setTransactions([]);
        } finally {
          setIsLoading(false);
        }
      }
    };

    loadTransactions();
    
    // Set up real-time subscription for user transactions
    const { supabase } = require('@/lib/supabase');
    const subscription = supabase
      .channel(`user_transactions_${user?.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'transactions',
        filter: `user_id=eq.${user?.id}`
      }, (payload) => {
        console.log('Transaction change detected for user:', payload);
        loadTransactions(); // Reload transactions when changes occur
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <DollarSign className="w-6 h-6 text-green-500" />
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
                    <p className="font-medium">
                      {transaction.game && `${transaction.game} - `}
                      {transaction.description}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(transaction.created_at || transaction.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    {transaction.type === 'conversion' ? (
                      <div>
                        <p className="text-xs text-red-600">-{(transaction.coins_amount || 0).toFixed(2)} ₵</p>
                        <p className="text-xs text-green-600">+{(transaction.chips_amount || 0).toFixed(2)} chips</p>
                      </div>
                    ) : (
                      <div className={`font-bold ${(transaction.amount || 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {(transaction.amount || 0) >= 0 ? "+" : ""}
                        {(transaction.amount || 0).toFixed(2)} Chips
                      </div>
                    )}
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

export default CasinoPage;