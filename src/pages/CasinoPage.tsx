
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Gamepad2, Wallet, TreePine, Home, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const CasinoPage = () => {
  const [user, setUser] = useState<any>(null);

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <ChipsWallet user={user} />
          <GamesGrid />
          {user?.isAdmin && <AdminPanel />}
        </div>
      </div>
    </div>
  );
};

const CasinoHeader = ({ user }: any) => {
  return (
    <header className="bg-black/20 backdrop-blur-sm p-4">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white flex items-center space-x-2">
          <Gamepad2 className="w-8 h-8 text-purple-400" />
          <span>Crypto Casino</span>
        </h1>
        <div className="flex items-center space-x-6 text-white">
          <div className="flex items-center space-x-2">
            <Wallet className="w-5 h-5 text-green-400" />
            <span>{user?.chips || 0} Chips</span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-white">Welcome, {user?.username}</span>
            <Link to="/">
              <Button variant="outline" size="sm" className="flex items-center space-x-2">
                <Home className="w-4 h-4" />
                <span>Home</span>
              </Button>
            </Link>
            <Link to="/tree">
              <Button variant="outline" size="sm" className="flex items-center space-x-2">
                <TreePine className="w-4 h-4" />
                <span>Money Tree</span>
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
            <p className="text-2xl font-bold text-green-600">{user?.chips || 0} Chips</p>
            <p className="text-gray-600">Ready to play!</p>
            <Link to="/tree">
              <Button variant="outline" className="w-full mt-4">
                Get More ₵ Checkels from Tree
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const GamesGrid = () => {
  const games = [
    { name: 'Color Game', icon: '🎨', description: 'Guess the winning color' },
    { name: 'Blackjack', icon: '🃏', description: 'Beat the dealer to 21' },
    { name: 'Poker', icon: '♠️', description: 'Texas Hold\'em style' },
    { name: 'Slot Machine', icon: '🎰', description: 'Spin to win big' },
    { name: 'Baccarat', icon: '🎲', description: 'Player vs Banker' },
    { name: 'Roulette', icon: '🔴', description: 'Red, black, or green' },
  ];

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-white">
          <Gamepad2 className="w-6 h-6" />
          <span>Casino Games</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {games.map((game) => (
            <Card key={game.name} className="hover:bg-gray-50 transition-colors cursor-pointer">
              <CardContent className="p-4">
                <div 
                  className="text-center space-y-2"
                  onClick={() => alert(`${game.name} coming soon!`)}
                >
                  <div className="text-3xl">{game.icon}</div>
                  <div>
                    <p className="font-medium text-sm">{game.name}</p>
                    <p className="text-xs text-gray-600">{game.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
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
    
    // Update current user if it's the same user
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
    
    // Update current user if it's the same user
    const currentUser = JSON.parse(localStorage.getItem('casinoUser') || '{}');
    if (currentUser.username === username) {
      localStorage.setItem('casinoUser', JSON.stringify(updatedUsers[username]));
    }
    
    // Clear conversion transactions
    localStorage.removeItem(`transactions_${username}`);
    
    toast({
      title: "Chips Reset",
      description: `${username}'s chips have been reset to 0`,
    });
  };

  const getCasinoStats = () => {
    const userList = Object.values(users);
    return {
      totalChips: userList.reduce((sum: number, user: any) => sum + (user.chips || 0), 0),
      averageChips: userList.length > 0 ? 
        userList.reduce((sum: number, user: any) => sum + (user.chips || 0), 0) / userList.length : 0,
      richestPlayer: userList.reduce((max: any, user: any) => 
        (user.chips || 0) > (max.chips || 0) ? user : max, { chips: 0, username: 'None' }
      )
    };
  };

  if (showPanel) {
    const stats = getCasinoStats();
    return (
      <Card className="border-red-200 bg-red-50 lg:col-span-3">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-red-600">
            <span className="flex items-center space-x-2">
              <Settings className="w-6 h-6" />
              <span>Casino Admin Panel</span>
            </span>
            <Button variant="outline" size="sm" onClick={() => setShowPanel(false)}>
              Close
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-white rounded border">
              <h3 className="font-bold text-2xl text-green-600">{stats.totalChips.toFixed(0)}</h3>
              <p className="text-sm text-gray-600">Total Chips in Economy</p>
            </div>
            <div className="text-center p-4 bg-white rounded border">
              <h3 className="font-bold text-2xl text-blue-600">{stats.averageChips.toFixed(0)}</h3>
              <p className="text-sm text-gray-600">Average Chips per User</p>
            </div>
            <div className="text-center p-4 bg-white rounded border">
              <h3 className="font-bold text-lg text-purple-600">{stats.richestPlayer.username}</h3>
              <p className="text-sm text-gray-600">Richest Player ({stats.richestPlayer.chips} chips)</p>
            </div>
          </div>

          <div className="space-y-4 max-h-96 overflow-y-auto">
            {Object.entries(users).map(([username, userData]: [string, any]) => (
              <div key={username} className="p-4 bg-white rounded border">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-bold text-lg">
                      {username} {userData.isAdmin && <span className="text-red-500 text-sm">(Admin)</span>}
                    </h3>
                    <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                      <div>Casino Chips: <span className="font-medium text-green-600">{userData.chips || 0}</span></div>
                      <div>Total ₵ Checkels: <span className="font-medium text-yellow-600">{userData.coins || 0}</span></div>
                    </div>
                    <div className="mt-2">
                      <p className="text-xs text-gray-600">
                        Conversions: {JSON.parse(localStorage.getItem(`transactions_${username}`) || '[]').length} total
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col space-y-2 ml-4">
                    <Button size="sm" variant="outline" onClick={() => handleAddChips(username, 100)}>
                      +100 Chips
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleAddChips(username, 1000)}>
                      +1000 Chips
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleResetChips(username)}>
                      Reset Chips
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 bg-white p-4 rounded border">
            <h3 className="font-bold mb-3">Casino Controls</h3>
            <div className="grid grid-cols-2 gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  // Clear all conversion transactions
                  Object.keys(users).forEach(username => {
                    localStorage.removeItem(`transactions_${username}`);
                  });
                  toast({
                    title: "Transactions Cleared",
                    description: "All conversion histories cleared",
                  });
                }}
              >
                Clear All Conversions
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  // Reset all chips to 0
                  const updatedUsers = { ...users };
                  Object.keys(updatedUsers).forEach(username => {
                    updatedUsers[username].chips = 0;
                  });
                  localStorage.setItem('casinoUsers', JSON.stringify(updatedUsers));
                  setUsers(updatedUsers);
                  toast({
                    title: "Economy Reset",
                    description: "All user chips reset to 0",
                  });
                }}
              >
                Reset All Chips
              </Button>
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
          <span>Admin Panel</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Button variant="outline" className="w-full" onClick={() => setShowPanel(true)}>
            Open Casino Admin
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CasinoPage;
