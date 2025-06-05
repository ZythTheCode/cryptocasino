
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  CreditCard, 
  Upload, 
  History, 
  Home, 
  Gamepad2, 
  Wallet,
  DollarSign,
  Download,
  CheckCircle,
  Clock,
  XCircle
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { 
  signIn, 
  createTopupRequest, 
  createWithdrawalRequest,
  getUserWithdrawals,
  updateUserBalance,
  addTransaction
} from '@/lib/database';
import { supabase } from '@/lib/supabase';
import { ChipsIcon } from "@/components/ui/icons";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TopUpWithdrawPage = () => {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [topupRequests, setTopupRequests] = useState<any[]>([]);
  const [withdrawalRequests, setWithdrawalRequests] = useState<any[]>([]);
  const { toast } = useToast();
  const navigate = useNavigate();

  // TopUp form state
  const [topupAmount, setTopupAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('gcash');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Withdraw form state
  const [withdrawAmount, setWithdrawAmount] = useState<number>(0);
  const [accountName, setAccountName] = useState<string>('');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [bankName, setBankName] = useState<string>('gcash');

  useEffect(() => {
    const loadUserAndData = async () => {
      setIsLoading(true);
      const savedUser = localStorage.getItem("casinoUser");
      if (savedUser) {
        const parsedUser = JSON.parse(savedUser);

        try {
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

          // Load user's withdrawal history
          const withdrawals = await getUserWithdrawals(freshUser.id);
          setWithdrawalRequests(withdrawals);

          toast({
            title: "Welcome!",
            description: `TopUp & Withdraw page loaded for ${freshUser.username}`,
          });

        } catch (error) {
          console.log('Failed to load user from Supabase:', error);
          toast({
            title: "Connection Error",
            description: "Failed to sync with database. Redirecting to login.",
            variant: "destructive",
          });
          localStorage.removeItem('casinoUser');
          setTimeout(() => navigate('/'), 2000);
        }
      } else {
        navigate('/');
      }
      setIsLoading(false);
    };

    loadUserAndData();
  }, [toast, navigate]);

  const uploadReceipt = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('receipts')
      .upload(fileName, file);

    if (error) throw error;

    const { data: publicUrlData } = supabase.storage
      .from('receipts')
      .getPublicUrl(fileName);

    return publicUrlData.publicUrl;
  };

  const handleTopUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (topupAmount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    if (!referenceNumber.trim()) {
      toast({
        title: "Missing Reference",
        description: "Please enter a reference number",
        variant: "destructive",
      });
      return;
    }

    if (!receiptFile) {
      toast({
        title: "Missing Receipt",
        description: "Please upload a receipt",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload receipt to storage
      const receiptUrl = await uploadReceipt(receiptFile);

      // Create topup request
      await createTopupRequest({
        user_id: user.id,
        username: user.username,
        amount: topupAmount,
        payment_method: paymentMethod,
        reference_number: referenceNumber,
        notes: notes,
        receipt_data: receiptUrl,
        status: 'pending'
      });

      toast({
        title: "TopUp Request Submitted",
        description: "Your request has been submitted for admin approval",
      });

      // Reset form
      setTopupAmount(0);
      setReferenceNumber('');
      setNotes('');
      setReceiptFile(null);

    } catch (error) {
      console.error('Error submitting topup request:', error);
      toast({
        title: "Submission Failed",
        description: "Failed to submit topup request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWithdrawalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (withdrawAmount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    if (withdrawAmount > user.chips) {
      toast({
        title: "Insufficient Balance",
        description: "You don't have enough chips",
        variant: "destructive",
      });
      return;
    }

    if (!accountName.trim() || !accountNumber.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in all account details",
        variant: "destructive",
      });
      return;
    }

    try {
      const phpAmount = withdrawAmount * 10; // 1 chip = 10 PHP

      // Deduct chips from user balance
      const updatedUser = await updateUserBalance(user.id, {
        chips: user.chips - withdrawAmount
      });

      // Create withdrawal request
      await createWithdrawalRequest({
        user_id: user.id,
        username: user.username,
        amount: withdrawAmount,
        php_amount: phpAmount,
        account_name: accountName,
        account_number: accountNumber,
        bank_name: bankName,
        account_details: `${bankName}: ${accountNumber}`
      });

      // Add transaction record
      await addTransaction({
        user_id: user.id,
        type: 'withdrawal',
        amount: -withdrawAmount,
        description: `Withdrawal: ${withdrawAmount} chips to ${bankName}`,
        php_amount: phpAmount
      });

      setUser(updatedUser);
      localStorage.setItem('casinoUser', JSON.stringify(updatedUser));

      // Reload withdrawal history
      const withdrawals = await getUserWithdrawals(user.id);
      setWithdrawalRequests(withdrawals);

      toast({
        title: "Withdrawal Processed",
        description: `₱${phpAmount.toFixed(2)} has been processed for withdrawal`,
      });

      // Reset form
      setWithdrawAmount(0);
      setAccountName('');
      setAccountNumber('');

    } catch (error) {
      console.error('Error processing withdrawal:', error);
      toast({
        title: "Withdrawal Failed",
        description: "Failed to process withdrawal. Please try again.",
        variant: "destructive",
      });
    }
  };

  const generateMockReceipt = (withdrawal: any) => {
    const receiptHTML = `
      <div style="font-family: Arial, sans-serif; max-width: 400px; margin: 0 auto; padding: 20px; border: 1px solid #ccc;">
        <h2 style="text-align: center; color: #333;">WITHDRAWAL RECEIPT</h2>
        <hr>
        <p><strong>Transaction ID:</strong> ${withdrawal.id}</p>
        <p><strong>Date:</strong> ${new Date(withdrawal.created_at).toLocaleString()}</p>
        <p><strong>Amount:</strong> ${withdrawal.amount} chips</p>
        <p><strong>PHP Amount:</strong> ₱${withdrawal.php_amount.toFixed(2)}</p>
        <p><strong>Account Name:</strong> ${withdrawal.account_name}</p>
        <p><strong>Account Number:</strong> ${withdrawal.account_number}</p>
        <p><strong>Bank/Method:</strong> ${withdrawal.bank_name}</p>
        <hr>
        <p style="text-align: center; font-size: 12px; color: #666;">
          This is a demo receipt for testing purposes only
        </p>
      </div>
    `;

    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(receiptHTML);
      newWindow.document.close();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 flex items-center justify-center">
        <div className="flex items-center space-x-2 text-white">
          <div className="w-6 h-6 border-2 border-white border-t-transparent animate-spin rounded-full"></div>
          <span>Loading...</span>
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
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              TopUp & Withdraw
            </span>
          </h1>
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-4 bg-black/20 rounded-full px-4 py-2 border border-white/10">
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
        <Tabs defaultValue="topup" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="topup">TopUp Chips</TabsTrigger>
            <TabsTrigger value="withdraw">Withdraw Chips</TabsTrigger>
            <TabsTrigger value="history">Transaction History</TabsTrigger>
          </TabsList>

          <TabsContent value="topup" className="space-y-4">
            <Card className="bg-black/20 border border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CreditCard className="w-6 h-6 text-green-400" />
                  <span>TopUp Chips</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleTopUpSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Amount (Chips)</label>
                    <Input
                      type="number"
                      value={topupAmount}
                      onChange={(e) => setTopupAmount(Number(e.target.value))}
                      placeholder="Enter amount of chips"
                      className="bg-black/40 border-white/20 text-white"
                      min="1"
                      required
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      PHP Amount: ₱{(topupAmount * 10).toFixed(2)} (1 chip = ₱10)
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Payment Method</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full p-2 bg-black/40 border border-white/20 rounded text-white"
                    >
                      <option value="gcash">GCash</option>
                      <option value="paymaya">PayMaya</option>
                      <option value="credit_card">Credit Card</option>
                      <option value="debit_card">Debit Card</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Reference Number</label>
                    <Input
                      type="text"
                      value={referenceNumber}
                      onChange={(e) => setReferenceNumber(e.target.value)}
                      placeholder="Enter transaction reference number"
                      className="bg-black/40 border-white/20 text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Upload Receipt</label>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                      className="bg-black/40 border-white/20 text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Notes (Optional)</label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Additional notes"
                      className="bg-black/40 border-white/20 text-white"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent animate-spin rounded-full mr-2"></div>
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Submit TopUp Request
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="withdraw" className="space-y-4">
            <Card className="bg-black/20 border border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Download className="w-6 h-6 text-blue-400" />
                  <span>Withdraw Chips</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleWithdrawalSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Amount (Chips)</label>
                    <Input
                      type="number"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(Number(e.target.value))}
                      placeholder="Enter amount of chips"
                      className="bg-black/40 border-white/20 text-white"
                      min="1"
                      max={user.chips}
                      required
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      PHP Amount: ₱{(withdrawAmount * 10).toFixed(2)} | Available: {user.chips} chips
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Bank/Method</label>
                    <select
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="w-full p-2 bg-black/40 border border-white/20 rounded text-white"
                    >
                      <option value="gcash">GCash</option>
                      <option value="paymaya">PayMaya</option>
                      <option value="bpi">BPI</option>
                      <option value="bdo">BDO</option>
                      <option value="metrobank">Metrobank</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Account Name</label>
                    <Input
                      type="text"
                      value={accountName}
                      onChange={(e) => setAccountName(e.target.value)}
                      placeholder="Enter account holder name"
                      className="bg-black/40 border-white/20 text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Account Number</label>
                    <Input
                      type="text"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      placeholder="Enter account number"
                      className="bg-black/40 border-white/20 text-white"
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Process Withdrawal
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card className="bg-black/20 border border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <History className="w-6 h-6 text-purple-400" />
                  <span>Withdrawal History</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {withdrawalRequests.length === 0 ? (
                  <div className="text-center py-8">
                    <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-400">No withdrawal history yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {withdrawalRequests.map((withdrawal) => (
                      <div key={withdrawal.id} className="border rounded-lg p-4 bg-white/5">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-semibold">
                              {withdrawal.amount} chips → ₱{withdrawal.php_amount.toFixed(2)}
                            </p>
                            <p className="text-sm text-gray-400">
                              {withdrawal.bank_name} - {withdrawal.account_number}
                            </p>
                          </div>
                          <Badge className="bg-green-100 text-green-800">
                            {withdrawal.status}
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <p className="text-xs text-gray-500">
                            {new Date(withdrawal.created_at).toLocaleString()}
                          </p>
                          <Button
                            onClick={() => generateMockReceipt(withdrawal)}
                            size="sm"
                            variant="outline"
                            className="border-blue-400 text-blue-400 hover:bg-blue-50"
                          >
                            View Receipt
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default TopUpWithdrawPage;
