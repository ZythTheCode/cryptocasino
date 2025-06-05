import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Coins, 
  DollarSign, 
  ArrowLeftRight, 
  CreditCard,
  Banknote,
  Plus,
  Minus,
  History,
  Home,
  Gamepad2,
  Users,
  TreePine,
  Upload,
  Wallet,
  TrendingUp,
  TrendingDown
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { signIn, updateUserBalance, addTransaction, getUserTransactions, createTopupRequest, createWithdrawalRequest } from '@/lib/database';
import { CheckelsIcon, ChipsIcon } from "@/components/ui/icons";
import { supabase } from '@/lib/supabase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const WalletPage = () => {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(true);
  const [convertAmount, setConvertAmount] = useState(0);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    const loadUserData = async () => {
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
          title: "Loading Wallet",
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
            title: "Wallet Ready! 💰",
            description: `Welcome to your wallet, ${freshUser.username}!`,
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

  const loadTransactions = async (userId: string) => {
    try {
      const supabaseTransactions = await getUserTransactions(userId, 50);

      const walletTransactions = supabaseTransactions.filter((tx: any) => 
        tx.type === 'conversion' || tx.type === 'chip_conversion' || tx.type === 'topup' || tx.type === 'withdrawal'
      );

      setTransactions(walletTransactions);
    } catch (error) {
      console.error('Error loading wallet transactions from Supabase:', error);
      setTransactions([]);
    }
  };

  useEffect(() => {
    if (user?.id) {
      loadTransactions(user.id);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id && supabase) {
      const uniqueId = `${user.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const subscription = supabase
        .channel(`wallet_transactions_${uniqueId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: `user_id=eq.${user.id}`
        }, (payload) => {
          console.log('Wallet transaction change detected:', payload);
          if (['conversion', 'chip_conversion', 'topup', 'withdrawal'].includes(payload.new?.type || payload.old?.type)) {
            loadTransactions(user.id);
          }
        })
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${user.id}`
        }, (payload) => {
          console.log('User balance change detected:', payload);
          if (payload.new) {
            const updatedUser = { ...user, ...payload.new };
            localStorage.setItem('casinoUser', JSON.stringify(updatedUser));
            setUser(updatedUser);
          }
        })
        .subscribe();

      return () => {
        supabase.removeChannel(subscription);
      };
    }
  }, [user?.id]);

  if (isLoading || pageLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 flex items-center justify-center">
        <div className="flex items-center space-x-2 text-white">
          <div className="w-6 h-6 border-2 border-white border-t-transparent animate-spin rounded-full"></div>
          <span>Loading wallet...</span>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 text-white">
      <header className="bg-gradient-to-r from-blue-800/90 to-purple-800/90 backdrop-blur-lg border-b border-white/10 p-4 shadow-xl">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-3xl font-bold text-white">
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent flex items-center space-x-3">
              <Wallet className="w-8 h-8 text-blue-400" />
              Digital Wallet
            </span>
          </h1>
          <div className="flex items-center space-x-6">
            <div className="hidden md:flex items-center space-x-4 bg-black/20 rounded-full px-6 py-3 border border-white/10">
              <div className="flex items-center space-x-2">
                <CheckelsIcon className="w-6 h-6 text-yellow-400" />
                <span className="text-yellow-100 font-bold text-lg">
                  {(user?.coins || 0).toFixed(2)} ₵
                </span>
              </div>
              <div className="w-px h-8 bg-white/20"></div>
              <div className="flex items-center space-x-2">
                <ChipsIcon className="w-6 h-6 text-green-400" />
                <span className="text-green-100 font-bold text-lg">
                  {(user?.chips || 0).toFixed(2)}
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <span className="hidden md:block text-white/90 font-medium">Welcome, {user?.username}</span>
              <div className="hidden md:flex space-x-2">
                <Link to="/">
                  <Button variant="outline" size="sm" className="flex items-center space-x-2 bg-blue-500/20 border-blue-400/30 text-blue-100 hover:bg-blue-500/30">
                    <Home className="w-4 h-4" />
                    <span>Home</span>
                  </Button>
                </Link>
                <Link to="/casino">
                  <Button variant="outline" size="sm" className="flex items-center space-x-2 bg-purple-500/20 border-purple-400/30 text-purple-100 hover:bg-purple-500/30">
                    <Gamepad2 className="w-4 h-4" />
                    <span>Casino</span>
                  </Button>
                </Link>
                <Link to="/tree">
                  <Button variant="outline" size="sm" className="flex items-center space-x-2 bg-green-500/20 border-green-400/30 text-green-100 hover:bg-green-500/30">
                    <TreePine className="w-4 h-4" />
                    <span>Tree</span>
                  </Button>
                </Link>
              </div>

              <MobileNavigation user={user} currentPage="/wallet" />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Balance Overview */}
          <div className="lg:col-span-3">
            <Card className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 border-white/20 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-2xl text-white flex items-center space-x-3">
                  <TrendingUp className="w-8 h-8 text-green-400" />
                  <span>Account Balance</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 p-6 rounded-xl border border-yellow-400/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-yellow-100 text-sm font-medium">₵ Checkels</p>
                        <p className="text-3xl font-bold text-yellow-300">{(user?.coins || 0).toFixed(2)}</p>
                        <p className="text-yellow-200 text-sm">Earned from Money Tree</p>
                      </div>
                      <CheckelsIcon className="w-16 h-16 text-yellow-400" />
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 p-6 rounded-xl border border-green-400/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-green-100 text-sm font-medium">Casino Chips</p>
                        <p className="text-3xl font-bold text-green-300">{(user?.chips || 0).toFixed(2)}</p>
                        <p className="text-green-200 text-sm">≈ ₱{((user?.chips || 0) * 10).toFixed(2)} PHP</p>
                      </div>
                      <ChipsIcon className="w-16 h-16 text-green-400" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Wallet Functions */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="convert" className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-black/20">
                <TabsTrigger value="convert" className="data-[state=active]:bg-blue-600">
                  <ArrowLeftRight className="w-4 h-4 mr-2" />
                  Convert
                </TabsTrigger>
                <TabsTrigger value="topup" className="data-[state=active]:bg-green-600">
                  <Plus className="w-4 h-4 mr-2" />
                  Top Up
                </TabsTrigger>
                <TabsTrigger value="withdraw" className="data-[state=active]:bg-red-600">
                  <Minus className="w-4 h-4 mr-2" />
                  Withdraw
                </TabsTrigger>
              </TabsList>

              <TabsContent value="convert">
                <ConvertSection user={user} setUser={setUser} />
              </TabsContent>

              <TabsContent value="topup">
                <TopUpSection user={user} />
              </TabsContent>

              <TabsContent value="withdraw">
                <WithdrawSection user={user} />
              </TabsContent>
            </Tabs>
          </div>

          {/* Transaction History */}
          <div className="lg:col-span-1">
            <WalletTransactionHistory transactions={transactions} />
          </div>
        </div>
      </div>
    </div>
  );
};

const ConvertSection = ({ user, setUser }: any) => {
  const [coinsToConvert, setCoinsToConvert] = useState<number>(0);
  const [chipsToConvert, setChipsToConvert] = useState<number>(0);
  const { toast } = useToast();

  const handleConversion = async (fromCurrency: string, toCurrency: string) => {
    const amount = fromCurrency === 'coins' ? coinsToConvert : chipsToConvert;

    if (amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount greater than 0",
        variant: "destructive",
      });
      return;
    }

    const fromBalance = fromCurrency === 'coins' ? user.coins : user.chips;
    if (amount > fromBalance) {
      toast({
        title: "Insufficient Balance",
        description: `You don't have enough ${fromCurrency}`,
        variant: "destructive",
      });
      return;
    }

    try {
      const convertedAmount = Math.floor(amount * 10);
      const updates = {
        [fromCurrency]: fromBalance - amount,
        [toCurrency]: toCurrency === 'coins' 
          ? (user[toCurrency] || 0) + Math.floor(amount / 10)
          : (user[toCurrency] || 0) + convertedAmount
      };

      const updatedUser = await updateUserBalance(user.id, updates);

      await addTransaction({
        user_id: user.id,
        type: 'conversion',
        coins_amount: fromCurrency === 'coins' ? -amount : Math.floor(amount / 10),
        chips_amount: fromCurrency === 'chips' ? -amount : convertedAmount,
        description: `Converted ${amount} ${fromCurrency} to ${toCurrency === 'coins' ? Math.floor(amount / 10) : convertedAmount} ${toCurrency}`
      });

      localStorage.setItem('casinoUser', JSON.stringify(updatedUser));
      setUser(updatedUser);
      setCoinsToConvert(0);
      setChipsToConvert(0);

      toast({
        title: "Conversion Successful! ✨",
        description: `Converted ${amount} ${fromCurrency} to ${toCurrency === 'coins' ? Math.floor(amount / 10) : convertedAmount} ${toCurrency}`,
      });
    } catch (error) {
      console.error('Conversion error:', error);
      toast({
        title: "Conversion Failed",
        description: "Failed to process conversion. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="bg-black/20 border-white/10">
      <CardHeader>
        <CardTitle className="text-white flex items-center space-x-2">
          <ArrowLeftRight className="w-6 h-6 text-blue-400" />
          <span>Convert Currency</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Checkels to Chips */}
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-yellow-500/10 to-green-500/10 p-4 rounded-lg border border-yellow-400/20">
            <Label className="text-yellow-300 font-medium">Convert ₵ Checkels to Chips</Label>
            <p className="text-sm text-yellow-200 mb-3">Rate: 1 ₵ Checkel = 10 Chips</p>
            <div className="flex space-x-3">
              <Input
                type="number"
                placeholder="Enter checkels"
                value={coinsToConvert || ''}
                onChange={(e) => setCoinsToConvert(Number(e.target.value))}
                className="bg-black/40 border-yellow-400/30 text-white"
              />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-yellow-500 to-green-500 hover:from-yellow-600 hover:to-green-600 text-black font-bold min-w-[120px]">
                    Convert →
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Conversion</AlertDialogTitle>
                    <AlertDialogDescription>
                      Convert {coinsToConvert} ₵ Checkels to {(coinsToConvert * 10).toFixed(0)} Chips?
                      <br />This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleConversion('coins', 'chips')}>
                      Confirm Conversion
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
            {coinsToConvert > 0 && (
              <p className="text-sm text-green-300 mt-2">
                You will receive: {(coinsToConvert * 10).toFixed(0)} chips
              </p>
            )}
          </div>
        </div>

        {/* Chips to Checkels */}
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-green-500/10 to-yellow-500/10 p-4 rounded-lg border border-green-400/20">
            <Label className="text-green-300 font-medium">Convert Chips to ₵ Checkels</Label>
            <p className="text-sm text-green-200 mb-3">Rate: 10 Chips = 1 ₵ Checkel</p>
            <div className="flex space-x-3">
              <Input
                type="number"
                placeholder="Enter chips"
                value={chipsToConvert || ''}
                onChange={(e) => setChipsToConvert(Number(e.target.value))}
                className="bg-black/40 border-green-400/30 text-white"
              />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-green-500 to-yellow-500 hover:from-green-600 hover:to-yellow-600 text-black font-bold min-w-[120px]">
                    Convert →
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Conversion</AlertDialogTitle>
                    <AlertDialogDescription>
                      Convert {chipsToConvert} Chips to {(chipsToConvert / 10).toFixed(2)} ₵ Checkels?
                      <br />This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleConversion('chips', 'coins')}>
                      Confirm Conversion
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
            {chipsToConvert > 0 && (
              <p className="text-sm text-yellow-300 mt-2">
                You will receive: {(chipsToConvert / 10).toFixed(2)} ₵ checkels
              </p>
            )}
          </div>
        </div>

        <div className="bg-blue-500/10 p-4 rounded-lg border border-blue-400/20">
          <h4 className="text-blue-300 font-medium mb-2">💡 Conversion Tips</h4>
          <ul className="text-sm text-blue-200 space-y-1">
            <li>• Use checkels for casino games by converting to chips</li>
            <li>• Earn more checkels from your Money Tree</li>
            <li>• Conversion rates are fixed and instant</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

const TopUpSection = ({ user }: any) => {
  const [amount, setAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState('gcash');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [receipt, setReceipt] = useState<File | null>(null);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setReceipt(e.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!amount || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    if (!referenceNumber.trim()) {
      toast({
        title: "Reference Required",
        description: "Please enter the transaction reference number",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      let receiptData = null;

      if (receipt) {
        const reader = new FileReader();
        receiptData = await new Promise((resolve) => {
          reader.onload = () => resolve(reader.result);
          reader.readAsDataURL(receipt);
        });
      }

      await createTopupRequest({
        user_id: user.id,
        username: user.username,
        amount: amount,
        payment_method: paymentMethod,
        reference_number: referenceNumber,
        receipt_data: receiptData,
        notes: notes.trim() || null,
        status: 'pending'
      });

      // Add transaction record
      await addTransaction({
        user_id: user.id,
        type: 'topup',
        amount: amount,
        description: `Top-up request: ${amount} chips via ${paymentMethod}`,
        reference: referenceNumber
      });

      toast({
        title: "Top-up Request Submitted! 📝",
        description: "Your request is pending admin approval. You'll be notified once processed.",
      });

      setAmount(0);
      setReferenceNumber('');
      setReceipt(null);
      setNotes('');
    } catch (error) {
      console.error('Top-up submission error:', error);
      toast({
        title: "Submission Failed",
        description: "Failed to submit top-up request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="bg-black/20 border-white/10">
      <CardHeader>
        <CardTitle className="text-white flex items-center space-x-2">
          <CreditCard className="w-6 h-6 text-green-400" />
          <span>Top Up Chips</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-green-500/10 p-4 rounded-lg border border-green-400/20">
          <h4 className="text-green-300 font-medium mb-2">💰 Top-up Information</h4>
          <p className="text-sm text-green-200">Rate: ₱10 PHP = 1 Chip</p>
          <p className="text-sm text-green-200">Minimum: 10 chips (₱100)</p>
        </div>

        <div>
          <Label className="text-white">Amount (Chips)</Label>
          <Input
            type="number"
            placeholder="Enter chips amount"
            value={amount || ''}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="bg-black/40 border-white/20 text-white"
          />
          {amount > 0 && (
            <p className="text-sm text-green-300 mt-1">
              Total cost: ₱{(amount * 10).toFixed(2)} PHP
            </p>
          )}
        </div>

        <div>
          <Label className="text-white">Payment Method</Label>
          <select 
            value={paymentMethod} 
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="w-full p-2 bg-black/40 border border-white/20 rounded-md text-white"
          >
            <option value="gcash">GCash</option>
            <option value="paymaya">PayMaya</option>
            <option value="bank_transfer">Bank Transfer</option>
          </select>
        </div>

        <div>
          <Label className="text-white">Reference Number *</Label>
          <Input
            placeholder="Transaction reference number"
            value={referenceNumber}
            onChange={(e) => setReferenceNumber(e.target.value)}
            className="bg-black/40 border-white/20 text-white"
          />
        </div>

        <div>
          <Label className="text-white">Receipt/Screenshot</Label>
          <Input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="bg-black/40 border-white/20 text-white"
          />
        </div>

        <div>
          <Label className="text-white">Additional Notes</Label>
          <Textarea
            placeholder="Any additional information..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="bg-black/40 border-white/20 text-white"
          />
        </div>

        <Button 
          onClick={handleSubmit}
          disabled={isSubmitting || !amount || !referenceNumber}
          className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent animate-spin rounded-full mr-2"></div>
              Submitting...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Submit Top-up Request
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

const WithdrawSection = ({ user }: any) => {
  const [amount, setAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState('gcash');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const generateWithdrawalReceipt = (withdrawalData: any) => {
    // Create a receipt component in the current page first
    const receiptContainer = document.createElement('div');
    receiptContainer.id = 'receipt-container';
    receiptContainer.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      color: black;
      padding: 30px;
      border-radius: 10px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.3);
      z-index: 10000;
      max-width: 400px;
      width: 90%;
      font-family: Arial, sans-serif;
    `;

    receiptContainer.innerHTML = `
      <div style="text-align: center; border-bottom: 2px solid #333; margin-bottom: 20px; padding-bottom: 10px;">
        <h2 style="margin: 0; color: #333;">WITHDRAWAL RECEIPT</h2>
        <p style="margin: 5px 0; color: #666;">Casino Withdrawal Request</p>
      </div>
      
      <div style="margin: 15px 0; display: flex; justify-content: space-between; border-bottom: 1px dotted #ccc; padding-bottom: 5px;">
        <span><strong>Transaction ID:</strong></span>
        <span>WD-${Date.now()}</span>
      </div>
      
      <div style="margin: 15px 0; display: flex; justify-content: space-between; border-bottom: 1px dotted #ccc; padding-bottom: 5px;">
        <span><strong>Date:</strong></span>
        <span>${new Date().toLocaleString()}</span>
      </div>
      
      <div style="margin: 15px 0; display: flex; justify-content: space-between; border-bottom: 1px dotted #ccc; padding-bottom: 5px;">
        <span><strong>Username:</strong></span>
        <span>${withdrawalData.username}</span>
      </div>
      
      <div style="margin: 15px 0; display: flex; justify-content: space-between; border-bottom: 1px dotted #ccc; padding-bottom: 5px;">
        <span><strong>Amount:</strong></span>
        <span style="font-weight: bold; color: #e74c3c;">${withdrawalData.amount} chips</span>
      </div>
      
      <div style="margin: 15px 0; display: flex; justify-content: space-between; border-bottom: 1px dotted #ccc; padding-bottom: 5px;">
        <span><strong>PHP Amount:</strong></span>
        <span style="font-weight: bold; color: #e74c3c;">₱${(withdrawalData.amount * 10).toFixed(2)}</span>
      </div>
      
      <div style="margin: 15px 0; display: flex; justify-content: space-between; border-bottom: 1px dotted #ccc; padding-bottom: 5px;">
        <span><strong>Payment Method:</strong></span>
        <span>${withdrawalData.payment_method}</span>
      </div>
      
      <div style="margin: 15px 0; display: flex; justify-content: space-between; border-bottom: 1px dotted #ccc; padding-bottom: 5px;">
        <span><strong>Account Number:</strong></span>
        <span>${withdrawalData.account_number}</span>
      </div>
      
      <div style="margin: 15px 0; display: flex; justify-content: space-between; border-bottom: 1px dotted #ccc; padding-bottom: 5px;">
        <span><strong>Account Name:</strong></span>
        <span>${withdrawalData.account_name}</span>
      </div>
      
      <div style="margin: 15px 0; display: flex; justify-content: space-between; border-bottom: 1px dotted #ccc; padding-bottom: 5px;">
        <span><strong>Status:</strong></span>
        <span style="color: #f39c12; font-weight: bold;">Pending Admin Approval</span>
      </div>
      
      <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #ccc; font-size: 12px; color: #666;">
        <p style="margin: 5px 0;">This is a demo receipt for testing purposes only</p>
        <p style="margin: 5px 0;">Processing time: 1-3 business days</p>
      </div>
      
      <div style="text-align: center; margin-top: 20px; display: flex; gap: 10px; justify-content: center;">
        <button id="download-jpg" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">
          📄 Save as JPG
        </button>
        <button id="close-receipt" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 5px; cursor: pointer;">
          ✕ Close
        </button>
      </div>
    `;

    // Add backdrop
    const backdrop = document.createElement('div');
    backdrop.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
      z-index: 9999;
    `;

    document.body.appendChild(backdrop);
    document.body.appendChild(receiptContainer);

    // Handle close button
    const closeBtn = receiptContainer.querySelector('#close-receipt');
    closeBtn?.addEventListener('click', () => {
      document.body.removeChild(receiptContainer);
      document.body.removeChild(backdrop);
    });

    // Handle download button
    const downloadBtn = receiptContainer.querySelector('#download-jpg');
    downloadBtn?.addEventListener('click', async () => {
      try {
        // Create canvas for JPG conversion
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = 600;
        canvas.height = 800;
        
        // White background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Header
        ctx.fillStyle = 'black';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('WITHDRAWAL RECEIPT', canvas.width/2, 50);
        
        ctx.font = '16px Arial';
        ctx.fillText('Casino Withdrawal Request', canvas.width/2, 75);
        
        // Draw line
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(50, 90);
        ctx.lineTo(canvas.width - 50, 90);
        ctx.stroke();
        
        // Receipt details
        ctx.textAlign = 'left';
        ctx.font = '14px Arial';
        ctx.fillStyle = 'black';
        
        let y = 130;
        const lineHeight = 35;
        const details = [
          ['Transaction ID:', `WD-${Date.now()}`],
          ['Date:', new Date().toLocaleString()],
          ['Username:', withdrawalData.username],
          ['Amount:', `${withdrawalData.amount} chips`],
          ['PHP Amount:', `₱${(withdrawalData.amount * 10).toFixed(2)}`],
          ['Payment Method:', withdrawalData.payment_method],
          ['Account Number:', withdrawalData.account_number],
          ['Account Name:', withdrawalData.account_name],
          ['Status:', 'Pending Admin Approval']
        ];
        
        details.forEach(([label, value]) => {
          ctx.fillStyle = '#333';
          ctx.fillText(label, 60, y);
          ctx.fillStyle = 'black';
          ctx.fillText(value, 250, y);
          
          // Dotted line
          ctx.strokeStyle = '#ccc';
          ctx.setLineDash([2, 2]);
          ctx.beginPath();
          ctx.moveTo(60, y + 5);
          ctx.lineTo(540, y + 5);
          ctx.stroke();
          ctx.setLineDash([]);
          
          y += lineHeight;
        });
        
        // Footer
        ctx.fillStyle = '#666';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        y += 30;
        ctx.fillText('This is a demo receipt for testing purposes only', canvas.width/2, y);
        ctx.fillText('Processing time: 1-3 business days', canvas.width/2, y + 15);
        
        // Convert to JPG and download
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `withdrawal-receipt-${Date.now()}.jpg`;
            a.click();
            URL.revokeObjectURL(url);
            
            toast({
              title: "Receipt Downloaded! 📄",
              description: "Your withdrawal receipt has been saved as JPG",
            });
          }
        }, 'image/jpeg', 0.9);
      } catch (error) {
        console.error('Error generating JPG:', error);
        toast({
          title: "Download Failed",
          description: "Could not generate JPG. Please try again.",
          variant: "destructive",
        });
      }
    });

    // Close on backdrop click
    backdrop.addEventListener('click', () => {
      document.body.removeChild(receiptContainer);
      document.body.removeChild(backdrop);
    });
  };

  const handleSubmit = async () => {
    // Comprehensive validation with specific error messages
    const validationErrors = [];

    if (!amount || amount <= 0) {
      validationErrors.push("Please enter a valid amount greater than 0");
    }

    if (amount && amount > user.chips) {
      validationErrors.push("You don't have enough chips for this withdrawal");
    }

    if (amount && amount < 10) {
      validationErrors.push("Minimum withdrawal amount is 10 chips");
    }

    if (!paymentMethod || !paymentMethod.trim()) {
      validationErrors.push("Please select a payment method");
    }

    if (!accountNumber || !accountNumber.trim()) {
      validationErrors.push("Please enter your account number");
    }

    if (!accountName || !accountName.trim()) {
      validationErrors.push("Please enter the account holder name");
    }

    // Show validation errors
    if (validationErrors.length > 0) {
      toast({
        title: "Form Validation Failed",
        description: validationErrors[0], // Show first error
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const withdrawalData = {
        user_id: user.id || '',
        username: user.username || '',
        amount: Number(amount),
        payment_method: paymentMethod.trim(),
        account_number: accountNumber.trim(),
        account_name: accountName.trim(),
        status: 'pending'
      };

      console.log('Submitting withdrawal request:', withdrawalData);

      await createWithdrawalRequest(withdrawalData);

      // Add transaction record
      await addTransaction({
        user_id: user.id,
        type: 'withdrawal',
        amount: -Number(amount),
        description: `Withdrawal request: ${amount} chips to ${paymentMethod}`,
        reference: `WD-${Date.now()}`
      });

      // Generate receipt
      generateWithdrawalReceipt(withdrawalData);

      toast({
        title: "Withdrawal Request Submitted! 💸",
        description: "Your request is pending admin approval. Receipt generated successfully.",
      });

      // Reset form
      setAmount(0);
      setAccountNumber('');
      setAccountName('');
    } catch (error: any) {
      console.error('Withdrawal submission error:', error);
      
      let errorMessage = "Failed to submit withdrawal request. Please try again.";
      
      if (error.message) {
        if (error.message.includes('Account number')) {
          errorMessage = "Please check your account number and try again.";
        } else if (error.message.includes('Account name')) {
          errorMessage = "Please check your account name and try again.";
        } else if (error.message.includes('required')) {
          errorMessage = "Please fill in all required fields.";
        } else {
          errorMessage = error.message;
        }
      }

      toast({
        title: "Submission Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="bg-black/20 border-white/10">
      <CardHeader>
        <CardTitle className="text-white flex items-center space-x-2">
          <Banknote className="w-6 h-6 text-red-400" />
          <span>Withdraw Chips</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-red-500/10 p-4 rounded-lg border border-red-400/20">
          <h4 className="text-red-300 font-medium mb-2">💸 Withdrawal Information</h4>
          <p className="text-sm text-red-200">Rate: 1 Chip = ₱10 PHP</p>
          <p className="text-sm text-red-200">Minimum: 10 chips (₱100)</p>
          <p className="text-sm text-red-200">Processing: 1-3 business days</p>
        </div>

        <div>
          <Label className="text-white">Amount (Chips)</Label>
          <Input
            type="number"
            placeholder="Enter chips to withdraw"
            value={amount || ''}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="bg-black/40 border-white/20 text-white"
          />
          <p className="text-sm text-gray-400 mt-1">
            Available: {user.chips?.toFixed(2) || '0.00'} chips
          </p>
          {amount > 0 && (
            <p className="text-sm text-green-300 mt-1">
              You will receive: ₱{(amount * 10).toFixed(2)} PHP
            </p>
          )}
        </div>

        <div>
          <Label className="text-white">Payment Method</Label>
          <select 
            value={paymentMethod} 
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="w-full p-2 bg-black/40 border border-white/20 rounded-md text-white"
          >
            <option value="gcash">GCash</option>
            <option value="paymaya">PayMaya</option>
            <option value="bank_transfer">Bank Transfer</option>
          </select>
        </div>

        <div>
          <Label className="text-white">Account Number *</Label>
          <Input
            placeholder="Enter your account number"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            className={`bg-black/40 border-white/20 text-white ${
              accountNumber.trim() ? 'border-green-400/50' : ''
            }`}
            required
          />
          {accountNumber.trim() && (
            <p className="text-xs text-green-300 mt-1">✓ Account number entered</p>
          )}
        </div>

        <div>
          <Label className="text-white">Account Name *</Label>
          <Input
            placeholder="Enter the account holder name"
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            className={`bg-black/40 border-white/20 text-white ${
              accountName.trim() ? 'border-green-400/50' : ''
            }`}
            required
          />
          {accountName.trim() && (
            <p className="text-xs text-green-300 mt-1">✓ Account name entered</p>
          )}
        </div>

        <Button 
          onClick={handleSubmit}
          disabled={isSubmitting || !amount || !accountNumber || !accountName || amount > user.chips}
          className="w-full bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600"
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent animate-spin rounded-full mr-2"></div>
              Submitting...
            </>
          ) : (
            <>
              <Minus className="w-4 h-4 mr-2" />
              Submit Withdrawal Request
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

const WalletTransactionHistory = ({ transactions }: any) => {
  return (
    <Card className="bg-black/20 border-white/10">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-white">
          <History className="w-6 h-6 text-blue-400" />
          <span>Recent Transactions</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {transactions.slice(0, 20).map((transaction: any, index: number) => (
            <div
              key={index}
              className="p-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="font-medium text-white text-sm">
                    {(transaction.description || 'Transaction').replace(/\s*-\s*null\s*$/i, '')}
                  </p>
                  <p className="text-xs text-gray-400">
                    {transaction.created_at ? new Date(transaction.created_at).toLocaleString() : 'Unknown date'}
                  </p>
                  <Badge 
                    variant="outline" 
                    className={`mt-1 text-xs ${
                      transaction.type === 'conversion' ? 'border-blue-400 text-blue-300' :
                      transaction.type === 'topup' ? 'border-green-400 text-green-300' :
                      transaction.type === 'withdrawal' ? 'border-red-400 text-red-300' :
                      'border-gray-400 text-gray-300'
                    }`}
                  >
                    {transaction.type || 'unknown'}
                  </Badge>
                </div>
                <div className="text-right">
                  {transaction.type === 'conversion' ? (
                    <div className="text-xs">
                      {(transaction.coins_amount !== undefined && transaction.coins_amount !== 0) && (
                        <p className={transaction.coins_amount > 0 ? "text-green-300" : "text-red-300"}>
                          {transaction.coins_amount > 0 ? "+" : ""}{Number(transaction.coins_amount || 0).toFixed(2)} ₵
                        </p>
                      )}
                      {(transaction.chips_amount !== undefined && transaction.chips_amount !== 0) && (
                        <p className={transaction.chips_amount > 0 ? "text-green-300" : "text-red-300"}>
                          {transaction.chips_amount > 0 ? "+" : ""}{Number(transaction.chips_amount || 0).toFixed(2)} chips
                        </p>
                      )}
                    </div>
                  ) : transaction.type === 'topup' ? (
                    <div className="text-xs">
                      <p className="text-green-300">+{Math.abs(Number(transaction.coins_amount || 0)).toFixed(2)} ₵</p>
                      {transaction.php_amount && (
                        <p className="text-blue-300">₱{Number(transaction.php_amount || 0).toFixed(2)}</p>
                      )}
                    </div>
                  ) : transaction.type === 'withdrawal' ? (
                    <div className="text-xs">
                      <p className="text-red-300">-{Math.abs(Number(transaction.chips_amount || 0)).toFixed(2)} chips</p>
                      {transaction.php_amount && (
                        <p className="text-green-300">₱{Number(transaction.php_amount || 0).toFixed(2)}</p>
                      )}
                    </div>
                  ) : (
                    <div className={`font-bold text-xs ${
                      Number(transaction.amount || 0) >= 0 ? "text-green-300" : "text-red-300"
                    }`}>
                      {Number(transaction.amount || 0) >= 0 ? "+" : ""}
                      {Number(transaction.amount || 0).toFixed(2)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          {transactions.length === 0 && (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">💳</div>
              <p className="text-gray-400 text-sm">No transactions yet</p>
              <p className="text-gray-500 text-xs mt-1">
                Your wallet activity will appear here
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default WalletPage;