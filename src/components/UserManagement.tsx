
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, 
  Search,
  Filter,
  RefreshCw,
  Crown,
  Ban,
  UserCheck,
  Trash2,
  RotateCcw,
  Eye,
  EyeOff,
  Loader2,
  Calendar,
  DollarSign,
  Shield,
  Wallet,
  Plus
} from "lucide-react";
import { CheckelsIcon, ChipsIcon } from '@/components/ui/icons';
import { 
  getAllUsers, 
  banUser, 
  unbanUser, 
  deleteUser, 
  resetUserBalance, 
  makeUserAdmin,
  addTransaction,
  updateUserBalance
} from '@/lib/database';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from '@/lib/supabase';

interface UserManagementProps {
  currentUser: any;
  onUserUpdate?: () => void;
}

interface UserData {
  id: string;
  username: string;
  is_admin: boolean;
  is_banned: boolean;
  coins: number;
  chips: number;
  created_at: string;
  updated_at: string;
}

const UserManagement: React.FC<UserManagementProps> = ({ currentUser, onUserUpdate }) => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [isCheckelsDialogOpen, setIsCheckelsDialogOpen] = useState(false);
  const [isChipsDialogOpen, setIsChipsDialogOpen] = useState(false);
  const [checkelsAmount, setCheckelsAmount] = useState('');
  const [chipsAmount, setChipsAmount] = useState('');
  const [processingAction, setProcessingAction] = useState(false);
  const [processingUsers, setProcessingUsers] = useState<Set<string>>(new Set());
  const [showDetails, setShowDetails] = useState(false);
  
  const { toast } = useToast();

  useEffect(() => {
    loadUsers();
    setupRealtimeSubscription();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, statusFilter]);

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

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const userData = await getAllUsers();
      setUsers(userData || []);
    } catch (error: any) {
      console.error('Error loading users:', error);
      toast({
        title: "Error",
        description: "Failed to load users from database",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    if (!supabase) return;

    const subscription = supabase
      .channel('users_management_realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'users'
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setUsers(prev => [payload.new as UserData, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setUsers(prev => prev.map(user => 
            user.id === payload.new.id ? { 
              ...user, 
              ...payload.new as UserData
            } : user
          ));
          
          if (payload.new.id === currentUser?.id && onUserUpdate) {
            const updatedCurrentUser = { ...currentUser, ...payload.new };
            localStorage.setItem('casinoUser', JSON.stringify(updatedCurrentUser));
            onUserUpdate();
          }
        } else if (payload.eventType === 'DELETE') {
          setUsers(prev => prev.filter(user => user.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const filterUsers = () => {
    let filtered = [...users];

    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.id.includes(searchTerm)
      );
    }

    switch (statusFilter) {
      case 'admin':
        filtered = filtered.filter(user => user.is_admin);
        break;
      case 'banned':
        filtered = filtered.filter(user => user.is_banned);
        break;
      case 'active':
        filtered = filtered.filter(user => !user.is_banned);
        break;
      case 'regular':
        filtered = filtered.filter(user => !user.is_admin && !user.is_banned);
        break;
    }

    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setFilteredUsers(filtered);
  };

  const openCheckelsDialog = (user: UserData) => {
    setSelectedUser(user);
    setIsCheckelsDialogOpen(true);
    setCheckelsAmount('');
  };

  const openChipsDialog = (user: UserData) => {
    setSelectedUser(user);
    setIsChipsDialogOpen(true);
    setChipsAmount('');
  };

  const handleAddCheckels = async () => {
    if (!selectedUser) return;

    const checkelsToAdd = parseFloat(checkelsAmount) || 0;

    if (checkelsToAdd <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a positive amount",
        variant: "destructive",
      });
      return;
    }

    try {
      setProcessingAction(true);

      const newCoins = (selectedUser.coins || 0) + checkelsToAdd;

      await updateUserBalance(selectedUser.id, { coins: newCoins });

      setUsers(prev => prev.map(u => 
        u.id === selectedUser.id 
          ? { ...u, coins: newCoins }
          : u
      ));

      await addTransaction({
        user_id: selectedUser.id,
        type: 'topup',
        description: `Admin added ${checkelsToAdd} checkels by ${currentUser.username}`,
        coins_amount: checkelsToAdd,
        amount: 0
      });

      toast({
        title: "Checkels Added Successfully",
        description: `Added ${checkelsToAdd} checkels to ${selectedUser.username}`,
      });

      setIsCheckelsDialogOpen(false);
      setCheckelsAmount('');

    } catch (error: any) {
      console.error('Error adding checkels:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add checkels",
        variant: "destructive",
      });
    } finally {
      setProcessingAction(false);
    }
  };

  const handleAddChips = async () => {
    if (!selectedUser) return;

    const chipsToAdd = parseFloat(chipsAmount) || 0;

    if (chipsToAdd <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a positive amount",
        variant: "destructive",
      });
      return;
    }

    try {
      setProcessingAction(true);

      const newChips = (selectedUser.chips || 0) + chipsToAdd;

      await updateUserBalance(selectedUser.id, { chips: newChips });

      setUsers(prev => prev.map(u => 
        u.id === selectedUser.id 
          ? { ...u, chips: newChips }
          : u
      ));

      await addTransaction({
        user_id: selectedUser.id,
        type: 'topup',
        description: `Admin added ${chipsToAdd} chips by ${currentUser.username}`,
        chips_amount: chipsToAdd,
        amount: chipsToAdd
      });

      toast({
        title: "Chips Added Successfully",
        description: `Added ${chipsToAdd} chips to ${selectedUser.username}`,
      });

      setIsChipsDialogOpen(false);
      setChipsAmount('');

    } catch (error: any) {
      console.error('Error adding chips:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add chips",
        variant: "destructive",
      });
    } finally {
      setProcessingAction(false);
    }
  };

  const handleBanToggle = async (user: UserData) => {
    try {
      setUserProcessing(user.id, true);

      if (user.is_banned) {
        await unbanUser(user.id);
        setUsers(prev => prev.map(u => 
          u.id === user.id ? { ...u, is_banned: false } : u
        ));
        toast({
          title: "User Unbanned",
          description: `${user.username} has been unbanned`,
        });
      } else {
        await banUser(user.id);
        setUsers(prev => prev.map(u => 
          u.id === user.id ? { ...u, is_banned: true } : u
        ));
        toast({
          title: "User Banned",
          description: `${user.username} has been banned`,
        });
      }
    } catch (error: any) {
      console.error('Error toggling ban status:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update ban status",
        variant: "destructive",
      });
    } finally {
      setUserProcessing(user.id, false);
    }
  };

  const handleMakeAdmin = async (user: UserData) => {
    try {
      setUserProcessing(user.id, true);
      await makeUserAdmin(user.id);
      setUsers(prev => prev.map(u => 
        u.id === user.id ? { ...u, is_admin: true } : u
      ));
      toast({
        title: "Admin Granted",
        description: `${user.username} is now an admin`,
      });
    } catch (error: any) {
      console.error('Error making user admin:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to grant admin privileges",
        variant: "destructive",
      });
    } finally {
      setUserProcessing(user.id, false);
    }
  };

  const handleResetBalance = async (user: UserData) => {
    try {
      setUserProcessing(user.id, true);
      await resetUserBalance(user.id);
      setUsers(prev => prev.map(u => 
        u.id === user.id ? { ...u, coins: 0, chips: 0 } : u
      ));
      await addTransaction({
        user_id: user.id,
        type: 'topup',
        description: `Admin balance reset by ${currentUser.username}`,
        coins_amount: 0,
        chips_amount: 0
      });
      toast({
        title: "Balance Reset",
        description: `${user.username}'s balance has been reset`,
      });
    } catch (error: any) {
      console.error('Error resetting balance:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to reset balance",
        variant: "destructive",
      });
    } finally {
      setUserProcessing(user.id, false);
    }
  };

  const handleDeleteUser = async (user: UserData) => {
    try {
      setUserProcessing(user.id, true);
      await deleteUser(user.id);
      setUsers(prev => prev.filter(u => u.id !== user.id));
      toast({
        title: "User Deleted",
        description: `${user.username} has been permanently deleted`,
      });
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    } finally {
      setUserProcessing(user.id, false);
    }
  };

  const getUserStats = () => {
    const totalUsers = users.length;
    const activeUsers = users.filter(u => !u.is_banned).length;
    const bannedUsers = users.filter(u => u.is_banned).length;
    const adminUsers = users.filter(u => u.is_admin).length;
    const totalCheckels = users.reduce((sum, u) => sum + (u.coins || 0), 0);
    const totalChips = users.reduce((sum, u) => sum + (u.chips || 0), 0);

    return { totalUsers, activeUsers, bannedUsers, adminUsers, totalCheckels, totalChips };
  };

  const stats = getUserStats();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="flex items-center space-x-4 text-white">
          <Loader2 className="w-10 h-10 animate-spin text-purple-400" />
          <div>
            <h3 className="text-xl font-semibold">Loading Users</h3>
            <p className="text-slate-300">Fetching user management data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent mb-4">
            User Management System
          </h1>
          <p className="text-slate-300 text-xl">Complete control over users, balances, and permissions</p>
        </div>

        {/* Statistics Dashboard */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 mb-10">
          <Card className="bg-gradient-to-br from-blue-500/20 to-blue-600/30 border border-blue-400/40 backdrop-blur-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-200 text-sm font-medium mb-1">Total Users</p>
                  <p className="text-3xl font-bold text-white">{stats.totalUsers}</p>
                </div>
                <Users className="w-8 h-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/20 to-green-600/30 border border-green-400/40 backdrop-blur-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-200 text-sm font-medium mb-1">Active Users</p>
                  <p className="text-3xl font-bold text-white">{stats.activeUsers}</p>
                </div>
                <UserCheck className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-500/20 to-red-600/30 border border-red-400/40 backdrop-blur-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-200 text-sm font-medium mb-1">Banned Users</p>
                  <p className="text-3xl font-bold text-white">{stats.bannedUsers}</p>
                </div>
                <Ban className="w-8 h-8 text-red-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/20 to-purple-600/30 border border-purple-400/40 backdrop-blur-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-200 text-sm font-medium mb-1">Admins</p>
                  <p className="text-3xl font-bold text-white">{stats.adminUsers}</p>
                </div>
                <Crown className="w-8 h-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/30 border border-yellow-400/40 backdrop-blur-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-200 text-sm font-medium mb-1">Total Checkels</p>
                  <p className="text-2xl font-bold text-white">{stats.totalCheckels.toFixed(0)}</p>
                </div>
                <CheckelsIcon className="w-8 h-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-indigo-500/20 to-indigo-600/30 border border-indigo-400/40 backdrop-blur-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-indigo-200 text-sm font-medium mb-1">Total Chips</p>
                  <p className="text-2xl font-bold text-white">{stats.totalChips.toFixed(0)}</p>
                </div>
                <ChipsIcon className="w-8 h-8 text-indigo-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Management Panel */}
        <Card className="bg-white/5 border border-white/20 backdrop-blur-lg shadow-2xl">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-white">
              <span className="flex items-center space-x-3">
                <Users className="w-8 h-8 text-purple-400" />
                <span className="text-3xl font-bold">User Directory</span>
              </span>
              <div className="flex items-center space-x-3">
                <Button
                  onClick={() => setShowDetails(!showDetails)}
                  variant="outline"
                  size="sm"
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  {showDetails ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                  {showDetails ? 'Hide' : 'Show'} Details
                </Button>
                <Button
                  onClick={loadUsers}
                  variant="outline"
                  size="sm"
                  disabled={isLoading}
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </CardTitle>
          </CardHeader>

          <CardContent className="p-8">
            {/* Search and Filter */}
            <div className="flex flex-col md:flex-row gap-6 mb-8">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/40 w-5 h-5" />
                <Input
                  placeholder="Search users by username or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 h-14 text-lg bg-white/10 border-white/30 text-white placeholder:text-white/40 focus:border-purple-500 focus:ring-purple-500"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-64 h-14 text-lg bg-white/10 border-white/30 text-white focus:border-purple-500">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="active">Active Users</SelectItem>
                  <SelectItem value="banned">Banned Users</SelectItem>
                  <SelectItem value="admin">Admin Users</SelectItem>
                  <SelectItem value="regular">Regular Users</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Users List */}
            <div className="space-y-6 max-h-[700px] overflow-y-auto pr-2">
              {filteredUsers.length === 0 ? (
                <div className="text-center py-20">
                  <Users className="w-24 h-24 mx-auto text-white/30 mb-6" />
                  <h3 className="text-3xl font-bold text-white mb-3">No users found</h3>
                  <p className="text-white/60 text-lg">Try adjusting your search or filter criteria</p>
                </div>
              ) : (
                filteredUsers.map((user) => (
                  <Card key={user.id} className={`transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl border-0 ${
                    user.is_banned 
                      ? 'bg-gradient-to-r from-red-500/20 to-red-600/30 border border-red-400/40' 
                      : user.is_admin
                      ? 'bg-gradient-to-r from-purple-500/20 to-purple-600/30 border border-purple-400/40'
                      : 'bg-gradient-to-r from-slate-600/20 to-slate-700/30 border border-slate-400/40'
                  } backdrop-blur-lg`}>
                    <CardContent className="p-8">
                      <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-8">
                        <div className="flex-1">
                          {/* User Header */}
                          <div className="flex items-center space-x-6 mb-8">
                            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                              {user.username.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <h3 className="text-3xl font-bold text-white mb-2">{user.username}</h3>
                              <div className="flex flex-wrap gap-3">
                                {user.is_admin && (
                                  <Badge className="bg-purple-500/30 text-purple-200 border border-purple-400/50 px-4 py-2 text-sm">
                                    <Crown className="w-4 h-4 mr-2" />
                                    Administrator
                                  </Badge>
                                )}
                                {user.is_banned && (
                                  <Badge className="bg-red-500/30 text-red-200 border border-red-400/50 px-4 py-2 text-sm">
                                    <Ban className="w-4 h-4 mr-2" />
                                    Banned User
                                  </Badge>
                                )}
                                {!user.is_admin && !user.is_banned && (
                                  <Badge className="bg-green-500/30 text-green-200 border border-green-400/50 px-4 py-2 text-sm">
                                    <UserCheck className="w-4 h-4 mr-2" />
                                    Active User
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Balance Cards */}
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                            <div className="bg-yellow-500/20 p-6 rounded-2xl border border-yellow-400/40 backdrop-blur-sm">
                              <div className="flex items-center space-x-4">
                                <CheckelsIcon className="w-8 h-8 text-yellow-400" />
                                <div>
                                  <p className="text-sm font-medium text-yellow-200 mb-1">Checkels Balance</p>
                                  <p className="text-2xl font-bold text-white">
                                    {(user.coins || 0).toFixed(2)} ₵
                                  </p>
                                </div>
                              </div>
                            </div>
                            
                            <div className="bg-blue-500/20 p-6 rounded-2xl border border-blue-400/40 backdrop-blur-sm">
                              <div className="flex items-center space-x-4">
                                <ChipsIcon className="w-8 h-8 text-blue-400" />
                                <div>
                                  <p className="text-sm font-medium text-blue-200 mb-1">Chips Balance</p>
                                  <p className="text-2xl font-bold text-white">
                                    {(user.chips || 0).toFixed(2)}
                                  </p>
                                </div>
                              </div>
                            </div>
                            
                            <div className="bg-green-500/20 p-6 rounded-2xl border border-green-400/40 backdrop-blur-sm">
                              <div className="flex items-center space-x-4">
                                <DollarSign className="w-8 h-8 text-green-400" />
                                <div>
                                  <p className="text-sm font-medium text-green-200 mb-1">PHP Value</p>
                                  <p className="text-2xl font-bold text-white">
                                    ₱{((user.chips || 0) * 10).toFixed(2)}
                                  </p>
                                </div>
                              </div>
                            </div>
                            
                            <div className="bg-slate-500/20 p-6 rounded-2xl border border-slate-400/40 backdrop-blur-sm">
                              <div className="flex items-center space-x-4">
                                <Calendar className="w-8 h-8 text-slate-400" />
                                <div>
                                  <p className="text-sm font-medium text-slate-200 mb-1">Member Since</p>
                                  <p className="text-lg font-bold text-white">
                                    {new Date(user.created_at).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Additional Details */}
                          {showDetails && (
                            <div className="bg-white/10 p-6 rounded-2xl border border-white/20 backdrop-blur-sm">
                              <h4 className="font-bold text-white mb-4 text-lg">Technical Information</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-white/80">
                                <p><strong className="text-white">User ID:</strong> {user.id}</p>
                                <p><strong className="text-white">Last Updated:</strong> {new Date(user.updated_at).toLocaleString()}</p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col space-y-4 xl:w-80">
                          {processingUsers.has(user.id) ? (
                            <div className="flex items-center justify-center w-full py-12 bg-white/10 rounded-2xl border border-white/20">
                              <Loader2 className="w-8 h-8 animate-spin text-purple-400 mr-3" />
                              <span className="text-white text-lg">Processing...</span>
                            </div>
                          ) : (
                            <>
                              {/* Balance Management - Available for ALL users including admins */}
                              <div className="bg-white/5 p-6 rounded-2xl border border-white/20 space-y-4">
                                <h4 className="text-white font-bold text-lg mb-4 flex items-center">
                                  <Wallet className="w-5 h-5 mr-2 text-purple-400" />
                                  Balance Management
                                </h4>
                                <div className="grid grid-cols-2 gap-3">
                                  <Button
                                    onClick={() => openCheckelsDialog(user)}
                                    size="lg"
                                    className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white border-0 shadow-xl h-12"
                                  >
                                    <Plus className="w-4 h-4 mr-2" />
                                    <CheckelsIcon className="w-4 h-4 mr-1" />
                                    Add ₵
                                  </Button>
                                  
                                  <Button
                                    onClick={() => openChipsDialog(user)}
                                    size="lg"
                                    className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-0 shadow-xl h-12"
                                  >
                                    <Plus className="w-4 h-4 mr-2" />
                                    <ChipsIcon className="w-4 h-4 mr-1" />
                                    Add Chips
                                  </Button>
                                </div>
                              </div>

                              {/* Account Management - Only for NON-ADMIN users */}
                              {!user.is_admin ? (
                                <div className="bg-white/5 p-6 rounded-2xl border border-white/20 space-y-4">
                                  <h4 className="text-white font-bold text-lg mb-4 flex items-center">
                                    <Shield className="w-5 h-5 mr-2 text-orange-400" />
                                    Account Management
                                  </h4>
                                  
                                  <Button
                                    onClick={() => handleBanToggle(user)}
                                    size="lg"
                                    className={`w-full border-0 shadow-xl h-12 ${
                                      user.is_banned 
                                        ? "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white" 
                                        : "bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
                                    }`}
                                  >
                                    {user.is_banned ? (
                                      <>
                                        <UserCheck className="w-5 h-5 mr-2" />
                                        Unban User
                                      </>
                                    ) : (
                                      <>
                                        <Ban className="w-5 h-5 mr-2" />
                                        Ban User
                                      </>
                                    )}
                                  </Button>

                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        size="lg"
                                        className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white border-0 shadow-xl h-12"
                                      >
                                        <Crown className="w-5 h-5 mr-2" />
                                        Promote to Admin
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent className="bg-slate-900 border-purple-500/30">
                                      <AlertDialogHeader>
                                        <AlertDialogTitle className="text-white">Grant Admin Privileges</AlertDialogTitle>
                                        <AlertDialogDescription className="text-slate-300">
                                          This will grant "{user.username}" admin privileges. This action cannot be easily undone.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel className="bg-slate-700 text-white border-slate-600">Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => handleMakeAdmin(user)}
                                          className="bg-purple-600 hover:bg-purple-700"
                                        >
                                          Grant Admin
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>

                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        size="lg"
                                        className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white border-0 shadow-xl h-12"
                                      >
                                        <RotateCcw className="w-5 h-5 mr-2" />
                                        Reset Balance
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent className="bg-slate-900 border-amber-500/30">
                                      <AlertDialogHeader>
                                        <AlertDialogTitle className="text-white">Reset Balance</AlertDialogTitle>
                                        <AlertDialogDescription className="text-slate-300">
                                          This will reset "{user.username}"'s checkels and chips to 0. This action cannot be undone.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel className="bg-slate-700 text-white border-slate-600">Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => handleResetBalance(user)}
                                          className="bg-amber-600 hover:bg-amber-700"
                                        >
                                          Reset Balance
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>

                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        size="lg"
                                        className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white border-0 shadow-xl h-12"
                                      >
                                        <Trash2 className="w-5 h-5 mr-2" />
                                        Delete User
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent className="bg-slate-900 border-red-500/30">
                                      <AlertDialogHeader>
                                        <AlertDialogTitle className="text-white">Delete User Permanently</AlertDialogTitle>
                                        <AlertDialogDescription className="text-slate-300">
                                          <div className="space-y-3">
                                            <p className="font-medium text-red-300">⚠️ Warning: This action cannot be undone!</p>
                                            <p>
                                              This will permanently delete "{user.username}" and all their data.
                                            </p>
                                          </div>
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel className="bg-slate-700 text-white border-slate-600">Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => handleDeleteUser(user)}
                                          className="bg-red-600 hover:bg-red-700"
                                        >
                                          Permanently Delete
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              ) : (
                                <div className="bg-purple-500/20 border border-purple-400/40 rounded-2xl p-8 text-center backdrop-blur-sm">
                                  <Shield className="w-12 h-12 text-purple-400 mx-auto mb-4" />
                                  <h4 className="text-white font-bold text-lg mb-2">Admin Account</h4>
                                  <p className="text-purple-200 text-sm">This account is protected from ban/delete operations</p>
                                  <Badge className="bg-purple-500/30 border-purple-400/50 text-purple-200 mt-4">
                                    Protected Status
                                  </Badge>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Add Checkels Dialog */}
        <Dialog open={isCheckelsDialogOpen} onOpenChange={setIsCheckelsDialogOpen}>
          <DialogContent className="sm:max-w-lg bg-slate-900 border-yellow-500/30 text-white">
            <DialogHeader>
              <DialogTitle className="text-3xl font-bold text-white flex items-center space-x-3">
                <CheckelsIcon className="w-8 h-8 text-yellow-400" />
                <span>Add Checkels</span>
              </DialogTitle>
              <DialogDescription className="text-slate-300 text-lg">
                {selectedUser && `Add checkels to ${selectedUser.username}'s account`}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-6">
              <div className="space-y-3">
                <Label htmlFor="checkels-amount" className="text-white flex items-center space-x-2 text-lg">
                  <CheckelsIcon className="w-5 h-5 text-yellow-400" />
                  <span>Checkels Amount</span>
                </Label>
                <Input
                  id="checkels-amount"
                  type="number"
                  placeholder="Enter amount (e.g., 1000)"
                  value={checkelsAmount}
                  onChange={(e) => setCheckelsAmount(e.target.value)}
                  min="0"
                  step="1"
                  className="h-14 text-lg bg-white/10 border-white/30 text-white placeholder:text-white/40 focus:border-yellow-500"
                />
              </div>
              
              {selectedUser && (
                <div className="bg-yellow-500/20 p-6 rounded-xl border border-yellow-400/40 backdrop-blur-sm">
                  <p className="text-yellow-200 mb-2 text-lg">Current Checkels Balance:</p>
                  <div className="text-white text-3xl font-bold">
                    {(selectedUser.coins || 0).toFixed(2)} ₵
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="gap-4">
              <Button
                variant="outline"
                onClick={() => setIsCheckelsDialogOpen(false)}
                disabled={processingAction}
                className="border-white/30 text-white hover:bg-white/10 h-12 px-8"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddCheckels}
                disabled={processingAction || !checkelsAmount}
                className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white border-0 h-12 px-8"
              >
                {processingAction && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
                Add Checkels
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Chips Dialog */}
        <Dialog open={isChipsDialogOpen} onOpenChange={setIsChipsDialogOpen}>
          <DialogContent className="sm:max-w-lg bg-slate-900 border-blue-500/30 text-white">
            <DialogHeader>
              <DialogTitle className="text-3xl font-bold text-white flex items-center space-x-3">
                <ChipsIcon className="w-8 h-8 text-blue-400" />
                <span>Add Chips</span>
              </DialogTitle>
              <DialogDescription className="text-slate-300 text-lg">
                {selectedUser && `Add chips to ${selectedUser.username}'s account`}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-6">
              <div className="space-y-3">
                <Label htmlFor="chips-amount" className="text-white flex items-center space-x-2 text-lg">
                  <ChipsIcon className="w-5 h-5 text-blue-400" />
                  <span>Chips Amount</span>
                </Label>
                <Input
                  id="chips-amount"
                  type="number"
                  placeholder="Enter amount (e.g., 100)"
                  value={chipsAmount}
                  onChange={(e) => setChipsAmount(e.target.value)}
                  min="0"
                  step="1"
                  className="h-14 text-lg bg-white/10 border-white/30 text-white placeholder:text-white/40 focus:border-blue-500"
                />
              </div>
              
              {selectedUser && (
                <div className="bg-blue-500/20 p-6 rounded-xl border border-blue-400/40 backdrop-blur-sm">
                  <p className="text-blue-200 mb-2 text-lg">Current Chips Balance:</p>
                  <div className="text-white text-3xl font-bold">
                    {(selectedUser.chips || 0).toFixed(2)} chips
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="gap-4">
              <Button
                variant="outline"
                onClick={() => setIsChipsDialogOpen(false)}
                disabled={processingAction}
                className="border-white/30 text-white hover:bg-white/10 h-12 px-8"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddChips}
                disabled={processingAction || !chipsAmount}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-0 h-12 px-8"
              >
                {processingAction && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
                Add Chips
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default UserManagement;
