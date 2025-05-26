import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, CreditCard, Home, TreePine, Gamepad2, Wallet, Banknote } from "lucide-react";
import { Link } from "react-router-dom";
import { CheckelsIcon, ChipsIcon } from "@/components/ui/icons";
import { updateUserBalance, createWithdrawalRequest, addTransaction, signIn } from "@/lib/database";

const WithdrawPage = () => {
  const [user, setUser] = useState<any>(null);
  const [amount, setAmount] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    const loadUserData = async () => {
      const savedUser = localStorage.getItem('casinoUser');
      if (savedUser) {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        
        // Sync with Supabase to get latest data
        try {
          const freshUser = await signIn(parsedUser.username, parsedUser.password_hash || 'migrated_user');
          localStorage.setItem('casinoUser', JSON.stringify(freshUser));
          setUser(freshUser);
        } catch (error) {
          console.log('Using localStorage data, Supabase sync failed:', error);
          // Ensure user has required fields
          const userWithDefaults = {
            ...parsedUser,
            coins: parsedUser.coins || 0,
            chips: parsedUser.chips || 0,
            isAdmin: parsedUser.isAdmin || parsedUser.is_admin || false
          };
          setUser(userWithDefaults);
        }
      } else {
        setTimeout(() => {
          window.location.href = '/';
        }, 100);
      }
    };
    
    loadUserData();
  }, []);

  const handleWithdraw = async () => {
    if (!amount || !withdrawMethod || !accountNumber || !accountName) {
      toast({
        title: "Missing Information",
        description: "Please fill all required fields",
        variant: "destructive",
      });
      return;
    }

    const chipsAmount = parseFloat(amount);
    if (isNaN(chipsAmount) || chipsAmount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    if (chipsAmount > user.chips) {
      toast({
        title: "Insufficient Balance",
        description: "You don't have enough chips to withdraw",
        variant: "destructive",
      });
      return;
    }

    if (chipsAmount < 50) {
      toast({
        title: "Minimum Withdrawal",
        description: "Minimum withdrawal amount is 50 chips (₱500)",
        variant: "destructive",
      });
      return;
    }

    try {
      // Update balance in Supabase
      const updatedUser = await updateUserBalance(user.id, {
        chips: Math.round((user.chips - chipsAmount) * 100) / 100
      });

      // Create withdrawal request in Supabase
      await createWithdrawalRequest({
        user_id: user.id,
        username: user.username,
        amount: chipsAmount,
        withdrawal_method: withdrawMethod,
        account_number: accountNumber,
        account_name: accountName,
        php_amount: chipsAmount * 10
      });

      // Add transaction record in Supabase
      await addTransaction({
        user_id: user.id,
        type: 'withdrawal',
        amount: -chipsAmount,
        description: `Withdrawal to ${withdrawMethod} - ${accountNumber}`
      });

      // Update local state
      setUser(updatedUser);
      localStorage.setItem('casinoUser', JSON.stringify(updatedUser));

    toast({
        title: "Withdrawal Successful!",
        description: `₱${(chipsAmount * 10).toFixed(2)} will be sent to your ${withdrawMethod} account`,
      });

      // Reset form
      setAmount('');
      setWithdrawMethod('');
      setAccountNumber('');
      setAccountName('');
    } catch (error) {
      console.error('Error processing withdrawal:', error);
      toast({
        title: "Withdrawal Failed",
        description: "Failed to process withdrawal. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <header className="bg-gradient-to-r from-indigo-800/90 to-purple-800/90 backdrop-blur-lg border-b border-white/10 p-4 shadow-xl">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-3xl font-bold text-white flex items-center space-x-3">
            <Banknote className="w-8 h-8 text-purple-400" />
            <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Withdraw Chips
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
                  <Button variant="outline" size="sm" className="flex items-center space-x-2 bg-blue-500/20 border-blue-400/30 text-blue-100 hover:bg-blue-500/30">
                    <Home className="w-4 h-4" />
                    <span>Home</span>
                  </Button>
                </Link>
                <Link to="/wallet">
                  <Button variant="outline" size="sm" className="flex items-center space-x-2 bg-green-500/20 border-green-400/30 text-green-100 hover:bg-green-500/30">
                    <Wallet className="w-4 h-4" />
                    <span>Wallet</span>
                  </Button>
                </Link>
                <Link to="/casino">
                  <Button variant="outline" size="sm" className="flex items-center space-x-2 bg-purple-500/20 border-purple-400/30 text-purple-100 hover:bg-purple-500/30">
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
        <Card className="bg-gradient-to-br from-orange-50 to-red-50 border-orange-200 shadow-lg">
          <CardHeader>
            <CardTitle className="text-orange-700 flex items-center space-x-2">
              <Banknote className="w-6 h-6" />
              <span>Withdraw to Cash</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-gradient-to-r from-white to-gray-50 rounded-lg border shadow-sm">
              <div className="text-center mb-6 p-4 bg-orange-50 rounded-lg border border-orange-200">
                <p className="font-bold text-xl text-orange-700">1 Chip = ₱10 PHP</p>
                <p className="text-sm text-orange-600 mt-1">Minimum withdrawal: 50 chips (₱500)</p>
                <p className="text-sm text-orange-600">Available: {user?.chips?.toFixed(2) || 0} chips</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Withdrawal Amount (Chips) *</label>
                  <Input
                    type="number"
                    min="50"
                    max={user?.chips || 0}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter chips amount (minimum 50)"
                    className="w-full"
                  />
                  {amount && (
                    <p className="text-sm text-gray-600 mt-1">
                      You will receive: ₱{(parseFloat(amount) * 10 || 0).toFixed(2)} PHP
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Withdrawal Method *</label>
                  <Select value={withdrawMethod} onValueChange={setWithdrawMethod}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select withdrawal method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="paymaya">PayMaya</SelectItem>
                      <SelectItem value="gcash">GCash</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Account Number *</label>
                  <Input
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="Enter your account number"
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Account Name *</label>
                  <Input
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    placeholder="Enter account holder name"
                    className="w-full"
                  />
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> This is a demo withdrawal. In a real application, 
                    the money would be transferred to your selected account within 1-3 business days.
                  </p>
                </div>

                <Button 
                  onClick={handleWithdraw}
                  className="w-full py-3 text-lg bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
                  disabled={!amount || !withdrawMethod || !accountNumber || !accountName || parseFloat(amount) > (user?.chips || 0)}
                >
                  Withdraw {amount ? `${amount} chips (₱${(parseFloat(amount) * 10).toFixed(2)})` : 'Chips'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WithdrawPage;