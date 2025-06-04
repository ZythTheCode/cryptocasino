import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, CreditCard, Home, TreePine, Gamepad2, Wallet, Banknote, Download, Receipt } from "lucide-react";
import { Link } from "react-router-dom";
import { CheckelsIcon, ChipsIcon } from "@/components/ui/icons";
import { updateUserBalance, createWithdrawalRequest, addTransaction, signIn } from "@/lib/database";

const WithdrawPage = () => {
  const [user, setUser] = useState<any>(null);
  const [amount, setAmount] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const { toast } = useToast();

  // Generate random reference number
  const generateReferenceNumber = () => {
    const prefix = 'WD';
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}${timestamp}${random}`;
  };

  // Generate and download receipt as JPEG
  const generateMockReceipt = ({ amount, withdrawMethod, accountNumber, accountName }: any) => {
    const receiptData = {
      transactionId: `WD${Date.now()}${Math.floor(Math.random() * 1000)}`,
      amount: amount,
      phpAmount: amount * 10,
      method: withdrawMethod,
      accountNumber,
      accountName,
      timestamp: new Date().toLocaleString(),
      status: 'Processing'
    };

    setReceiptData(receiptData);
    setShowReceipt(true);
  };

  // Save receipt as JPEG
  const saveReceiptAsJPEG = () => {
    if (!receiptData) return;

    // Create a canvas element
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // Set canvas size
    canvas.width = 400;
    canvas.height = 600;

    // Set white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Set text properties
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';

    // Header
    ctx.fillText('WITHDRAWAL RECEIPT', canvas.width / 2, 40);

    // Draw line
    ctx.beginPath();
    ctx.moveTo(20, 60);
    ctx.lineTo(380, 60);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Receipt details
    ctx.font = '14px Arial';
    ctx.textAlign = 'left';

    const details = [
      `Reference Number: ${receiptData.referenceNumber}`,
      `Transaction ID: ${receiptData.transactionId}`,
      `Date: ${receiptData.date}`,
      `Time: ${receiptData.time}`,
      '',
      `Username: ${receiptData.username}`,
      `Amount: ${receiptData.amount} chips`,
      `PHP Amount: ₱${receiptData.phpAmount.toFixed(2)}`,
      `Method: ${receiptData.withdrawMethod}`,
      `Account Number: ${receiptData.accountNumber}`,
      `Account Name: ${receiptData.accountName}`,
      '',
      `Status: ${receiptData.status}`,
    ];

    let yPosition = 90;
    details.forEach(detail => {
      if (detail === '') {
        yPosition += 10;
      } else {
        ctx.fillText(detail, 30, yPosition);
        yPosition += 25;
      }
    });

    // Footer
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#666666';
    ctx.fillText('This is a demo receipt for testing purposes only', canvas.width / 2, canvas.height - 60);
    ctx.fillText('Thank you for using our service!', canvas.width / 2, canvas.height - 40);

    // Convert to JPEG and download
    canvas.toBlob((blob) => {
      if (!blob) return;

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `withdrawal_receipt_${receiptData.referenceNumber}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Receipt Saved",
        description: "Receipt has been saved as JPEG file",
      });
    }, 'image/jpeg', 0.9);
  };

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
        bank_name: withdrawMethod
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

      // Generate mock receipt BEFORE showing success toast
      generateMockReceipt({
        amount: chipsAmount,
        withdrawMethod,
        accountNumber,
        accountName
      });

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
                  disabled={!amount || !withdrawMethod || !accountNumber || !accountName || parseFloat(amount) > (user?.chips || 0) || parseFloat(amount) < 50}
                >
                  Withdraw {amount ? `${amount} chips (₱${(parseFloat(amount) * 10).toFixed(2)})` : 'Chips'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Receipt Modal */}
      {showReceipt && receiptData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <div id="receipt-content" className="text-black space-y-4">
              <div className="text-center border-b pb-4">
                <h2 className="text-xl font-bold">Withdrawal Receipt</h2>
                <p className="text-sm text-gray-600">Transaction ID: {receiptData.transactionId}</p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Amount (Chips):</span>
                  <span className="font-semibold">{receiptData.amount}</span>
                </div>
                <div className="flex justify-between">
                  <span>PHP Amount:</span>
                  <span className="font-semibold">₱{receiptData.phpAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Method:</span>
                  <span className="font-semibold">{receiptData.method}</span>
                </div>
                <div className="flex justify-between">
                  <span>Account Name:</span>
                  <span className="font-semibold">{receiptData.accountName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Account Number:</span>
                  <span className="font-semibold">{receiptData.accountNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span>Status:</span>
                  <span className="font-semibold text-orange-600">{receiptData.status}</span>
                </div>
                <div className="flex justify-between">
                  <span>Date:</span>
                  <span className="font-semibold">{receiptData.timestamp}</span>
                </div>
              </div>

              <div className="text-center text-xs text-gray-500 border-t pt-4">
                <p>This is a computer-generated receipt.</p>
                <p>Please keep this for your records.</p>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <Button 
                onClick={() => {
                  const element = document.getElementById('receipt-content');
                  if (element) {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');

                    // Simple text-based receipt generation
                    canvas.width = 400;
                    canvas.height = 500;

                    if (ctx) {
                      ctx.fillStyle = 'white';
                      ctx.fillRect(0, 0, canvas.width, canvas.height);

                      ctx.fillStyle = 'black';
                      ctx.font = 'bold 16px Arial';
                      ctx.textAlign = 'center';
                      ctx.fillText('Withdrawal Receipt', 200, 30);

                      ctx.font = '12px Arial';
                      ctx.textAlign = 'left';
                      let y = 70;

                      ctx.fillText(`Transaction ID: ${receiptData.transactionId}`, 20, y); y += 30;
                      ctx.fillText(`Amount (Chips): ${receiptData.amount}`, 20, y); y += 25;
                      ctx.fillText(`PHP Amount: ₱${receiptData.phpAmount.toFixed(2)}`, 20, y); y += 25;
                      ctx.fillText(`Method: ${receiptData.method}`, 20, y); y += 25;
                      ctx.fillText(`Account Name: ${receiptData.accountName}`, 20, y); y += 25;
                      ctx.fillText(`Account Number: ${receiptData.accountNumber}`, 20, y); y += 25;
                      ctx.fillText(`Status: ${receiptData.status}`, 20, y); y += 25;
                      ctx.fillText(`Date: ${receiptData.timestamp}`, 20, y); y += 50;

                      ctx.font = '10px Arial';
                      ctx.textAlign = 'center';
                      ctx.fillText('This is a computer-generated receipt.', 200, y);
                      ctx.fillText('Please keep this for your records.', 200, y + 15);

                      // Download as image
                      canvas.toBlob((blob) => {
                        if (blob) {
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `withdrawal-receipt-${receiptData.transactionId}.png`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }
                      });
                    }
                  }
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                Save as Image
              </Button>
              <Button 
                onClick={() => setShowReceipt(false)}
                variant="outline" 
                className="flex-1"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WithdrawPage;