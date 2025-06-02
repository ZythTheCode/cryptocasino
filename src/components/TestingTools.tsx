
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { 
  Settings,
  Loader2,
  AlertTriangle,
  Trash2,
  RefreshCw,
  DollarSign,
  Coins,
  Database,
  TestTube
} from "lucide-react";
import { 
  getAllUsers, 
  addUserBalance, 
  resetUserBalance,
  addTransaction
} from '@/lib/database';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface TestingToolsProps {
  currentUser: any;
  onDataChange?: () => void;
}

const TestingTools: React.FC<TestingToolsProps> = ({ currentUser, onDataChange }) => {
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const userData = await getAllUsers();
      setUsers(userData || []);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const giveAllUsers10kCheckels = async () => {
    try {
      setProcessingAction('give-checkels');
      const regularUsers = users.filter(user => !user.is_admin);
      
      for (const user of regularUsers) {
        await addUserBalance(user.id, 10000, 0);
        
        // Add transaction record
        await addTransaction({
          user_id: user.id,
          type: 'topup',
          description: `Testing: Admin gave 10,000 checkels by ${currentUser.username}`,
          coins_amount: 10000,
          amount: 0
        });
      }

      toast({
        title: "Success",
        description: `Gave 10,000 checkels to ${regularUsers.length} users`,
      });

      await loadUsers();
      onDataChange?.();

    } catch (error: any) {
      console.error('Error giving checkels:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to give checkels to users",
        variant: "destructive",
      });
    } finally {
      setProcessingAction(null);
    }
  };

  const giveAllUsers1kChips = async () => {
    try {
      setProcessingAction('give-chips');
      const regularUsers = users.filter(user => !user.is_admin);
      
      for (const user of regularUsers) {
        await addUserBalance(user.id, 0, 1000);
        
        // Add transaction record
        await addTransaction({
          user_id: user.id,
          type: 'topup',
          description: `Testing: Admin gave 1,000 chips by ${currentUser.username}`,
          chips_amount: 1000,
          amount: 1000
        });
      }

      toast({
        title: "Success",
        description: `Gave 1,000 chips to ${regularUsers.length} users`,
      });

      await loadUsers();
      onDataChange?.();

    } catch (error: any) {
      console.error('Error giving chips:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to give chips to users",
        variant: "destructive",
      });
    } finally {
      setProcessingAction(null);
    }
  };

  const resetAllUserBalances = async () => {
    try {
      setProcessingAction('reset-all');
      const regularUsers = users.filter(user => !user.is_admin);
      
      for (const user of regularUsers) {
        await resetUserBalance(user.id);
        
        // Add transaction record
        await addTransaction({
          user_id: user.id,
          type: 'topup',
          description: `Testing: Admin reset balance by ${currentUser.username}`,
          coins_amount: 0,
          chips_amount: 0
        });
      }

      toast({
        title: "Success",
        description: `Reset balances for ${regularUsers.length} users`,
      });

      await loadUsers();
      onDataChange?.();

    } catch (error: any) {
      console.error('Error resetting balances:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to reset user balances",
        variant: "destructive",
      });
    } finally {
      setProcessingAction(null);
    }
  };

  const clearAllLocalStorage = async () => {
    try {
      setProcessingAction('clear-storage');
      
      // Clear localStorage
      localStorage.clear();
      
      toast({
        title: "Storage Cleared",
        description: "All localStorage data has been cleared. Page will reload.",
      });

      // Reload after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 1500);

    } catch (error: any) {
      console.error('Error clearing localStorage:', error);
      toast({
        title: "Error",
        description: "Failed to clear localStorage",
        variant: "destructive",
      });
    } finally {
      setProcessingAction(null);
    }
  };

  const refreshDatabase = async () => {
    try {
      setProcessingAction('refresh-db');
      await loadUsers();
      onDataChange?.();
      
      toast({
        title: "Database Refreshed",
        description: "All data has been reloaded from database",
      });

    } catch (error: any) {
      console.error('Error refreshing database:', error);
      toast({
        title: "Error",
        description: "Failed to refresh database",
        variant: "destructive",
      });
    } finally {
      setProcessingAction(null);
    }
  };

  const isProcessing = (action: string) => processingAction === action;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <TestTube className="w-6 h-6" />
          <span>Testing Tools</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Development Tools */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h3 className="font-bold text-lg mb-3 text-blue-700">Development Tools</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              
              {/* Give Checkels */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    disabled={isLoading || isProcessing('give-checkels')}
                    className="w-full bg-yellow-50 border-yellow-300 text-yellow-700 hover:bg-yellow-100"
                  >
                    {isProcessing('give-checkels') ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Coins className="w-4 h-4 mr-2" />
                    )}
                    Give All 10k Checkels
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="space-y-3">
                    <h4 className="font-medium text-yellow-600 flex items-center">
                      <Coins className="w-4 h-4 mr-2" />
                      Give All Users 10,000 Checkels
                    </h4>
                    <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                      <p className="text-sm text-yellow-800">
                        This will add 10,000 checkels to all non-admin users for testing purposes. 
                        Transaction records will be created.
                      </p>
                      <p className="text-sm text-yellow-700 mt-2 font-medium">
                        Affects: {users.filter(u => !u.is_admin).length} users
                      </p>
                    </div>
                    <Button
                      onClick={giveAllUsers10kCheckels}
                      disabled={isProcessing('give-checkels')}
                      className="w-full bg-yellow-600 hover:bg-yellow-700 text-white"
                    >
                      {isProcessing('give-checkels') ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Coins className="w-4 h-4 mr-2" />
                      )}
                      Confirm Give Checkels
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Give Chips */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    disabled={isLoading || isProcessing('give-chips')}
                    className="w-full bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100"
                  >
                    {isProcessing('give-chips') ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <DollarSign className="w-4 h-4 mr-2" />
                    )}
                    Give All 1k Chips
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="space-y-3">
                    <h4 className="font-medium text-blue-600 flex items-center">
                      <DollarSign className="w-4 h-4 mr-2" />
                      Give All Users 1,000 Chips
                    </h4>
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                      <p className="text-sm text-blue-800">
                        This will add 1,000 chips to all non-admin users for testing casino games. 
                        Transaction records will be created.
                      </p>
                      <p className="text-sm text-blue-700 mt-2 font-medium">
                        Affects: {users.filter(u => !u.is_admin).length} users
                      </p>
                    </div>
                    <Button
                      onClick={giveAllUsers1kChips}
                      disabled={isProcessing('give-chips')}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {isProcessing('give-chips') ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <DollarSign className="w-4 h-4 mr-2" />
                      )}
                      Confirm Give Chips
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Refresh Database */}
              <Button
                onClick={refreshDatabase}
                variant="outline"
                disabled={isProcessing('refresh-db')}
                className="w-full bg-green-50 border-green-300 text-green-700 hover:bg-green-100"
              >
                {isProcessing('refresh-db') ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Database className="w-4 h-4 mr-2" />
                )}
                Refresh Database
              </Button>

              {/* Show Stats */}
              <div className="bg-white p-3 rounded border">
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>Total Users:</span>
                    <span className="font-medium">{users.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Non-Admin:</span>
                    <span className="font-medium">{users.filter(u => !u.is_admin).length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Banned:</span>
                    <span className="font-medium text-red-600">{users.filter(u => u.is_banned).length}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
            <h4 className="text-lg font-semibold text-red-700 mb-2 flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Danger Zone
            </h4>
            <p className="text-sm text-red-600 mb-3">These actions are irreversible and affect all users!</p>
            
            <div className="space-y-3">
              {/* Reset All Balances */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="destructive"
                    disabled={isProcessing('reset-all')}
                    className="w-full"
                  >
                    {isProcessing('reset-all') ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    Reset All User Balances
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="space-y-3">
                    <h4 className="font-medium text-red-600 flex items-center">
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      Reset All User Balances
                    </h4>
                    <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                      <p className="text-sm text-red-800 font-medium">⚠️ Warning: This action cannot be undone!</p>
                      <p className="text-sm text-red-700 mt-1">
                        This will reset ALL non-admin users' checkels and chips to 0. 
                        Transaction records will be created for tracking.
                      </p>
                      <p className="text-sm text-red-700 mt-2 font-medium">
                        Will affect: {users.filter(u => !u.is_admin).length} users
                      </p>
                    </div>
                    <Button
                      onClick={resetAllUserBalances}
                      variant="destructive"
                      disabled={isProcessing('reset-all')}
                      className="w-full"
                    >
                      {isProcessing('reset-all') ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4 mr-2" />
                      )}
                      Confirm Reset All
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Clear localStorage */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="destructive"
                    disabled={isProcessing('clear-storage')}
                    className="w-full"
                  >
                    {isProcessing('clear-storage') ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4 mr-2" />
                    )}
                    Clear ALL LocalStorage Data
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="space-y-3">
                    <h4 className="font-medium text-red-600 flex items-center">
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      Clear All LocalStorage Data
                    </h4>
                    <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                      <p className="text-sm text-red-800 font-medium">⚠️ Warning: This will log you out!</p>
                      <p className="text-sm text-red-700 mt-1">
                        This will clear ALL localStorage data including user sessions, game states, and cached data. 
                        The page will reload and you'll need to log in again.
                      </p>
                    </div>
                    <Button
                      onClick={clearAllLocalStorage}
                      variant="destructive"
                      disabled={isProcessing('clear-storage')}
                      className="w-full"
                    >
                      {isProcessing('clear-storage') ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4 mr-2" />
                      )}
                      Clear All Data
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TestingTools;
