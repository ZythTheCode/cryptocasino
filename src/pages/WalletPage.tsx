import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Coins, Home, TreePine, Gamepad2, Wallet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

import { CheckelsIcon, ChipsIcon } from "@/components/ui/icons";

const WalletPage = () => {
  const [user, setUser] = useState<any>(null);
  const [convertAmount, setConvertAmount] = useState(0.01);
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
    if (!user || convertAmount > user.coins || convertAmount < 0.01) {
      toast({
        title: convertAmount < 0.01 ? "Minimum Amount" : "Insufficient ₵ Checkels",
        description: convertAmount < 0.01 ? "Minimum conversion amount is 0.01 ₵ Checkels" : "You don't have enough ₵ Checkels to convert",
        variant: "destructive",
      });
      return;
    }

    const roundedAmount = Math.round(convertAmount * 100) / 100; // Round to 2 decimal places
    const chipsEarned = roundedAmount * 10;

    const updatedUser = {
      ...user,
      coins: Math.round((user.coins - roundedAmount) * 100) / 100,
      chips: Math.round((user.chips + chipsEarned) * 100) / 100
    };

    const newTransaction = {
      type: 'conversion',
      coinsAmount: roundedAmount,
      chipsAmount: chipsEarned,
      timestamp: new Date().toISOString()
    };

    const updatedTransactions = [newTransaction, ...transactions];
    localStorage.setItem(`transactions_${user.username}`, JSON.stringify(updatedTransactions.slice(0, 50)));
    setTransactions(updatedTransactions);

    setUser(updatedUser);
    localStorage.setItem('casinoUser', JSON.stringify(updatedUser));

    toast({
      title: "Conversion successful!",
      description: `Converted ${roundedAmount.toFixed(2)} ₵ Checkels to ${chipsEarned.toFixed(2)} chips`,
    });
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <header className="bg-gradient-to-r from-indigo-800/90 to-purple-800/90 backdrop-blur-lg border-b border-white/10 p-4 shadow-xl">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-3xl font-bold text-white flex items-center space-x-3">
            <Wallet className="w-8 h-8 text-purple-400" />
            <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              ₵ Checkels Wallet
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
                    <span>Tree</span>
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
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-6">
        <div className="grid gap-6">
          <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200 shadow-lg">
            <CardHeader>
              <CardTitle className="text-purple-700 flex items-center space-x-2">
                <Wallet className="w-6 h-6" />
                <span>Balance Overview</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 p-4 bg-gradient-to-r from-white to-gray-50 rounded-lg border shadow-sm">
                <div className="text-center p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <p className="text-sm text-gray-600 mb-1">Available ₵ Checkels</p>
                  <p className="font-bold text-2xl text-yellow-600">{(user.coins || 0).toFixed(2)}</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-sm text-gray-600 mb-1">Casino Chips</p>
                  <p className="font-bold text-2xl text-green-600">{(user.chips || 0).toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200 shadow-lg">
            <CardHeader>
              <CardTitle className="text-blue-700 flex items-center space-x-2">
              <CheckelsIcon className="w-6 h-6" />
              <span>Convert ₵ Checkels to Chips</span>
            </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-gradient-to-r from-white to-gray-50 rounded-lg border shadow-sm">
                <div className="text-center mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="font-bold text-xl text-blue-700">1 ₵ Checkel = 10 Casino Chips</p>
                  <p className="text-sm text-blue-600 mt-1">Minimum conversion: 0.01 ₵ Checkels</p>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">Convert Amount:</label>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      max={user?.coins || 0}
                      value={convertAmount}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0.01;
                        setConvertAmount(Math.max(0.01, Math.min(value, user?.coins || 0)));
                      }}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                      placeholder="0.01"
                    />
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-sm text-gray-600">You will receive:</p>
                    <p className="font-bold text-xl text-green-600">{(convertAmount * 10).toFixed(2)} Chips</p>
                  </div>
                  <Button 
                    onClick={handleConvert} 
                    className="w-full py-3 text-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700" 
                    disabled={!user?.coins || convertAmount < 0.01 || convertAmount > user.coins}
                  >
                    Convert {convertAmount.toFixed(2)} ₵ Checkels → {(convertAmount * 10).toFixed(2)} Chips
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-gray-50 to-slate-50 border-gray-200 shadow-lg">
            <CardHeader>
              <CardTitle className="text-gray-700 flex items-center space-x-2">
                <span className="text-xl">📋</span>
                <span>Transaction History</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {transactions.map((tx, index) => (
                  <div key={index} className="p-4 bg-white rounded-lg border shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-gray-700">
                        Converted {(tx.coinsAmount || 0).toFixed(2)} ₵ Checkels
                      </span>
                      <span className="font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full">
                        +{(tx.chipsAmount || 0).toFixed(2)} chips
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 flex items-center space-x-1">
                      <span>🕒</span>
                      <span>{new Date(tx.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
                {transactions.length === 0 && (
                  <div className="text-center py-8">
                    <span className="text-6xl mb-4 block">💳</span>
                    <p className="text-gray-500">No transactions yet</p>
                    <p className="text-sm text-gray-400 mt-1">Your conversion history will appear here</p>
                  </div>
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