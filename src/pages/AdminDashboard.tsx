import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, 
  DollarSign, 
  CreditCard, 
  TrendingUp, 
  Settings,
  Plus,
  Minus,
  Ban,
  UserCheck,
  Trash2,
  RotateCcw,
  Crown,
  Home,
  Gamepad2,
  Wallet,
  Leaf,
  Loader2,
  Activity,
  Eye,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  UserPlus,
  Coins,
  Zap
} from "lucide-react";
import { Link } from "react-router-dom";
import { 
  getAllUsers, 
  addUserBalance, 
  banUser, 
  unbanUser, 
  deleteUser, 
  resetUserBalance, 
  makeUserAdmin,
  getAllTransactions,
  getPendingTopupRequests,
  updateTopupRequestStatus,
  addTransaction,
  updateUserBalance
} from '@/lib/database';
import { CheckelsIcon, ChipsIcon } from "@/components/ui/icons";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from '@/lib/supabase';

const AdminDashboard = () => {
  const [user, setUser] = useState<any>(null);
  const [pendingTopUps, setPendingTopUps] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [allTransactions, setAllTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingUsers, setProcessingUsers] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  // Balance management states
  const [balanceDialog, setBalanceDialog] = useState({ 
    open: false, 
    userId: '', 
    username: '', 
    currentCoins: 0, 
    currentChips: 0 
  });
  const [coinsAmount, setCoinsAmount] = useState('');
  const [chipsAmount, setChipsAmount] = useState('');

  // Bulk operations
  const [bulkDialog, setBulkDialog] = useState({ open: false, type: '' });
  const [bulkAmount, setBulkAmount] = useState('');

  const { toast } = useToast();

  useEffect(() => {
    const loadUserAndData = async () => {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
          toast({
            title: "Configuration Error",
            description: "Supabase environment variables are missing. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Secrets.",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }

        const savedUser = localStorage.getItem('casinoUser');
        if (!savedUser) {
          window.location.href = '/';
          return;
        }

        const parsedUser = JSON.parse(savedUser);

        if (!parsedUser.isAdmin && !parsedUser.is_admin) {
          toast({
            title: "Access Denied",
            description: "You don't have admin privileges",
            variant: "destructive",
          });
          setTimeout(() => {
            window.location.href = '/';
          }, 2000);
          return;
        }

        setUser(parsedUser);
        await loadData();
        setupRealtimeSubscriptions();
      } catch (error) {
        console.error('Error loading user and data:', error);
        toast({
          title: "Error",
          description: "Failed to load admin dashboard. Check console for details.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadUserAndData();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [allUsers, searchTerm, filterType]);

  const loadData = async () => {
    try {
      const [pendingRequests, users, transactions] = await Promise.all([
        getPendingTopupRequests().catch(err => {
          console.error('Error loading pending topups:', err);
          return [];
        }),
        getAllUsers().catch(err => {
          console.error('Error loading users:', err);
          return [];
        }),
        getAllTransactions(100).catch(err => {
          console.error('Error loading transactions:', err);
          return [];
        })
      ]);

      setPendingTopUps(Array.isArray(pendingRequests) ? pendingRequests : []);
      setAllUsers(Array.isArray(users) ? users : []);

      const processedTransactions = Array.isArray(transactions) ? transactions.map(tx => ({
        ...tx,
        username: tx.users?.username || 'Unknown User'
      })) : [];
      setAllTransactions(processedTransactions);

      console.log('Data loaded successfully:', {
        users: users.length,
        pendingTopups: pendingRequests.length,
        transactions: transactions.length
      });

    } catch (error) {
      console.error('Critical error loading data from Supabase:', error);
      toast({
        title: "Database Error",
        description: "Critical error loading data. Please refresh the page.",
        variant: "destructive",
      });
    }
  };

  const setupRealtimeSubscriptions = () => {
    if (!supabase) return;

    const usersSubscription = supabase
      .channel('users_realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'users'
      }, (payload) => {
        console.log('User change detected:', payload);

        if (payload.eventType === 'INSERT') {
          setAllUsers(prev => [payload.new, ...prev]);
          toast({
            title: "New User",
            description: `User ${payload.new.username} has registered`,
          });
        } else if (payload.eventType === 'UPDATE') {
          setAllUsers(prev => prev.map(user => 
            user.id === payload.new.id ? { ...user, ...payload.new } : user
          ));
        } else if (payload.eventType === 'DELETE') {
          setAllUsers(prev => prev.filter(user => user.id !== payload.old.id));
          toast({
            title: "User Deleted",
            description: `User has been deleted`,
            variant: "destructive",
          });
        }
      })
      .subscribe();

    const topupSubscription = supabase
      .channel('topup_realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'topup_requests'
      }, (payload) => {
        console.log('Topup change detected:', payload);

        if (payload.eventType === 'INSERT' && payload.new.status === 'pending') {
          setPendingTopUps(prev => [payload.new, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          if (payload.new.status === 'pending') {
            setPendingTopUps(prev => prev.map(topup => 
              topup.id === payload.new.id ? payload.new : topup
            ));
          } else {
            setPendingTopUps(prev => prev.filter(topup => topup.id !== payload.new.id));
          }
        }
      })
      .subscribe();

    const transactionSubscription = supabase
      .channel('transaction_realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'transactions'
      }, async (payload) => {
        console.log('New transaction detected:', payload);

        try {
          if (supabase) {
            const { data: userData } = await supabase
              .from('users')
              .select('username')
              .eq('id', payload.new.user_id)
              .single();

            const newTransaction = {
              ...payload.new,
              users: userData,
              username: userData?.username || 'Unknown User'
            };

            setAllTransactions(prev => [newTransaction, ...prev.slice(0, 99)]);
          }
        } catch (error) {
          console.error('Error fetching user for transaction:', error);
        }
      })
      .subscribe();
  };

  const filterUsers = () => {
    let filtered = allUsers;

    if (searchTerm) {
      filtered = filtered.filter(user => 
        user.username.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    switch (filterType) {
      case 'admin':
        filtered = filtered.filter(user => user.is_admin);
        break;
      case 'banned':
        filtered = filtered.filter(user => user.is_banned);
        break;
      case 'regular':
        filtered = filtered.filter(user => !user.is_admin && !user.is_banned);
        break;
      default:
        break;
    }

    setFilteredUsers(filtered);
  };

  const setUserProcessing = (userId: string, processing: boolean) => {
    setProcessingUsers(prev => {
      const newSet = new Set(prev);
      if (processing) {
        newSet.add(userId);
      } else {
        newSet.delete(userId);
      }
      return newSet;
    });
  };

  const handleUpdateBalance = async () => {
    const coinsToAdd = parseFloat(coinsAmount) || 0;
    const chipsToAdd = parseFloat(chipsAmount) || 0;

    if (coinsToAdd === 0 && chipsToAdd === 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter at least one positive amount",
        variant: "destructive",
      });
      return;
    }

    try {
      setUserProcessing(balanceDialog.userId, true);

      const newCoins = balanceDialog.currentCoins + coinsToAdd;
      const newChips = balanceDialog.currentChips + chipsToAdd;

      await updateUserBalance(balanceDialog.userId, {
        coins: newCoins,
        chips: newChips
      });

      setAllUsers(prev => prev.map(u => 
        u.id === balanceDialog.userId 
          ? { ...u, coins: newCoins, chips: newChips }
          : u
      ));

      if (coinsToAdd > 0) {
        await addTransaction({
          user_id: balanceDialog.userId,
          type: 'topup',
          description: `Admin added ${coinsToAdd} checkels by ${user.username}`,
          coins_amount: coinsToAdd,
          amount: 0
        });
      }

      if (chipsToAdd > 0) {
        await addTransaction({
          user_id: balanceDialog.userId,
          type: 'topup',
          description: `Admin added ${chipsToAdd} chips by ${user.username}`,
          chips_amount: chipsToAdd,
          amount: chipsToAdd
        });
      }

      toast({
        title: "Balance Updated",
        description: `Added ${coinsToAdd} checkels and ${chipsToAdd} chips to ${balanceDialog.username}`,
      });

      setBalanceDialog({ open: false, userId: '', username: '', currentCoins: 0, currentChips: 0 });
      setCoinsAmount('');
      setChipsAmount('');

    } catch (error: any) {
      console.error('Error updating balance:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update balance",
        variant: "destructive",
      });
    } finally {
      setUserProcessing(balanceDialog.userId, false);
    }
  };

  const handleBulkOperation = async () => {
    const amount = parseFloat(bulkAmount) || 0;
    if (amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a positive amount",
        variant: "destructive",
      });
      return;
    }

    try {
      const regularUsers = allUsers.filter(u => !u.is_admin);

      for (const userData of regularUsers) {
        if (bulkDialog.type === 'checkels') {
          const newCoins = (userData.coins || 0) + amount;
          await updateUserBalance(userData.id, { coins: newCoins });

          await addTransaction({
            user_id: userData.id,
            type: 'topup',
            description: `Bulk admin gift: ${amount} checkels by ${user.username}`,
            coins_amount: amount,
            amount: 0
          });
        } else if (bulkDialog.type === 'chips') {
          const newChips = (userData.chips || 0) + amount;
          await updateUserBalance(userData.id, { chips: newChips });

          await addTransaction({
            user_id: userData.id,
            type: 'topup',
            description: `Bulk admin gift: ${amount} chips by ${user.username}`,
            chips_amount: amount,
            amount: amount
          });
        }
      }

      toast({
        title: "Bulk Operation Complete",
        description: `Added ${amount} ${bulkDialog.type} to ${regularUsers.length} users`,
      });

      setBulkDialog({ open: false, type: '' });
      setBulkAmount('');
      await loadData();

    } catch (error: any) {
      console.error('Error in bulk operation:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to complete bulk operation",
        variant: "destructive",
      });
    }
  };

  const handleApproveTopUp = async (topUpId: string) => {
    const topUp = pendingTopUps.find(t => t.id === topUpId);
    if (!topUp) return;

    try {
      let targetUser = allUsers.find((u: any) => u.id === topUp.user_id);

      if (!targetUser && topUp.username) {
        targetUser = allUsers.find((u: any) => u.username === topUp.username);
      }

      if (!targetUser) {
        toast({
          title: "Error",
          description: "User not found",
          variant: "destructive",
        });
        return;
      }

      const newChipsAmount = (targetUser.chips || 0) + topUp.amount;

      const updatedUser = await updateUserBalance(targetUser.id, {
        chips: newChipsAmount
      });

      setAllUsers(prev => prev.map(u => 
        u.id === targetUser.id 
          ? { ...u, chips: newChipsAmount }
          : u
      ));

      if (user?.id === targetUser.id) {
        const updatedCurrentUser = { ...user, chips: newChipsAmount };
        setUser(updatedCurrentUser);
        localStorage.setItem('casinoUser', JSON.stringify(updatedCurrentUser));
      }

      await addTransaction({
        user_id: targetUser.id,
        type: 'topup',
        amount: topUp.amount,
        description: `Top-up approved via ${topUp.payment_method} - ${topUp.reference_number}`,
        php_amount: topUp.amount * 10
      });

      await updateTopupRequestStatus(topUpId, 'approved', user.username);

      toast({
        title: "Top-up Approved",
        description: `${topUp.amount} chips added to ${targetUser.username}`,
      });

    } catch (error) {
      console.error('Error approving top-up:', error);
      toast({
        title: "Error",
        description: "Failed to approve top-up. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRejectTopUp = async (topUpId: string) => {
    try {
      await updateTopupRequestStatus(topUpId, 'rejected', user.username);

      toast({
        title: "Top-up Rejected",
        description: "Top-up request has been rejected",
        variant: "destructive",
      });

    } catch (error) {
      console.error('Error rejecting top-up:', error);
      toast({
        title: "Error",
        description: "Failed to reject top-up. Please try again.",
        variant: "destructive",
      });
    }
  };

  const viewReceipt = (topUpId: string) => {
    const topUp = pendingTopUps.find(t => t.id === topUpId);
    if (topUp?.receipt_data) {
      const newWindow = window.open();
      if (newWindow) {
        newWindow.document.write(`<img src="${topUp.receipt_data}" style="max-width: 100%; height: auto;" />`);
      }
    } else {
      const receiptData = localStorage.getItem(`receipt_${topUpId}`);
      if (receiptData) {
        const newWindow = window.open();
        if (newWindow) {
          newWindow.document.write(`<img src="${receiptData}" style="max-width: 100%; height: auto;" />`);
        }
      } else {
        toast({
          title: "No Receipt",
          description: "No receipt found for this request",
          variant: "destructive",
        });
      }
    }
  };

  const handleBanUser = async (userId: string, username: string) => {
    try {
      setUserProcessing(userId, true);
      await banUser(userId);

      setAllUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, is_banned: true } : u
      ));

      toast({
        title: "User Banned",
        description: `${username} has been banned successfully`,
      });

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to ban user",
        variant: "destructive",
      });
    } finally {
      setUserProcessing(userId, false);
    }
  };

  const handleUnbanUser = async (userId: string, username: string) => {
    try {
      setUserProcessing(userId, true);
      await unbanUser(userId);

      setAllUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, is_banned: false } : u
      ));

      toast({
        title: "User Unbanned",
        description: `${username} has been unbanned successfully`,
      });

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to unban user",
        variant: "destructive",
      });
    } finally {
      setUserProcessing(userId, false);
    }
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    try {
      setUserProcessing(userId, true);
      await deleteUser(userId);

      setAllUsers(prev => prev.filter(u => u.id !== userId));

      toast({
        title: "User Deleted",
        description: `${username} has been deleted permanently`,
      });

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    } finally {
      setUserProcessing(userId, false);
    }
  };

  const handleResetBalance = async (userId: string, username: string) => {
    try {
      setUserProcessing(userId, true);
      await resetUserBalance(userId);

      setAllUsers(prev => prev.map(u => 
        u.id === userId 
          ? { ...u, coins: 0, chips: 0 }
          : u
      ));

      if (user?.id === userId) {
        const updatedCurrentUser = { ...user, coins: 0, chips: 0 };
        setUser(updatedCurrentUser);
        localStorage.setItem('casinoUser', JSON.stringify(updatedCurrentUser));
      }

      await addTransaction({
        user_id: userId,
        type: 'topup',
        description: `Admin balance reset by ${user.username}`,
        coins_amount: 0,
        chips_amount: 0
      });

      toast({
        title: "Balance Reset",
        description: `${username}'s balance has been reset to 0`,
      });

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to reset balance",
        variant: "destructive",
      });
    } finally {
      setUserProcessing(userId, false);
    }
  };

  const getTransactionIcon = (transaction: any) => {
    if (transaction.type === 'conversion' || transaction.type === 'chip_conversion') return '🔄';
    if (transaction.type === 'bet') return '🎲';
    if (transaction.type === 'win') return '🏆';
    if (transaction.type === 'topup') return '💳';
    if (transaction.type === 'withdrawal') return '🏧';
    return '💰';
  };

  if (!user?.isAdmin && !user?.is_admin) return null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="flex items-center space-x-2 text-white">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading admin dashboard...</span>
        </div>
      </div>
    );
  }

  const nonAdminUsers = allUsers.filter(u => !u.is_admin);
  const totalCheckels = nonAdminUsers.reduce((sum, u) => sum + (u.coins || 0), 0);
  const totalChips = nonAdminUsers.reduce((sum, u) => sum + (u.chips || 0), 0);
  const bannedUsers = nonAdminUsers.filter(u => u.is_banned).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <header className="bg-gradient-to-r from-indigo-800/90 to-purple-800/90 backdrop-blur-lg border-b border-white/10 p-4 shadow-xl">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-3xl font-bold text-white flex items-center space-x-3">
            <Crown className="w-8 h-8 text-yellow-400" />
            <span className="bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
              Admin Control Center
            </span>
          </h1>
          <div className="flex items-center space-x-3">
            <Badge className="bg-purple-500/20 text-purple-100 border-purple-400/30">
              Admin: {user?.username}
            </Badge>
            <Button
              onClick={() => {
                loadData();
                toast({
                  title: "Refreshed",
                  description: "Data has been refreshed",
                });
              }} 
              variant="outline" 
              size="sm" 
              disabled={isLoading}
              className="bg-green-500/20 border-green-400/30 text-green-100 hover:bg-green-500/30"
            >
              <Activity className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Link to="/">
              <Button variant="outline" size="sm" className="bg-blue-500/20 border-blue-400/30 text-blue-100 hover:bg-blue-500/30">
                <Home className="w-4 h-4 mr-2" />
                Home
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 border-blue-400/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Total Users</p>
                  <p className="text-3xl font-bold text-white">{nonAdminUsers.length}</p>
                </div>
                <Users className="w-8 h-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 border-yellow-400/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-100 text-sm font-medium">Total Checkels</p>
                  <p className="text-3xl font-bold text-white">{totalCheckels.toFixed(0)}</p>
                </div>
                <CheckelsIcon className="w-8 h-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/20 to-green-600/20 border-green-400/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">Total Chips</p>
                  <p className="text-3xl font-bold text-white">{totalChips.toFixed(0)}</p>
                </div>
                <ChipsIcon className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-500/20 to-red-600/20 border-red-400/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-100 text-sm font-medium">Banned Users</p>
                  <p className="text-3xl font-bold text-white">{bannedUsers}</p>
                </div>
                <Ban className="w-8 h-8 text-red-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bulk Operations */}
        <Card className="mb-8 bg-gradient-to-br from-purple-500/10 to-indigo-500/10 border-purple-400/30">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <Zap className="w-6 h-6 text-purple-400" />
              <span>Bulk Operations</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Dialog open={bulkDialog.open && bulkDialog.type === 'checkels'} onOpenChange={(open) => !open && setBulkDialog({ open: false, type: '' })}>
                <DialogTrigger asChild>
                  <Button 
                    onClick={() => setBulkDialog({ open: true, type: 'checkels' })}
                    className="bg-yellow-600 hover:bg-yellow-700 text-white"
                  >
                    <CheckelsIcon className="w-4 h-4 mr-2" />
                    Give All Users Checkels
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="flex items-center space-x-2">
                      <CheckelsIcon className="w-5 h-5 text-yellow-500" />
                      <span>Give Checkels to All Users</span>
                    </DialogTitle>
                    <DialogDescription>
                      This will add checkels to all non-admin users ({nonAdminUsers.length} users).
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                    <Label htmlFor="bulk-checkels">Amount of Checkels</Label>
                    <Input
                      id="bulk-checkels"
                      type="number"
                      placeholder="1000"
                      value={bulkAmount}
                      onChange={(e) => setBulkAmount(e.target.value)}
                      min="0"
                      step="1"
                    />
                  </div>
                  <DialogFooter>
                    <Button onClick={handleBulkOperation} className="bg-yellow-600 hover:bg-yellow-700">
                      Give Checkels to {nonAdminUsers.length} Users
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={bulkDialog.open && bulkDialog.type === 'chips'} onOpenChange={(open) => !open && setBulkDialog({ open: false, type: '' })}>
                <DialogTrigger asChild>
                  <Button 
                    onClick={() => setBulkDialog({ open: true, type: 'chips' })}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <ChipsIcon className="w-4 h-4 mr-2" />
                    Give All Users Chips
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="flex items-center space-x-2">
                      <ChipsIcon className="w-5 h-5 text-green-500" />
                      <span>Give Chips to All Users</span>
                    </DialogTitle>
                    <DialogDescription>
                      This will add chips to all non-admin users ({nonAdminUsers.length} users).
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                    <Label htmlFor="bulk-chips">Amount of Chips</Label>
                    <Input
                      id="bulk-chips"
                      type="number"
                      placeholder="100"
                      value={bulkAmount}
                      onChange={(e) => setBulkAmount(e.target.value)}
                      min="0"
                      step="1"
                    />
                  </div>
                  <DialogFooter>
                    <Button onClick={handleBulkOperation} className="bg-green-600 hover:bg-green-700">
                      Give Chips to {nonAdminUsers.length} Users
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="topups" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="topups" className="data-[state=active]:bg-purple-600">
              Pending Top-ups ({pendingTopUps.length})
            </TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-purple-600">
              User Management ({filteredUsers.length})
            </TabsTrigger>
            <TabsTrigger value="activity" className="data-[state=active]:bg-purple-600">
              Activity Log ({allTransactions.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="topups" className="space-y-4">
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-white">
                  <CreditCard className="w-6 h-6 text-blue-400" />
                  <span>Pending Top-up Requests</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {pendingTopUps.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="w-16 h-16 mx-auto text-green-400 mb-4" />
                    <p className="text-white/70 text-lg">No pending top-up requests</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingTopUps.map((topUp) => (
                      <div key={topUp.id} className="bg-white/10 rounded-lg p-4 border border-white/20">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-semibold text-lg text-white">{topUp.username || topUp.users?.username}</h3>
                            <p className="text-white/70">
                              {topUp.amount} chips (₱{(topUp.amount * 10).toFixed(2)})
                            </p>
                          </div>
                          <Badge variant="outline" className="bg-yellow-500/20 border-yellow-400 text-yellow-200">
                            {topUp.payment_method}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4 text-sm text-white/70">
                          <div>
                            <span className="font-medium">Reference:</span> {topUp.reference_number || topUp.reference}
                          </div>
                          <div>
                            <span className="font-medium">Date:</span> {new Date(topUp.created_at || topUp.timestamp).toLocaleString()}
                          </div>
                          <div className="col-span-2">
                            <span className="font-medium">Notes:</span> {topUp.notes || 'None'}
                          </div>
                        </div>

                        <div className="flex space-x-2">
                          <Button
                            onClick={() => viewReceipt(topUp.id)}
                            variant="outline"
                            size="sm"
                            className="border-blue-400 text-blue-200 hover:bg-blue-500/20"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Receipt
                          </Button>
                          <Button
                            onClick={() => handleApproveTopUp(topUp.id)}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            onClick={() => handleRejectTopUp(topUp.id)}
                            variant="destructive"
                            size="sm"
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-white">
                  <Users className="w-6 h-6 text-purple-400" />
                  <span>User Management</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Search and Filter */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40 w-4 h-4" />
                    <Input
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/40"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Filter className="w-4 h-4 text-white/70" />
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      className="px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="all">All Users</option>
                      <option value="admin">Admins</option>
                      <option value="regular">Regular Users</option>
                      <option value="banned">Banned Users</option>
                    </select>
                  </div>
                </div>

                {/* Users List */}
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {filteredUsers.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="w-12 h-12 mx-auto text-white/40 mb-4" />
                      <p className="text-white/70">
                        {searchTerm || filterType !== 'all' ? 'No users match your filters' : 'No users found'}
                      </p>
                    </div>
                  ) : (
                    filteredUsers.map((userData: any) => (
                      <div 
                        key={userData.id} 
                        className={`bg-white/10 rounded-lg p-4 border transition-all hover:bg-white/15 ${
                          userData.is_banned ? 'border-red-400/50 bg-red-500/10' : 'border-white/20'
                        } ${processingUsers.has(userData.id) ? 'opacity-50' : ''}`}
                      >
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                          {/* User Info */}
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="font-semibold text-lg text-white">{userData.username}</h3>
                              {userData.is_admin && (
                                <Badge className="bg-purple-500/20 text-purple-200 border-purple-400/30">
                                  <Crown className="w-3 h-3 mr-1" />
                                  Admin
                                </Badge>
                              )}
                              {userData.is_banned && (
                                <Badge variant="destructive" className="bg-red-500/20 border-red-400/30">
                                  <Ban className="w-3 h-3 mr-1" />
                                  Banned
                                </Badge>
                              )}
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm text-white/70">
                              <div className="flex items-center space-x-2">
                                <CheckelsIcon className="w-4 h-4 text-yellow-400" />
                                <span>Checkels: {(userData.coins || 0).toFixed(2)}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <ChipsIcon className="w-4 h-4 text-green-400" />
                                <span>Chips: {(userData.chips || 0).toFixed(2)}</span>
                              </div>
                              <div>
                                Total Value: ₱{((userData.chips || 0) * 10).toFixed(2)}
                              </div>
                              <div>
                                Joined: {new Date(userData.created_at).toLocaleDateString()}
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex flex-wrap gap-2 lg:flex-col lg:w-auto">
                            {processingUsers.has(userData.id) ? (
                              <div className="flex items-center justify-center w-full">
                                <Loader2 className="w-4 h-4 animate-spin text-white" />
                                <span className="ml-2 text-sm text-white">Processing...</span>
                              </div>
                            ) : (
                              <>
                                {!userData.is_admin ? (
                                  <>
                                    {/* Add Balance Button */}
                                    <Dialog 
                                      open={balanceDialog.open && balanceDialog.userId === userData.id} 
                                      onOpenChange={(open) => !open && setBalanceDialog({ open: false, userId: '', username: '', currentCoins: 0, currentChips: 0 })}
                                    >
                                      <DialogTrigger asChild>
                                        <Button
                                          onClick={() => setBalanceDialog({ 
                                            open: true, 
                                            userId: userData.id, 
                                            username: userData.username, 
                                            currentCoins: userData.coins || 0,
                                            currentChips: userData.chips || 0
                                          })}
                                          size="sm"
                                          className="bg-blue-600 hover:bg-blue-700 text-white"
                                        >
                                          <Plus className="w-4 h-4 mr-1" />
                                          Add Balance
                                        </Button>
                                      </DialogTrigger>
                                      <DialogContent>
                                        <DialogHeader>
                                          <DialogTitle className="flex items-center space-x-2">
                                            <Wallet className="w-5 h-5 text-blue-500" />
                                            <span>Add Balance to {userData.username}</span>
                                          </DialogTitle>
                                          <DialogDescription>
                                            Current balance: {(userData.coins || 0).toFixed(2)} checkels, {(userData.chips || 0).toFixed(2)} chips
                                          </DialogDescription>
                                        </DialogHeader>
                                        <div className="grid gap-4 py-4">
                                          <div>
                                            <Label htmlFor="checkels-amount" className="flex items-center space-x-2">
                                              <CheckelsIcon className="w-4 h-4 text-yellow-500" />
                                              <span>Checkels to Add</span>
                                            </Label>
                                            <Input
                                              id="checkels-amount"
                                              type="number"
                                              placeholder="0"
                                              value={coinsAmount}
                                              onChange={(e) => setCoinsAmount(e.target.value)}
                                              min="0"
                                              step="1"
                                            />
                                          </div>
                                          <div>
                                            <Label htmlFor="chips-amount" className="flex items-center space-x-2">
                                              <ChipsIcon className="w-4 h-4 text-green-500" />
                                              <span>Chips to Add</span>
                                            </Label>
                                            <Input
                                              id="chips-amount"
                                              type="number"
                                              placeholder="0"
                                              value={chipsAmount}
                                              onChange={(e) => setChipsAmount(e.target.value)}
                                              min="0"
                                              step="1"
                                            />
                                          </div>
                                        </div>
                                        <DialogFooter>
                                          <Button onClick={handleUpdateBalance} className="bg-blue-600 hover:bg-blue-700">
                                            Update Balance
                                          </Button>
                                        </DialogFooter>
                                      </DialogContent>
                                    </Dialog>

                                    {/* Ban/Unban */}
                                    {userData.is_banned ? (
                                      <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                          <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                                            <UserCheck className="w-4 h-4 mr-1" />
                                            Unban
                                          </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                          <AlertDialogHeader>
                                            <AlertDialogTitle>Unban User</AlertDialogTitle>
                                            <AlertDialogDescription>
                                              This will restore access for "{userData.username}" to the application.
                                            </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction
                                              onClick={() => handleUnbanUser(userData.id, userData.username)}
                                              className="bg-green-600 hover:bg-green-700"
                                            >
                                              Unban User
                                            </AlertDialogAction>
                                          </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>
                                    ) : (
                                      <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                          <Button size="sm" variant="outline" className="border-orange-400 text-orange-300 hover:bg-orange-500/20">
                                            <Ban className="w-4 h-4 mr-1" />
                                            Ban
                                          </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                          <AlertDialogHeader>
                                            <AlertDialogTitle>Ban User</AlertDialogTitle>
                                            <AlertDialogDescription>
                                              This will prevent "{userData.username}" from accessing the application.
                                            </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction
                                              onClick={() => handleBanUser(userData.id, userData.username)}
                                              className="bg-red-600 hover:bg-red-700"
                                            >
                                              Ban User
                                            </AlertDialogAction>
                                          </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>
                                    )}

                                    {/* Reset Balance */}
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button size="sm" variant="outline" className="border-yellow-400 text-yellow-300 hover:bg-yellow-500/20">
                                          <RotateCcw className="w-4 h-4 mr-1" />
                                          Reset
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Reset Balance</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            This will reset "{userData.username}"'s checkels and chips to 0.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                                          <AlertDialogAction
                                            onClick={() => handleResetBalance(userData.id, userData.username)}
                                            className="bg-yellow-600 hover:bg-yellow-700"
                                          >
                                            Reset Balance
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>

                                    {/* Delete User */}
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button size="sm" variant="destructive">
                                          <Trash2 className="w-4 h-4 mr-1" />
                                          Delete
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Delete User Permanently</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            <div className="space-y-2">
                                              <p className="font-medium text-red-800">⚠️ Warning: This action cannot be undone!</p>
                                              <p className="text-red-700">
                                                This will permanently delete "{userData.username}" and all their data.
                                              </p>
                                            </div>
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                                          <AlertDialogAction
                                            onClick={() => handleDeleteUser(userData.id, userData.username)}
                                            className="bg-red-600 hover:bg-red-700"
                                          >
                                            Permanently Delete
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </>
                                ) : (
                                  <Badge variant="outline" className="bg-purple-500/20 border-purple-400/30 text-purple-200">
                                    <Crown className="w-3 h-3 mr-1" />
                                    Protected Account
                                  </Badge>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity" className="space-y-4">
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-white">
                  <Activity className="w-6 h-6 text-green-400" />
                  <span>Recent Activity</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {allTransactions.map((transaction, index) => (
                    <div key={`${transaction.id}-${index}`} className="p-3 bg-white/10 rounded-lg border border-white/20">
                      <div className="flex justify-between items-start">
                        <div className="flex items-start space-x-2 flex-1">
                          <span className="text-lg">{getTransactionIcon(transaction)}</span>
                          <div>
                            <p className="font-medium text-sm text-white">
                              <span className="font-bold text-blue-300">{transaction.username}</span>
                              {transaction.game && <span className="text-purple-300 ml-1">({transaction.game})</span>}
                              <span className="ml-1 text-white/70">- {transaction.description || transaction.type}</span>
                            </p>
                            <p className="text-xs text-white/50">
                              {new Date(transaction.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          {transaction.type === 'conversion' || transaction.type === 'chip_conversion' ? (
                            <div className="text-xs">
                              {transaction.coins_amount && <p className="text-red-400">-{transaction.coins_amount.toFixed(2)} ₵</p>}
                              {transaction.chips_amount && <p className="text-green-400">+{transaction.chips_amount.toFixed(2)} chips</p>}
                            </div>
                          ) : (
                            <p className={`font-bold text-sm ${
                              transaction.amount > 0 ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {transaction.amount > 0 ? '+' : ''}{transaction.amount?.toFixed(2)} chips
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {allTransactions.length === 0 && (
                    <div className="text-center py-8">
                      <Activity className="w-16 h-16 mx-auto text-white/40 mb-4" />
                      <p className="text-white/70">No activity yet</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;