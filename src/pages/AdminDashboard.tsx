
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Home, CheckCircle, XCircle, Eye, Users, Activity, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { 
  getAllUsers, 
  getPendingTopupRequests, 
  getAllTransactions, 
  updateTopupRequestStatus,
  updateUserBalance,
  addTransaction,
  banUser,
  unbanUser,
  deleteUser,
  resetUserBalance,
  addUserBalance,
  getUserById
} from "@/lib/database";

const AdminDashboard = () => {
  const [user, setUser] = useState<any>(null);
  const [pendingTopUps, setPendingTopUps] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [allTransactions, setAllTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const loadUserAndData = async () => {
      try {
        // Check environment variables first
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
        
        // Check if user is admin
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
        
        // Set up real-time subscriptions
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

    // Cleanup subscriptions on unmount
    return () => {
      const { supabase } = require('@/lib/supabase');
      supabase.removeAllChannels();
    };
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      // Load all data in parallel for better performance
      const [pendingRequests, users, transactions] = await Promise.all([
        getPendingTopupRequests().catch(err => {
          console.error('Error loading pending topups:', err);
          toast({
            title: "Warning",
            description: "Failed to load pending topups",
            variant: "destructive",
          });
          return [];
        }),
        getAllUsers().catch(err => {
          console.error('Error loading users:', err);
          toast({
            title: "Warning", 
            description: "Failed to load users",
            variant: "destructive",
          });
          return [];
        }),
        getAllTransactions(100).catch(err => {
          console.error('Error loading transactions:', err);
          toast({
            title: "Warning",
            description: "Failed to load transactions", 
            variant: "destructive",
          });
          return [];
        })
      ]);

      // Ensure data is in correct format and set state
      setPendingTopUps(Array.isArray(pendingRequests) ? pendingRequests : []);
      setAllUsers(Array.isArray(users) ? users : []);
      
      // Process transactions to include username from joined user data
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
    } finally {
      setIsLoading(false);
    }
  };

  const setupRealtimeSubscriptions = () => {
    const { supabase } = require('@/lib/supabase');
    
    // Subscribe to user changes with specific handling
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
        } else if (payload.eventType === 'UPDATE') {
          setAllUsers(prev => prev.map(user => 
            user.id === payload.new.id ? payload.new : user
          ));
        } else if (payload.eventType === 'DELETE') {
          setAllUsers(prev => prev.filter(user => user.id !== payload.old.id));
        }
      })
      .subscribe();

    // Subscribe to topup request changes
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

    // Subscribe to transaction changes
    const transactionSubscription = supabase
      .channel('transaction_realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'transactions'
      }, async (payload) => {
        console.log('New transaction detected:', payload);
        
        try {
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
        } catch (error) {
          console.error('Error fetching user for transaction:', error);
        }
      })
      .subscribe();
  };

  const handleApproveTopUp = async (topUpId: string) => {
    const topUp = pendingTopUps.find(t => t.id === topUpId);
    if (!topUp) return;

    try {
      // Find target user by user_id or username
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

      // Update user balance in Supabase
      await updateUserBalance(targetUser.id, {
        chips: (targetUser.chips || 0) + topUp.amount
      });

      // Add transaction to Supabase
      await addTransaction({
        user_id: targetUser.id,
        type: 'topup',
        amount: topUp.amount,
        description: `Top-up approved via ${topUp.payment_method} - ${topUp.reference_number}`,
        php_amount: topUp.amount * 10
      });

      // Update top-up request status
      await updateTopupRequestStatus(topUpId, 'approved', user.username);

      toast({
        title: "Top-up Approved",
        description: `${topUp.amount} chips added to ${targetUser.username}`,
      });

      // Real-time subscriptions will automatically update the UI

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
      // Update top-up request status
      await updateTopupRequestStatus(topUpId, 'rejected', user.username);

      toast({
        title: "Top-up Rejected",
        description: "Top-up request has been rejected",
        variant: "destructive",
      });

      // Real-time subscriptions will automatically update the UI

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
      // Fallback to localStorage for legacy data
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
    if (!confirm(`Are you sure you want to ban user "${username}"?`)) return;

    try {
      await banUser(userId);
      
      toast({
        title: "User Banned",
        description: `${username} has been banned successfully`,
      });
      
      // Real-time subscription will automatically update the UI
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to ban user",
        variant: "destructive",
      });
    }
  };

  const handleUnbanUser = async (userId: string, username: string) => {
    try {
      await unbanUser(userId);
      
      toast({
        title: "User Unbanned",
        description: `${username} has been unbanned successfully`,
      });
      
      // Real-time subscription will automatically update the UI
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to unban user",
        variant: "destructive",
      });
    }
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    if (!confirm(`Are you sure you want to PERMANENTLY DELETE user "${username}"? This action cannot be undone.`)) return;

    try {
      await deleteUser(userId);
      
      toast({
        title: "User Deleted",
        description: `${username} has been deleted permanently`,
      });
      
      // Real-time subscription will automatically update the UI
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    }
  };

  const handleResetBalance = async (userId: string, username: string) => {
    if (!confirm(`Are you sure you want to reset ${username}'s balance to 0?`)) return;

    try {
      await resetUserBalance(userId);
      
      // Add transaction record
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
      
      // Real-time subscription will automatically update the UI
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to reset balance",
        variant: "destructive",
      });
    }
  };

  const handleAddBalance = async (userId: string, username: string) => {
    const coinsInput = prompt(`Enter checkels to add to ${username}:`, "0");
    const chipsInput = prompt(`Enter chips to add to ${username}:`, "0");
    
    if (coinsInput === null || chipsInput === null) return;
    
    const coinsToAdd = parseFloat(coinsInput) || 0;
    const chipsToAdd = parseFloat(chipsInput) || 0;
    
    if (coinsToAdd === 0 && chipsToAdd === 0) {
      toast({
        title: "No Changes",
        description: "No balance was added",
        variant: "destructive",
      });
      return;
    }

    try {
      await addUserBalance(userId, coinsToAdd, chipsToAdd);
      
      toast({
        title: "Balance Updated",
        description: `Added ${coinsToAdd} checkels and ${chipsToAdd} chips to ${username}`,
      });
      
      // Real-time subscription will automatically update the UI
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update balance",
        variant: "destructive",
      });
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <header className="bg-gradient-to-r from-indigo-800/90 to-purple-800/90 backdrop-blur-lg border-b border-white/10 p-4 shadow-xl">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-3xl font-bold text-white flex items-center space-x-3">
            <Users className="w-8 h-8 text-purple-400" />
            <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Admin Dashboard
            </span>
          </h1>
          <div className="flex items-center space-x-3">
            <span className="text-white/90 font-medium">Admin: {user?.username}</span>
            <Button 
              onClick={loadData} 
              variant="outline" 
              size="sm" 
              disabled={isLoading}
              className="flex items-center space-x-2 bg-green-500/20 border-green-400/30 text-green-100 hover:bg-green-500/30"
              title="Manual refresh - Real-time updates are active"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Activity className="w-4 h-4" />
              )}
              <span>Manual Refresh</span>
            </Button>
            <Link to="/">
              <Button variant="outline" size="sm" className="flex items-center space-x-2 bg-blue-500/20 border-blue-400/30 text-blue-100 hover:bg-blue-500/30">
                <Home className="w-4 h-4" />
                <span>Home</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6">
        <Tabs defaultValue="topups" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="topups">
              Pending Top-ups ({pendingTopUps.length})
            </TabsTrigger>
            <TabsTrigger value="users">Users Overview ({allUsers.length})</TabsTrigger>
            <TabsTrigger value="activity">User Activity ({allTransactions.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="topups" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <span>💳</span>
                  <span>Pending Top-up Requests</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {pendingTopUps.length === 0 ? (
                  <div className="text-center py-8">
                    <span className="text-6xl mb-4 block">✅</span>
                    <p className="text-gray-500">No pending top-up requests</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingTopUps.map((topUp) => (
                      <div key={topUp.id} className="border rounded-lg p-4 bg-white">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-semibold text-lg">{topUp.username || topUp.users?.username}</h3>
                            <p className="text-gray-600">
                              {topUp.amount} chips (₱{(topUp.amount * 10).toFixed(2)})
                            </p>
                          </div>
                          <Badge variant="outline" className="bg-yellow-50">
                            {topUp.payment_method}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
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
                            className="flex items-center space-x-1"
                          >
                            <Eye className="w-4 h-4" />
                            <span>View Receipt</span>
                          </Button>
                          <Button
                            onClick={() => handleApproveTopUp(topUp.id)}
                            size="sm"
                            className="flex items-center space-x-1 bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="w-4 h-4" />
                            <span>Approve</span>
                          </Button>
                          <Button
                            onClick={() => handleRejectTopUp(topUp.id)}
                            variant="destructive"
                            size="sm"
                            className="flex items-center space-x-1"
                          >
                            <XCircle className="w-4 h-4" />
                            <span>Reject</span>
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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="w-6 h-6" />
                  <span>Registered Users</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {allUsers.map((userData: any) => (
                    <div key={userData.id} className="border rounded-lg p-4 bg-white">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg flex items-center space-x-2">
                            <span>{userData.username}</span>
                            {userData.is_admin && <Badge>Admin</Badge>}
                            {(userData.is_banned || userData.banned) && <Badge variant="destructive">Banned</Badge>}
                          </h3>
                          <div className="flex space-x-4 text-sm text-gray-600 mt-1">
                            <span>₵ Checkels: {(userData.coins || 0).toFixed(2)}</span>
                            <span>Chips: {(userData.chips || 0).toFixed(2)}</span>
                          </div>
                          <div className="text-right text-sm text-gray-500 mt-2">
                            <p>Total Value: ₱{((userData.chips || 0) * 10).toFixed(2)}</p>
                            <p>Joined: {new Date(userData.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                        
                        {/* User Management Actions */}
                        <div className="flex flex-col space-y-2 ml-4">
                          {/* Only show actions for non-admin users */}
                          {!userData.is_admin ? (
                            <>
                              {(userData.is_banned || userData.banned) ? (
                                <Button
                                  onClick={() => handleUnbanUser(userData.id, userData.username)}
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                >
                                  Unban
                                </Button>
                              ) : (
                                <Button
                                  onClick={() => handleBanUser(userData.id, userData.username)}
                                  size="sm"
                                  variant="outline"
                                  className="border-orange-400 text-orange-600 hover:bg-orange-50"
                                >
                                  Ban User
                                </Button>
                              )}
                              
                              <Button
                                onClick={() => handleAddBalance(userData.id, userData.username)}
                                size="sm"
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                              >
                                Add Balance
                              </Button>
                              
                              <Button
                                onClick={() => handleResetBalance(userData.id, userData.username)}
                                size="sm"
                                variant="outline"
                                className="border-yellow-400 text-yellow-600 hover:bg-yellow-50"
                              >
                                Reset Balance
                              </Button>
                              
                              <Button
                                onClick={() => handleDeleteUser(userData.id, userData.username)}
                                size="sm"
                                variant="destructive"
                              >
                                Delete User
                              </Button>
                            </>
                          ) : (
                            /* Admin protection message */
                            <Badge variant="outline" className="bg-purple-50 border-purple-200 text-purple-700">
                              Protected Account
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="w-6 h-6" />
                  <span>Casino Activity Dashboard</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Activity Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-blue-700 text-sm">Total Transactions</h3>
                    <p className="text-2xl font-bold text-blue-600">{allTransactions.length}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-green-700 text-sm">Casino Bets</h3>
                    <p className="text-2xl font-bold text-green-600">
                      {allTransactions.filter(tx => tx.type === 'bet').length}
                    </p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-purple-700 text-sm">Casino Wins</h3>
                    <p className="text-2xl font-bold text-purple-600">
                      {allTransactions.filter(tx => tx.type === 'win').length}
                    </p>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-yellow-700 text-sm">Conversions</h3>
                    <p className="text-2xl font-bold text-yellow-600">
                      {allTransactions.filter(tx => tx.type === 'conversion' || tx.type === 'chip_conversion').length}
                    </p>
                  </div>
                </div>

                {/* Game Activity Breakdown */}
                <div className="mb-6">
                  <h3 className="font-semibold text-lg mb-3">Casino Games Activity</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {['Minebomb', 'Color Game', 'Blackjack', 'Slot Machine', 'Baccarat'].map(game => {
                      const gameBets = allTransactions.filter(tx => tx.game === game && tx.type === 'bet');
                      const gameWins = allTransactions.filter(tx => tx.game === game && tx.type === 'win');
                      const totalBetAmount = gameBets.reduce((sum, tx) => sum + Math.abs(tx.amount || 0), 0);
                      const totalWinAmount = gameWins.reduce((sum, tx) => sum + (tx.amount || 0), 0);
                      
                      return (
                        <div key={game} className="bg-white border rounded-lg p-3">
                          <h4 className="font-medium text-sm mb-2">{game}</h4>
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between">
                              <span>Bets:</span>
                              <span className="font-medium">{gameBets.length}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Wins:</span>
                              <span className="font-medium">{gameWins.length}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Total Bet:</span>
                              <span className="font-medium text-red-600">{totalBetAmount.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Total Won:</span>
                              <span className="font-medium text-green-600">{totalWinAmount.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between border-t pt-1">
                              <span>House Edge:</span>
                              <span className={`font-medium ${totalBetAmount > totalWinAmount ? 'text-green-600' : 'text-red-600'}`}>
                                {totalBetAmount > 0 ? (((totalBetAmount - totalWinAmount) / totalBetAmount) * 100).toFixed(1) : 0}%
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Recent Activity Feed */}
                <div>
                  <h3 className="font-semibold text-lg mb-3">Recent Activity Feed</h3>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {allTransactions.map((transaction, index) => (
                      <div key={`${transaction.id}-${index}`} className="p-3 bg-white rounded-lg border shadow-sm">
                        <div className="flex justify-between items-start">
                          <div className="flex items-start space-x-2 flex-1">
                            <span className="text-lg">{getTransactionIcon(transaction)}</span>
                            <div>
                              <p className="font-medium text-sm">
                                <span className="font-bold text-blue-600">{transaction.username}</span>
                                {transaction.game && <span className="text-purple-600 ml-1">({transaction.game})</span>}
                                <span className="ml-1">- {transaction.description || transaction.type}</span>
                              </p>
                              <p className="text-xs text-gray-500">
                                {new Date(transaction.created_at).toLocaleString()}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            {transaction.type === 'conversion' || transaction.type === 'chip_conversion' ? (
                              <div className="text-xs">
                                {transaction.coins_amount && <p className="text-red-600">-{transaction.coins_amount.toFixed(2)} ₵</p>}
                                {transaction.chips_amount && <p className="text-green-600">+{transaction.chips_amount.toFixed(2)} chips</p>}
                              </div>
                            ) : (
                              <p className={`font-bold text-sm ${
                                transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
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
                        <span className="text-6xl mb-4 block">📊</span>
                        <p className="text-gray-500">No activity yet</p>
                      </div>
                    )}
                  </div>
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
