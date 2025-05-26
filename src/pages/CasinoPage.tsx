import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Gamepad2, Wallet, TreePine, Home, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

import { CheckelsIcon, ChipsIcon } from "@/components/ui/icons";
import ColorGame from "@/components/games/ColorGame";
import SlotMachine from "@/components/games/SlotMachine";
import Blackjack from "@/components/games/Blackjack";
import Baccarat from "@/components/games/Baccarat";
import Minebomb from "@/components/games/Minebomb";
import TransactionHistory from "@/components/TransactionHistory";
import { updateUserBalance, addTransaction as addDbTransaction } from "@/lib/database";

const CasinoPage = () => {
  const [user, setUser] = useState<any>(null);
  const [selectedGame, setSelectedGame] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    const savedUser = localStorage.getItem('casinoUser');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    } else {
      window.location.href = '/';
    }
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

  const addTransaction = async (transaction: any) => {
    try {
      await addDbTransaction({
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
                onAddTransaction={addTransaction} 
              />
            )}
            {selectedGame === 'slots' && (
              <SlotMachine 
                user={user} 
                onUpdateUser={updateUser} 
                onAddTransaction={addTransaction} 
              />
            )}
            {selectedGame === 'blackjack' && (
              <Blackjack 
                user={user} 
                onUpdateUser={updateUser} 
                onAddTransaction={addTransaction} 
              />
            )}
            {selectedGame === 'baccarat' && (
              <Baccarat user={user} onUpdateUser={updateUser} onAddTransaction={addTransaction} />
            )}
            {selectedGame === 'minebomb' && (
              <Minebomb user={user} onUpdateUser={updateUser} onAddTransaction={addTransaction} />
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
  const [users, setUsers] = useState<any>({});
  const { toast } = useToast();

  useEffect(() => {
    if (showPanel) {
      const savedUsers = JSON.parse(localStorage.getItem('casinoUsers') || '{}');
      setUsers(savedUsers);
    }
  }, [showPanel]);

  const handleAddChips = (username: string, amount: number) => {
    const updatedUsers = { ...users };
    updatedUsers[username].chips = (updatedUsers[username].chips || 0) + amount;

    localStorage.setItem('casinoUsers', JSON.stringify(updatedUsers));
    setUsers(updatedUsers);

    const currentUser = JSON.parse(localStorage.getItem('casinoUser') || '{}');
    if (currentUser.username === username) {
      localStorage.setItem('casinoUser', JSON.stringify(updatedUsers[username]));
    }

    toast({
      title: "Chips Added",
      description: `Added ${amount} chips to ${username}`,
    });
  };

  const handleResetChips = (username: string) => {
    const updatedUsers = { ...users };
    updatedUsers[username].chips = 0;

    localStorage.setItem('casinoUsers', JSON.stringify(updatedUsers));
    setUsers(updatedUsers);

    const currentUser = JSON.parse(localStorage.getItem('casinoUser') || '{}');
    if (currentUser.username === username) {
      localStorage.setItem('casinoUser', JSON.stringify(updatedUsers[username]));
    }

    localStorage.removeItem(`transactions_${username}`);
    localStorage.removeItem(`casino_transactions_${username}`);

    toast({
      title: "User Reset",
      description: `${username}'s chips and transactions have been reset`,
    });
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
          <div className="space-y-4 max-h-64 overflow-y-auto">
            {Object.entries(users).map(([username, userData]: [string, any]) => (
              <div key={username} className="p-3 bg-white rounded border">
                <div className="flex justify-between items-center">
                  <div className="flex-1">
                    <h3 className="font-bold">
                      {username} {userData.isAdmin && <span className="text-red-500 text-sm">(Admin)</span>}
                    </h3>
                    <div className="text-sm text-gray-600">
                      Chips: <span className="font-medium text-green-600">{userData.chips || 0}</span>
                    </div>
                  </div>
                  <div className="flex space-x-1">
                    <Button size="sm" variant="outline" onClick={() => handleAddChips(username, 100)}>
                      +100
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleResetChips(username)}>
                      Reset
                    </Button>
                  </div>
                </div>
              </div>
            ))}
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

export default CasinoPage;