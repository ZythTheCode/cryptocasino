
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Gamepad2, Wallet, TreePine, Home, Settings } from "lucide-react";
import { Link } from "react-router-dom";

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
                Get More Chips from Tree
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

export default CasinoPage;
