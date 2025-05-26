
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Coins, Home, TreePine, Gamepad2, Wallet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

const WalletPage = () => {
  const [user, setUser] = useState<any>(null);
  const [convertAmount, setConvertAmount] = useState(1);
  const [transactions, setTransactions] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const savedUser = localStorage.getItem('casinoUser');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
      const savedTransactions = localStorage.getItem(`transactions_${JSON.parse(savedUser).username}`);
      setTransactions(savedTransactions ? JSON.parse(savedTransactions) : []);
    } else {
      window.location.href = '/';
    }
  }, []);

  const handleConvert = () => {
    if (!user || convertAmount > user.coins) {
      toast({
        title: "Insufficient ₵checkels",
        description: "You don't have enough ₵checkels to convert",
        variant: "destructive",
      });
      return;
    }

    const updatedUser = {
      ...user,
      coins: user.coins - convertAmount,
      chips: user.chips + (convertAmount * 10)
    };

    const newTransaction = {
      type: 'conversion',
      coinsAmount: convertAmount,
      chipsAmount: convertAmount * 10,
      timestamp: new Date().toISOString()
    };

    const updatedTransactions = [newTransaction, ...transactions];
    localStorage.setItem(`transactions_${user.username}`, JSON.stringify(updatedTransactions.slice(0, 50)));
    setTransactions(updatedTransactions);

    setUser(updatedUser);
    localStorage.setItem('casinoUser', JSON.stringify(updatedUser));

    toast({
      title: "Conversion successful!",
      description: `Converted ${convertAmount} ₵checkels to ${convertAmount * 10} chips`,
    });
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <header className="bg-black/20 backdrop-blur-sm p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white flex items-center space-x-2">
            <Wallet className="w-8 h-8 text-purple-400" />
            <span>₵checkel Wallet</span>
          </h1>
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
                <span>Tree</span>
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
      </header>

      <div className="max-w-4xl mx-auto p-6">
        <div className="grid gap-6">
          <Card className="bg-purple-50 border-purple-200">
            <CardHeader>
              <CardTitle className="text-purple-700">Balance Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 p-3 bg-white rounded border">
                <div className="text-center">
                  <p className="text-sm text-gray-600">Available ₵checkels</p>
                  <p className="font-bold text-lg text-yellow-600">{user.coins}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Casino Chips</p>
                  <p className="font-bold text-lg text-green-600">{user.chips}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-purple-50 border-purple-200">
            <CardHeader>
              <CardTitle className="text-purple-700">Convert ₵checkels to Chips</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-3 bg-white rounded border">
                <p className="font-bold text-lg text-center">1 ₵checkel = 10 Casino Chips</p>
                <div className="mt-3">
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
                <Button onClick={handleConvert} className="w-full mt-3" disabled={!user?.coins}>
                  Convert to {convertAmount * 10} Chips
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-purple-50 border-purple-200">
            <CardHeader>
              <CardTitle className="text-purple-700">Transaction History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {transactions.map((tx, index) => (
                  <div key={index} className="p-2 bg-white rounded border text-sm">
                    <div className="flex justify-between">
                      <span>Converted {tx.coinsAmount} ₵checkels</span>
                      <span className="text-green-600">+{tx.chipsAmount} chips</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(tx.timestamp).toLocaleString()}
                    </div>
                  </div>
                ))}
                {transactions.length === 0 && (
                  <p className="text-center text-gray-500 text-sm">No transactions yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default WalletPage;
