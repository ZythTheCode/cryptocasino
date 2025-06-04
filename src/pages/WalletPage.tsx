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
  TrendingDown,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import {
  signIn,
  updateUserBalance,
  addTransaction,
  getUserTransactions,
  createTopupRequest,
  createWithdrawalRequest,
} from "@/lib/database";
import { CheckelsIcon, ChipsIcon } from "@/components/ui/icons";
import { supabase } from "@/lib/supabase";
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
  const [transactions, setTransactions] = useState<any[]>([]);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const loadUserData = async () => {
      setIsLoading(true);
      const savedUser = localStorage.getItem("casinoUser");
      if (savedUser) {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);

        try {
          const freshUser = await signIn(
            parsedUser.username,
            parsedUser.password_hash || "migrated_user"
          );
          localStorage.setItem("casinoUser", JSON.stringify(freshUser));
          setUser(freshUser);

          // Load transactions
          const userTransactions = await getUserTransactions(freshUser.id);
          setTransactions(userTransactions || []);
        } catch (error) {
          console.log("Using localStorage data, Supabase sync failed");
        }
      } else {
        navigate("/");
      }
      setIsLoading(false);
    };

    loadUserData();
  }, [navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="flex items-center space-x-2 text-white">
          <div className="w-6 h-6 border-2 border-white border-t-transparent animate-spin rounded-full"></div>
          <span>Loading wallet...</span>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <header className="bg-gradient-to-r from-indigo-800/90 to-purple-800/90 backdrop-blur-lg border-b border-white/10 p-4 shadow-xl">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-3xl font-bold text-white flex items-center space-x-3">
            <Wallet className="w-8 h-8 text-purple-400" />
            <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Digital Wallet
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
              <span className="text-white/90 font-medium">
                Welcome, {user?.username}
              </span>
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
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Balance Overview */}
          <div className="lg:col-span-3">
            <Card className="bg-gradient-to-r from-blue-950/80 to-purple-950/80 border-white/20 backdrop-blur-sm">
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
                        <p className="text-yellow-100 text-sm font-medium">
                          ₵ Checkels
                        </p>
                        <div className="text-3xl font-bold text-yellow-300">{(user?.coins || 0).toFixed(2)}</div>
                        <p className="text-yellow-200 text-sm">
                          Earned from Money Tree
                        </p>
                      </div>
                      <CheckelsIcon className="w-16 h-16 text-yellow-400" />
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-green-500/20 to-blue-500/20 p-6 rounded-xl border border-green-400/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-green-100 text-sm font-medium">
                          Casino Chips
                        </p>
                        <div className="text-3xl font-bold text-green-300">{(user?.chips || 0).toFixed(2)}</div>
                        <p className="text-green-200 text-sm">
                          For casino games
                        </p>
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
                <TabsTrigger
                  value="convert"
                  className="data-[state=active]:bg-blue-600"
                >
                  <ArrowLeftRight className="w-4 h-4 mr-2" />
                  Convert
                </TabsTrigger>
                <TabsTrigger
                  value="topup"
                  className="data-[state=active]:bg-green-600"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Top Up
                </TabsTrigger>
                <TabsTrigger
                  value="withdraw"
                  className="data-[state=active]:bg-red-600"
                >
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
            <TransactionHistorySection transactions={transactions} />
          </div>
        </div>
      </div>

      <MobileNavigation />
    </div>
  );
};

const ConvertSection = ({ user, setUser }: any) => {
  const [coinsToConvert, setCoinsToConvert] = useState<number>(0);
  const [chipsToConvert, setChipsToConvert] = useState<number>(0);
  const [isConverting, setIsConverting] = useState(false);
  const { toast } = useToast();

  const handleConvertToChips = async () => {
    if (!coinsToConvert || coinsToConvert <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    if (coinsToConvert > (user.coins || 0)) {
      toast({
        title: "Insufficient Checkels",
        description: "You don't have enough checkels",
        variant: "destructive",
      });
      return;
    }

    setIsConverting(true);

    try {
      const chipsToAdd = coinsToConvert * 10;
      const updatedUser = await updateUserBalance(user.id, {
        coins: Math.round((user.coins - coinsToConvert) * 100) / 100,
        chips: Math.round((user.chips + chipsToAdd) * 100) / 100,
      });

      await addTransaction({
        user_id: user.id,
        type: "conversion",
        amount: chipsToAdd,
        description: `Converted ${coinsToConvert} checkels to ${chipsToAdd} chips`,
      });

      setUser(updatedUser);
      localStorage.setItem("casinoUser", JSON.stringify(updatedUser));

      toast({
        title: "Conversion Successful! 🎉",
        description: `Converted ${coinsToConvert} checkels to ${chipsToAdd} chips`,
      });

      setCoinsToConvert(0);
    } catch (error) {
      console.error("Conversion error:", error);
      toast({
        title: "Conversion Failed",
        description: "Failed to convert currency. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsConverting(false);
    }
  };

  const handleConvertToCoins = async () => {
    if (!chipsToConvert || chipsToConvert <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    if (chipsToConvert > user.chips) {
      toast({
        title: "Insufficient Chips",
        description: "You don't have enough chips",
        variant: "destructive",
      });
      return;
    }

    setIsConverting(true);

    try {
      const coinsToAdd = chipsToConvert / 10;
      const updatedUser = await updateUserBalance(user.id, {
        coins: Math.round((user.coins + coinsToAdd) * 100) / 100,
        chips: Math.round((user.chips - chipsToConvert) * 100) / 100,
      });

      await addTransaction({
        user_id: user.id,
        type: "conversion",
        amount: -chipsToConvert,
        description: `Converted ${chipsToConvert} chips to ${coinsToAdd} checkels`,
      });

      setUser(updatedUser);
      localStorage.setItem("casinoUser", JSON.stringify(updatedUser));

      toast({
        title: "Conversion Successful! 🎉",
        description: `Converted ${chipsToConvert} chips to ${coinsToAdd} checkels`,
      });

      setChipsToConvert(0);
    } catch (error) {
      console.error("Conversion error:", error);
      toast({
        title: "Conversion Failed",
        description: "Failed to convert currency. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsConverting(false);
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
            <Label className="text-yellow-300 font-medium">
              Convert ₵ Checkels to Chips
            </Label>
            <p className="text-sm text-yellow-200 mb-3">
              Rate: 1 ₵ Checkel = 10 Chips
            </p>
            <div className="flex space-x-3">
              <Input
                type="number"
                placeholder="Enter checkels"
                value={coinsToConvert || ""}
                onChange={(e) => setCoinsToConvert(Number(e.target.value))}
                className="bg-black/40 border-yellow-400/30 text-white"
              />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    className="bg-gradient-to-r from-yellow-500 to-green-500 hover:from-yellow-600 hover:to-green-600 text-black font-bold min-w-[120px]"
                    disabled={!coinsToConvert || coinsToConvert > (user.coins || 0)}
                  >
                    Convert →
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Conversion</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to convert {coinsToConvert} checkels
                      to {(coinsToConvert * 10).toFixed(2)} chips?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleConvertToChips}
                      disabled={isConverting}
                    >
                      {isConverting ? "Converting..." : "Convert"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
            {coinsToConvert > 0 && (
              <p className="text-sm text-green-300 mt-2">
                You will get: {(coinsToConvert * 10).toFixed(2)} chips
              </p>
            )}
          </div>
        </div>

        {/* Chips to Checkels */}
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-green-500/10 to-yellow-500/10 p-4 rounded-lg border border-green-400/20">
            <Label className="text-green-300 font-medium">
              Convert Chips to ₵ Checkels
            </Label>
            <p className="text-sm text-green-200 mb-3">
              Rate: 10 Chips = 1 ₵ Checkel
            </p>
            <div className="flex space-x-3">
              <Input
                type="number"
                placeholder="Enter chips"
                value={chipsToConvert || ""}
                onChange={(e) => setChipsToConvert(Number(e.target.value))}
                className="bg-black/40 border-green-400/30 text-white"
              />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    className="bg-gradient-to-r from-green-500 to-yellow-500 hover:from-green-600 hover:to-yellow-600 text-black font-bold min-w-[120px]"
                    disabled={!chipsToConvert || chipsToConvert > user.chips}
                  >
                    Convert →
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Conversion</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to convert {chipsToConvert} chips to{" "}
                      {(chipsToConvert / 10).toFixed(2)} checkels?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleConvertToCoins}
                      disabled={isConverting}
                    >
                      {isConverting ? "Converting..." : "Convert"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
            {chipsToConvert > 0 && (
              <p className="text-sm text-yellow-300 mt-2">
                You will get: {(chipsToConvert / 10).toFixed(2)} checkels
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
  const [paymentMethod, setPaymentMethod] = useState("gcash");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [receipt, setReceipt] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
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

      // Create a simplified topup request without problematic fields
      const topupData = {
        user_id: user.id,
        amount: amount,
        payment_method: paymentMethod,
        reference_number: referenceNumber,
        receipt_data: receiptData,
        notes: notes.trim() || null,
        status: "pending",
      };

      const success = await createTopupRequest(topupData);

      if (success) {
        toast({
          title: "Top-up Request Submitted! 📝",
          description:
            "Your request is pending admin approval. You'll be notified once processed.",
        });

        setAmount(0);
        setReferenceNumber("");
        setReceipt(null);
        setNotes("");
      } else {
        throw new Error("Failed to create topup request");
      }
    } catch (error) {
      console.error("Top-up submission error:", error);
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
          <h4 className="text-green-300 font-medium mb-2">
            💰 Top-up Information
          </h4>
          <p className="text-sm text-green-200">Rate: ₱10 PHP = 1 Chip</p>
          <p className="text-sm text-green-200">Minimum: 10 chips (₱100)</p>
        </div>

        <div>
          <Label className="text-white">Amount (Chips)</Label>
          <Input
            type="number"
            placeholder="Enter chips amount"
            value={amount || ""}
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
            <option value="credit_card">Credit Card</option>
            <option value="bank_transfer">Bank Transfer</option>
          </select>
        </div>

        <div>
          <Label className="text-white">Reference Number *</Label>
          <Input
            placeholder="Enter transaction reference"
            value={referenceNumber}
            onChange={(e) => setReferenceNumber(e.target.value)}
            className="bg-black/40 border-white/20 text-white"
          />
        </div>

        <div>
          <Label className="text-white">Upload Receipt</Label>
          <Input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="bg-black/40 border-white/20 text-white"
          />
        </div>

        <div>
          <Label className="text-white">Notes (Optional)</Label>
          <Textarea
            placeholder="Additional notes"
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
  const [paymentMethod, setPaymentMethod] = useState("gcash");
  const [accountDetails, setAccountDetails] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!amount || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    if (amount > user.chips) {
      toast({
        title: "Insufficient Chips",
        description: "You don't have enough chips for this withdrawal",
        variant: "destructive",
      });
      return;
    }

    if (!accountDetails.trim()) {
      toast({
        title: "Account Details Required",
        description: "Please enter your account details",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Create a simplified withdrawal request
      const withdrawalData = {
        user_id: user.id,
        amount: amount,
        withdrawal_method: paymentMethod,
        account_details: accountDetails,
        php_amount: amount * 10, // Add php_amount field
        status: "pending",
      };

      const success = await createWithdrawalRequest(withdrawalData);

      if (success) {
        toast({
          title: "Withdrawal Request Submitted! 💸",
          description:
            "Your request is pending admin approval. Processing may take 1-3 business days.",
        });

        setAmount(0);
        setAccountDetails("");
      } else {
        throw new Error("Failed to create withdrawal request");
      }
    } catch (error) {
      console.error("Withdrawal submission error:", error);
      toast({
        title: "Submission Failed",
        description: "Failed to submit withdrawal request. Please try again.",
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
          <h4 className="text-red-300 font-medium mb-2">
            💸 Withdrawal Information
          </h4>
          <p className="text-sm text-red-200">Rate: 1 Chip = ₱10 PHP</p>
          <p className="text-sm text-red-200">Minimum: 10 chips (₱100)</p>
          <p className="text-sm text-red-200">
            Processing: 1-3 business days
          </p>
        </div>

        <div>
          <Label className="text-white">Amount (Chips)</Label>
          <Input
            type="number"
            placeholder="Enter chips to withdraw"
            value={amount || ""}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="bg-black/40 border-white/20 text-white"
          />
          <p className="text-sm text-gray-400 mt-1">
            Available: {user.chips?.toFixed(2) || "0.00"} chips
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
          <Label className="text-white">Account Details *</Label>
          <Textarea
            placeholder="Enter your account number/details for the selected payment method"
            value={accountDetails}
            onChange={(e) => setAccountDetails(e.target.value)}
            className="bg-black/40 border-white/20 text-white"
          />
        </div>

        <Button
          onClick={handleSubmit}
          disabled={
            isSubmitting || !amount || !accountDetails || amount > user.chips
          }
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

const TransactionHistorySection = ({ transactions }: any) => {
  const validTransactions = transactions.filter(
    (transaction: any) =>
      transaction.id &&
      transaction.created_at &&
      transaction.description &&
      transaction.type
  );

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
          {validTransactions.length === 0 ? (
            <div className="text-center py-8">
              <History className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-400">No transactions yet</p>
            </div>
          ) : (
            validTransactions
              .slice(0, 20)
              .map((transaction: any, index: number) => (
                <div
                  key={transaction.id || index}
                  className="p-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-medium text-white text-sm">
                        {transaction.description || "Transaction"}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(transaction.created_at).toLocaleString()}
                      </p>
                      <Badge
                        variant="outline"
                        className={`mt-1 text-xs ${
                          transaction.type === "conversion"
                            ? "border-blue-400 text-blue-300"
                            : transaction.type === "topup"
                            ? "border-green-400 text-green-300"
                            : transaction.type === "withdrawal"
                            ? "border-red-400 text-red-300"
                            : "border-gray-400 text-gray-300"
                        }`}
                      >
                        {transaction.type}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <p
                        className={`font-bold text-sm ${
                          transaction.amount > 0
                            ? "text-green-400"
                            : "text-red-400"
                        }`}
                      >
                        {transaction.amount > 0 ? "+" : ""}
                        {transaction.amount.toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-400">chips</p>
                    </div>
                  </div>
                </div>
              ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default WalletPage;