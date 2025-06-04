import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Upload, CreditCard, Smartphone, Home, TreePine, Gamepad2, Wallet } from "lucide-react";
import { Link } from "react-router-dom";
import { signIn, createTopupRequest } from '@/lib/database'
import { supabase } from '@/lib/supabase'
import { CheckelsIcon, ChipsIcon } from "@/components/ui/icons";

const TopUpPage = () => {
  const [user, setUser] = useState<any>(null);
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [receipt, setReceipt] = useState<File | null>(null);
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
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
          console.log('Using localStorage data, Supabase sync failed');
        }
      } else {
        setTimeout(() => {
          window.location.href = '/';
        }, 100);
      }
    };

    loadUserData();
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReceipt(file);
    }
  };

  const handleSubmitTopUp = async () => {
    if (!amount || !paymentMethod || !receipt || !reference) {
      toast({
        title: "Missing Information",
        description: "Please fill all required fields and upload receipt",
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

    if (chipsAmount < 10) {
      toast({
        title: "Minimum Top-up Required",
        description: "Minimum top-up amount is 10 chips (₱100)",
        variant: "destructive",
      });
      return;
    }

    try {
      toast({
        title: "Uploading Receipt",
        description: "Please wait while we process your request...",
      });

      // Upload receipt to Supabase storage
      const fileExt = receipt.name.split('.').pop();
      const fileName = `${user.id}_${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(fileName, receipt);

      if (uploadError) {
        throw new Error(`Failed to upload receipt: ${uploadError.message}`);
      }

      // Get public URL for the uploaded receipt
      const { data: publicUrlData } = supabase.storage
        .from('receipts')
        .getPublicUrl(fileName);

      const topUpRequestData = {
        user_id: user.id,
        username: user.username,
        amount: chipsAmount,
        payment_method: paymentMethod,
        reference_number: reference,
        notes,
        receipt_name: receipt.name,
        receipt_url: publicUrlData.publicUrl,
        status: 'pending'
      };

      // Save to database
      const success = await createTopupRequest(topUpRequestData);

      if (success) {
        toast({
          title: "Top-up Request Submitted",
          description: `₱${(chipsAmount * 10).toFixed(2)} top-up request sent for admin approval`,
        });

        // Reset form
        setAmount('');
        setPaymentMethod('');
        setReceipt(null);
        setReference('');
        setNotes('');
      } else {
        throw new Error('Failed to save top-up request');
      }
    } catch (error) {
      console.error('Error submitting top-up request:', error);
      toast({
        title: "Error",
        description: `Failed to submit top-up request: ${error.message}`,
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
            <CreditCard className="w-8 h-8 text-purple-400" />
            <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Top Up Chips
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
        <Card className="bg-gradient-to-br from-green-50 to-blue-50 border-green-200 shadow-lg">
          <CardHeader>
            <CardTitle className="text-green-700 flex items-center space-x-2">
              <CreditCard className="w-6 h-6" />
              <span>Buy Casino Chips</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-gradient-to-r from-white to-gray-50 rounded-lg border shadow-sm">
              <div className="text-center mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="font-bold text-xl text-blue-700">1 Chip = ₱10 PHP</p>
                <p className="text-sm text-blue-600 mt-1">Minimum top-up: 10 chips (₱100)</p>
                <p className="text-sm text-blue-600">Current balance: {user?.chips?.toFixed(2) || 0} chips</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Chips Amount *</label>
                  <Input
                    type="number"
                    min="10"
                    step="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter chips amount (minimum 10)"
                    className="w-full"
                  />
                  {amount && (
                    <p className="text-sm text-gray-600 mt-1">
                      Total: ₱{(parseFloat(amount) * 10 || 0).toFixed(2)} PHP
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Payment Method *</label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="credit_card">Credit/Debit Card</SelectItem>
                      <SelectItem value="paymaya">PayMaya</SelectItem>
                      <SelectItem value="gcash">GCash</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Payment Reference Number *</label>
                  <Input
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="Enter transaction reference number"
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Payment Receipt * (Image)</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="receipt-upload"
                    />
                    <label htmlFor="receipt-upload" className="cursor-pointer flex flex-col items-center space-y-2">
                      <Upload className="w-8 h-8 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        {receipt ? receipt.name : "Click to upload receipt image"}
                      </span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Additional Notes</label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any additional information..."
                    className="w-full"
                    rows={3}
                  />
                </div>

                <Button 
                  onClick={handleSubmitTopUp}
                  className="w-full py-3 text-lg bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
                  disabled={!amount || !paymentMethod || !receipt || !reference || parseFloat(amount) < 10}
                >
                  Submit Top-up Request
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TopUpPage;