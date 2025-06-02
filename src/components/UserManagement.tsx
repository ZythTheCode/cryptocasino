
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, 
  Plus,
  Minus,
  Ban,
  UserCheck,
  Trash2,
  RotateCcw,
  Crown,
  Loader2,
  AlertTriangle,
  DollarSign,
  Coins
} from "lucide-react";
import { CheckelsIcon, ChipsIcon } from '@/components/ui/icons';
import { 
  getAllUsers, 
  addUserBalance, 
  banUser, 
  unbanUser, 
  deleteUser, 
  resetUserBalance, 
  makeUserAdmin,
  addTransaction
} from '@/lib/database';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from '@/lib/supabase';

interface UserManagementProps {
  currentUser: any;
}

const UserManagement: React.FC<UserManagementProps> = ({ currentUser }) => {
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingUsers, setProcessingUsers] = useState<Set<string>>(new Set());
  const [checkelsInputs, setCheckelsInputs] = useState<{[key: string]: string}>({});
  const [chipsInputs, setChipsInputs] = useState<{[key: string]: string}>({});
  const { toast } = useToast();

  useEffect(() => {
    loadUsers();
    setupRealtimeSubscription();
  }, []);

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
      .channel('users_management')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'users'
      }, (payload) => {
        console.log('User change detected:', payload);

        if (payload.eventType === 'INSERT') {
          setUsers(prev => [payload.new, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          // Real-time balance update
          setUsers(prev => prev.map(user => 
            user.id === payload.new.id ? { 
              ...user, 
              ...payload.new,
              coins: payload.new.coins ?? user.coins,
              chips: payload.new.chips ?? user.chips
            } : user
          ));
        } else if (payload.eventType === 'DELETE') {
          setUsers(prev => prev.filter(user => user.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
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

  const handleAddCheckels = async (userId: string, username: string) => {
    const coinsToAdd = parseFloat(checkelsInputs[userId] || '0') || 0;

    if (coinsToAdd <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a positive amount",
        variant: "destructive",
      });
      return;
    }

    try {
      setUserProcessing(userId, true);

      await addUserBalance(userId, coinsToAdd, 0);

      // Add transaction record
      await addTransaction({
        user_id: userId,
        type: 'topup',
        description: `Admin added ${coinsToAdd} checkels by ${currentUser.username}`,
        coins_amount: coinsToAdd,
        amount: 0
      });

      // Immediately update local state for instant feedback
      setUsers(prev => prev.map(u => 
        u.id === userId 
          ? { ...u, coins: (u.coins || 0) + coinsToAdd }
          : u
      ));

      toast({
        title: "Checkels Added",
        description: `Added ${coinsToAdd} checkels to ${username}`,
      });

      // Clear input
      setCheckelsInputs(prev => ({ ...prev, [userId]: '' }));

    } catch (error: any) {
      console.error('Error adding checkels:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add checkels",
        variant: "destructive",
      });
    } finally {
      setUserProcessing(userId, false);
    }
  };

  const handleAddChips = async (userId: string, username: string) => {
    const chipsToAdd = parseFloat(chipsInputs[userId] || '0') || 0;

    if (chipsToAdd <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a positive amount",
        variant: "destructive",
      });
      return;
    }

    try {
      setUserProcessing(userId, true);

      await addUserBalance(userId, 0, chipsToAdd);

      // Add transaction record
      await addTransaction({
        user_id: userId,
        type: 'topup',
        description: `Admin added ${chipsToAdd} chips by ${currentUser.username}`,
        chips_amount: chipsToAdd,
        amount: chipsToAdd
      });

      // Immediately update local state for instant feedback
      setUsers(prev => prev.map(u => 
        u.id === userId 
          ? { ...u, chips: (u.chips || 0) + chipsToAdd }
          : u
      ));

      toast({
        title: "Chips Added",
        description: `Added ${chipsToAdd} chips to ${username}`,
      });

      // Clear input
      setChipsInputs(prev => ({ ...prev, [userId]: '' }));

    } catch (error: any) {
      console.error('Error adding chips:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add chips",
        variant: "destructive",
      });
    } finally {
      setUserProcessing(userId, false);
    }
  };

  const handleBanUser = async (userId: string, username: string) => {
    try {
      setUserProcessing(userId, true);
      await banUser(userId);

      toast({
        title: "User Banned",
        description: `${username} has been banned successfully`,
      });

    } catch (error: any) {
      console.error('Error banning user:', error);
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

      toast({
        title: "User Unbanned",
        description: `${username} has been unbanned successfully`,
      });

    } catch (error: any) {
      console.error('Error unbanning user:', error);
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

      toast({
        title: "User Deleted",
        description: `${username} has been deleted permanently`,
      });

    } catch (error: any) {
      console.error('Error deleting user:', error);
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

      // Add transaction record
      await addTransaction({
        user_id: userId,
        type: 'topup',
        description: `Admin balance reset by ${currentUser.username}`,
        coins_amount: 0,
        chips_amount: 0
      });

      // Immediately update local state for instant feedback
      setUsers(prev => prev.map(u => 
        u.id === userId 
          ? { ...u, coins: 0, chips: 0 }
          : u
      ));

      toast({
        title: "Balance Reset",
        description: `${username}'s balance has been reset to 0`,
      });

    } catch (error: any) {
      console.error('Error resetting balance:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to reset balance",
        variant: "destructive",
      });
    } finally {
      setUserProcessing(userId, false);
    }
  };

  const handleMakeAdmin = async (userId: string, username: string) => {
    try {
      setUserProcessing(userId, true);
      await makeUserAdmin(userId);

      toast({
        title: "Admin Granted",
        description: `${username} is now an admin`,
      });

    } catch (error: any) {
      console.error('Error making user admin:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to grant admin privileges",
        variant: "destructive",
      });
    } finally {
      setUserProcessing(userId, false);
    }
  };

  const isUserProcessing = (userId: string) => processingUsers.has(userId);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="flex items-center space-x-2">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span>Loading users...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center space-x-2">
            <Users className="w-6 h-6" />
            <span>User Management ({users.length} users)</span>
          </span>
          <Button
            onClick={loadUsers}
            variant="outline"
            size="sm"
            disabled={isLoading}
            className="flex items-center space-x-2"
          >
            <Loader2 className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {users.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">No users found</p>
            </div>
          ) : (
            users.map((userData: any) => (
              <div 
                key={userData.id} 
                className={`border rounded-lg p-4 bg-white transition-all ${
                  userData.is_banned ? 'border-red-300 bg-red-50' : ''
                } ${isUserProcessing(userData.id) ? 'opacity-50' : ''}`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg flex items-center space-x-2">
                      <span>{userData.username}</span>
                      {userData.is_admin && (
                        <Badge className="bg-purple-100 text-purple-700 border-purple-300">
                          <Crown className="w-3 h-3 mr-1" />
                          Admin
                        </Badge>
                      )}
                      {userData.is_banned && (
                        <Badge variant="destructive">
                          <Ban className="w-3 h-3 mr-1" />
                          Banned
                        </Badge>
                      )}
                    </h3>
                    <div className="flex space-x-4 text-sm text-gray-600 mt-2">
                      <span className="flex items-center space-x-1">
                        <CheckelsIcon className="w-4 h-4 text-yellow-500" />
                        <span>Checkels: {(userData.coins || 0).toFixed(2)}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <ChipsIcon className="w-4 h-4 text-blue-500" />
                        <span>Chips: {(userData.chips || 0).toFixed(2)}</span>
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      <p>Total Value: ₱{((userData.chips || 0) * 10).toFixed(2)}</p>
                      <p>Joined: {new Date(userData.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>

                  {/* User Management Actions */}
                  <div className="flex flex-col space-y-2 ml-4">
                    {isUserProcessing(userData.id) && (
                      <div className="flex items-center justify-center">
                        <Loader2 className="w-4 h-4 animate-spin" />
                      </div>
                    )}
                    
                    {!isUserProcessing(userData.id) && (
                      <>
                        {/* Add Checkels - Available for all users */}
                        <div className="space-y-2">
                          <Input
                            type="number"
                            placeholder="Checkels amount"
                            value={checkelsInputs[userData.id] || ''}
                            onChange={(e) => setCheckelsInputs(prev => ({ 
                              ...prev, 
                              [userData.id]: e.target.value 
                            }))}
                            className="h-8 text-sm"
                          />
                          <Button
                            onClick={() => handleAddCheckels(userData.id, userData.username)}
                            size="sm"
                            className="bg-yellow-600 hover:bg-yellow-700 text-white w-full"
                          >
                            <CheckelsIcon className="w-4 h-4 mr-1" />
                            Add Checkels
                          </Button>
                        </div>

                        {/* Add Chips - Available for all users */}
                        <div className="space-y-2">
                          <Input
                            type="number"
                            placeholder="Chips amount"
                            value={chipsInputs[userData.id] || ''}
                            onChange={(e) => setChipsInputs(prev => ({ 
                              ...prev, 
                              [userData.id]: e.target.value 
                            }))}
                            className="h-8 text-sm"
                          />
                          <Button
                            onClick={() => handleAddChips(userData.id, userData.username)}
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 text-white w-full"
                          >
                            <ChipsIcon className="w-4 h-4 mr-1" />
                            Add Chips
                          </Button>
                        </div>

                        {/* Admin-only actions - Don't show for admin accounts */}
                        {!userData.is_admin && (
                          <>
                            {/* Ban/Unban User */}
                            {userData.is_banned ? (
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                  >
                                    <UserCheck className="w-4 h-4 mr-1" />
                                    Unban User
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-80">
                                  <div className="space-y-3">
                                    <h4 className="font-medium text-green-600 flex items-center">
                                      <UserCheck className="w-4 h-4 mr-2" />
                                      Unban User
                                    </h4>
                                    <p className="text-sm text-gray-600">
                                      This will restore access for "{userData.username}" to the application.
                                    </p>
                                    <Button
                                      onClick={() => handleUnbanUser(userData.id, userData.username)}
                                      className="bg-green-600 hover:bg-green-700 text-white"
                                      size="sm"
                                    >
                                      <UserCheck className="w-4 h-4 mr-1" />
                                      Confirm Unban
                                    </Button>
                                  </div>
                                </PopoverContent>
                              </Popover>
                            ) : (
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="border-orange-400 text-orange-600 hover:bg-orange-50"
                                  >
                                    <Ban className="w-4 h-4 mr-1" />
                                    Ban User
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-80">
                                  <div className="space-y-3">
                                    <h4 className="font-medium text-red-600 flex items-center">
                                      <AlertTriangle className="w-4 h-4 mr-2" />
                                      Ban User
                                    </h4>
                                    <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                                      <p className="text-sm text-red-800">
                                        This will prevent "{userData.username}" from accessing the application. They can be unbanned later.
                                      </p>
                                    </div>
                                    <Button
                                      onClick={() => handleBanUser(userData.id, userData.username)}
                                      variant="destructive"
                                      size="sm"
                                    >
                                      <Ban className="w-4 h-4 mr-1" />
                                      Confirm Ban
                                    </Button>
                                  </div>
                                </PopoverContent>
                              </Popover>
                            )}

                            {/* Make Admin */}
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="border-purple-400 text-purple-600 hover:bg-purple-50"
                                >
                                  <Crown className="w-4 h-4 mr-1" />
                                  Make Admin
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-80">
                                <div className="space-y-3">
                                  <h4 className="font-medium text-purple-600 flex items-center">
                                    <Crown className="w-4 h-4 mr-2" />
                                    Grant Admin Privileges
                                  </h4>
                                  <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                                    <p className="text-sm text-purple-800">
                                      This will grant "{userData.username}" full admin privileges including access to this dashboard.
                                    </p>
                                  </div>
                                  <Button
                                    onClick={() => handleMakeAdmin(userData.id, userData.username)}
                                    className="bg-purple-600 hover:bg-purple-700 text-white"
                                    size="sm"
                                  >
                                    <Crown className="w-4 h-4 mr-1" />
                                    Grant Admin Access
                                  </Button>
                                </div>
                              </PopoverContent>
                            </Popover>

                            {/* Reset Balance */}
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="border-yellow-400 text-yellow-600 hover:bg-yellow-50"
                                >
                                  <RotateCcw className="w-4 h-4 mr-1" />
                                  Reset Balance
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-80">
                                <div className="space-y-3">
                                  <h4 className="font-medium text-yellow-600 flex items-center">
                                    <AlertTriangle className="w-4 h-4 mr-2" />
                                    Reset Balance
                                  </h4>
                                  <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                                    <p className="text-sm text-yellow-800">
                                      This will reset "{userData.username}"'s checkels and chips to 0. A transaction record will be created for tracking.
                                    </p>
                                  </div>
                                  <Button
                                    onClick={() => handleResetBalance(userData.id, userData.username)}
                                    variant="outline"
                                    size="sm"
                                    className="border-yellow-400 text-yellow-600 hover:bg-yellow-50"
                                  >
                                    <RotateCcw className="w-4 h-4 mr-1" />
                                    Confirm Reset
                                  </Button>
                                </div>
                              </PopoverContent>
                            </Popover>

                            {/* Delete User */}
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                >
                                  <Trash2 className="w-4 h-4 mr-1" />
                                  Delete User
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-80">
                                <div className="space-y-3">
                                  <h4 className="font-medium text-red-600 flex items-center">
                                    <AlertTriangle className="w-4 h-4 mr-2" />
                                    Delete User Permanently
                                  </h4>
                                  <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                                    <p className="text-sm text-red-800 font-medium">⚠️ Warning: This action cannot be undone!</p>
                                    <p className="text-sm text-red-700 mt-1">
                                      This will permanently delete "{userData.username}" and all their data including transactions and progress.
                                    </p>
                                  </div>
                                  <Button
                                    onClick={() => handleDeleteUser(userData.id, userData.username)}
                                    variant="destructive"
                                    size="sm"
                                  >
                                    <Trash2 className="w-4 h-4 mr-1" />
                                    Permanently Delete
                                  </Button>
                                </div>
                              </PopoverContent>
                            </Popover>
                          </>
                        )}

                        {userData.is_admin && (
                          <Badge variant="outline" className="bg-purple-50 border-purple-200 text-purple-700">
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
  );
};

export default UserManagement;
