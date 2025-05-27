import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Coins, DollarSign, ArrowLeftRight, History, Home, Gamepad2, Wallet } from "lucide-react";
import { Link } from "react-router-dom";
import TransactionHistory from "@/components/TransactionHistory";
import { signIn, updateUserBalance, addTransaction, getUserTransactions } from '@/lib/database'
import { supabase } from '@/lib/supabase'

const WalletPage = () => {
  const [user, setUser] = useState<any>(null);
  const [coinsToConvert, setCoinsToConvert] = useState<number>(0);
  const [chipsToConvert, setChipsToConvert] = useState<number>(0);
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadUserAndData = async () => {
      const savedUser = localStorage.getItem("casinoUser");
      if (savedUser) {
        const parsedUser = JSON.parse(savedUser);

        try {
          // Get fresh user data from Supabase
          const freshUser = await signIn(parsedUser.username, parsedUser.password_hash || 'migrated_user');

          // Check if user is banned
          if (freshUser.is_banned) {
            localStorage.removeItem('casinoUser');
            window.location.href = '/';
            return;
          }

          // Update localStorage with fresh data
          localStorage.setItem('casinoUser', JSON.stringify(freshUser));
          setUser(freshUser);

        } catch (error) {
          console.log('Failed to load user from Supabase:', error);
          // If Supabase fails, redirect to login
          localStorage.removeItem('casinoUser');
          window.location.href = '/';
        }
      } else {
        window.location.href = '/';
      }
    };

    loadUserAndData();
  }, []);

  const handleConversion = async (fromCurrency: string, toCurrency: string) => {
    const amount = fromCurrency === 'coins' ? coinsToConvert : chipsToConvert;

    if (amount <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    const fromBalance = fromCurrency === 'coins' ? user.coins : user.chips;
    if (amount > fromBalance) {
      toast({
        title: "Error",
        description: `Insufficient ${fromCurrency}`,
        variant: "destructive",
      });
      return;
    }

    try {
      const convertedAmount = Math.floor(amount * 10); // 1 coin = 10 chips or vice versa (1 chip = 0.1 coins)

      const updates = {
        [fromCurrency]: fromBalance - amount,
        [toCurrency]: toCurrency === 'coins' 
          ? (user[toCurrency] || 0) + Math.floor(amount / 10)
          : (user[toCurrency] || 0) + convertedAmount
      };

      // Update user balance in Supabase
      const updatedUser = await updateUserBalance(user.id, updates);

      // Add transaction record to Supabase
      await addTransaction({
        user_id: user.id,
        type: 'conversion',
        coins_amount: fromCurrency === 'coins' ? -amount : Math.floor(amount / 10),
        chips_amount: fromCurrency === 'chips' ? -amount : convertedAmount,
        description: `Converted ${amount} ${fromCurrency} to ${toCurrency === 'coins' ? Math.floor(amount / 10) : convertedAmount} ${toCurrency}`
      });

      // Update localStorage for session
      localStorage.setItem('casinoUser', JSON.stringify(updatedUser));

      setUser(updatedUser);
      setCoinsToConvert(0);
      setChipsToConvert(0);

      toast({
        title: "Success",
        description: `Converted ${amount} ${fromCurrency} to ${toCurrency === 'coins' ? Math.floor(amount / 10) : convertedAmount} ${toCurrency}`,
      });
    } catch (error) {
      console.error('Conversion error:', error);
      toast({
        title: "Error",
        description: "Failed to process conversion",
        variant: "destructive",
      });
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 text-white">
      <header className="bg-gradient-to-r from-purple-800/90 to-pink-800/90 backdrop-blur-lg border-b border-white/10 p-4 shadow-xl">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-3xl font-bold text-white">
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Wallet
            </span>
          </h1>
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-4 bg-black/20 rounded-full px-4 py-2 border border-white/10">
              <div className="flex items-center space-x-2">
                <Coins className="w-5 h-5 text-yellow-400" />
                <span className="text-yellow-100 font-semibold">
                  {(user?.coins || 0).toFixed(2)} ₵ Checkels
                </span>
              </div>
              <div className="w-px h-6 bg-white/20"></div>
              <div className="flex items-center space-x-2">
                <DollarSign className="w-5 h-5 text-green-400" />
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
            </div>
          </div>
        </div>
      </header>
      <div className="max-w-4xl mx-auto p-6">
        <Card className="mb-4 bg-black/20 border border-white/10">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Currency Conversion</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <Input
                  type="number"
                  placeholder="Enter ₵ Checkels to Convert"
                  value={coinsToConvert}
                  onChange={(e) => setCoinsToConvert(Number(e.target.value))}
                  className="bg-black/40 border-white/20 text-white placeholder-white/60"
                />
              </div>
              <ArrowLeftRight className="w-6 h-6 text-white/70" />
              <div className="flex-1">
                <Input
                  type="number"
                  placeholder="Enter Chips to Convert"
                  value={chipsToConvert}
                  onChange={(e) => setChipsToConvert(Number(e.target.value))}
                  className="bg-black/40 border-white/20 text-white placeholder-white/60"
                />
              </div>
            </div>
            <div className="flex justify-center space-x-4">
              <Button 
                onClick={() => handleConversion('coins', 'chips')}
                className="bg-gradient-to-r from-yellow-500 to-green-500 hover:from-yellow-600 hover:to-green-600 text-black font-bold"
              >
                Convert ₵ Checkels to Chips
              </Button>
              <Button 
                onClick={() => handleConversion('chips', 'coins')}
                className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white font-bold"
              >
                Convert Chips to ₵ Checkels
              </Button>
            </div>
          </CardContent>
        </Card>
        <TransactionHistory user={user} />
      </div>
    </div>
  );
};

export default WalletPage;