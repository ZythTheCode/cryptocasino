
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Home, CheckCircle, XCircle, Eye, Users, Activity } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { 
  getAllUsers, 
  getPendingTopupRequests, 
  getAllTransactions, 
  updateTopupRequestStatus,
  updateUserBalance,
  addTransaction 
} from "@/lib/database";

const AdminDashboard = () => {
  const [user, setUser] = useState<any>(null);
  const [pendingTopUps, setPendingTopUps] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any>({});
  const [allTransactions, setAllTransactions] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const savedUser = localStorage.getItem('casinoUser');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      
      if (!parsedUser.isAdmin && !parsedUser.is_admin) {
        setTimeout(() => {
          window.location.href = '/';
        }, 100);
        return;
      }
    } else {
      window.location.href = '/';
      return;
    }

    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load pending top-ups from Supabase
      const pendingRequests = await getPendingTopupRequests();
      setPendingTopUps(pendingRequests);

      // Load all users from Supabase
      const users = await getAllUsers();
      const usersObject = users.reduce((acc: any, user: any) => {
        acc[user.username] = user;
        return acc;
      }, {});
      setAllUsers(usersObject);

      // Load all transactions from Supabase
      const transactions = await getAllTransactions(100);
      setAllTransactions(transactions);
    } catch (error) {
      console.error('Error loading data from Supabase:', error);
      
      // Fallback to localStorage if Supabase fails
      console.log('Falling back to localStorage...');
      const pending = JSON.parse(localStorage.getItem('pendingTopUps') || '[]');
      setPendingTopUps(pending);

      const users = JSON.parse(localStorage.getItem('casinoUsers') || '{}');
      setAllUsers(users);

      const allTx: any[] = [];
      Object.keys(users).forEach(username => {
        const userTx = JSON.parse(localStorage.getItem(`casino_transactions_${username}`) || '[]');
        const conversionTx = JSON.parse(localStorage.getItem(`transactions_${username}`) || '[]');
        
        userTx.forEach((tx: any) => allTx.push({ ...tx, username }));
        conversionTx.forEach((tx: any) => allTx.push({ ...tx, username }));
      });
      
      allTx.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setAllTransactions(allTx.slice(0, 100));
    }
  };

  const handleApproveTopUp = async (topUpId: string) => {
    const topUp = pendingTopUps.find(t => t.id === topUpId);
    if (!topUp) return;

    try {
      // Update user balance in Supabase
      const targetUser = Object.values(allUsers).find((u: any) => u.username === topUp.username);
      if (!targetUser) {
        toast({
          title: "Error",
          description: "User not found",
          variant: "destructive",
        });
        return;
      }

      await updateUserBalance(targetUser.id, {
        chips: (targetUser.chips || 0) + topUp.amount
      });

      // Add transaction to Supabase
      await addTransaction({
        user_id: targetUser.id,
        type: 'topup',
        amount: topUp.amount,
        description: `Top-up approved via ${topUp.paymentMethod} - ${topUp.reference}`,
        php_amount: topUp.amount * 10
      });

      // Update top-up request status
      await updateTopupRequestStatus(topUpId, 'approved', user.username);

      // Reload data
      await loadData();

      toast({
        title: "Top-up Approved",
        description: `${topUp.amount} chips added to ${topUp.username}`,
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
      // Update top-up request status
      await updateTopupRequestStatus(topUpId, 'rejected', user.username);

      // Reload data
      await loadData();

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
    const receiptData = localStorage.getItem(`receipt_${topUpId}`);
    if (receiptData) {
      const newWindow = window.open();
      if (newWindow) {
        newWindow.document.write(`<img src="${receiptData}" style="max-width: 100%; height: auto;" />`);
      }
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
            <TabsTrigger value="users">Users Overview</TabsTrigger>
            <TabsTrigger value="activity">User Activity</TabsTrigger>
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
                            <h3 className="font-semibold text-lg">{topUp.username}</h3>
                            <p className="text-gray-600">
                              {topUp.amount} chips (₱{(topUp.amount * 10).toFixed(2)})
                            </p>
                          </div>
                          <Badge variant="outline" className="bg-yellow-50">
                            {topUp.paymentMethod}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                          <div>
                            <span className="font-medium">Reference:</span> {topUp.reference}
                          </div>
                          <div>
                            <span className="font-medium">Date:</span> {new Date(topUp.timestamp).toLocaleString()}
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
                  {Object.entries(allUsers).map(([username, userData]: [string, any]) => (
                    <div key={username} className="border rounded-lg p-4 bg-white">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-semibold text-lg flex items-center space-x-2">
                            <span>{username}</span>
                            {userData.isAdmin && <Badge>Admin</Badge>}
                          </h3>
                          <div className="flex space-x-4 text-sm text-gray-600 mt-1">
                            <span>₵ Checkels: {(userData.coins || 0).toFixed(2)}</span>
                            <span>Chips: {(userData.chips || 0).toFixed(2)}</span>
                            <span>Tree Level: {userData.upgrades?.treeLevel || 1}</span>
                          </div>
                        </div>
                        <div className="text-right text-sm text-gray-500">
                          <p>Total Value: ₱{((userData.chips || 0) * 10).toFixed(2)}</p>
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
                      <div key={index} className="p-3 bg-white rounded-lg border shadow-sm">
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
                                {new Date(transaction.timestamp).toLocaleString()}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            {transaction.type === 'conversion' || transaction.type === 'chip_conversion' ? (
                              <div className="text-xs">
                                {transaction.coinsAmount && <p className="text-red-600">-{transaction.coinsAmount.toFixed(2)} ₵</p>}
                                {transaction.chipsAmount && <p className="text-green-600">+{transaction.chipsAmount.toFixed(2)} chips</p>}
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
