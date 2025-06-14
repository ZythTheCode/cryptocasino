
import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign } from "lucide-react";
import { getUserTransactions } from "@/lib/database";
import { supabase } from '@/lib/supabase';
import { useToast } from "@/hooks/use-toast";

interface TransactionHistoryProps {
  user: any;
  filterType?: 'casino' | 'wallet' | 'tree' | 'all';
  gameFilter?: string;
  maxItems?: number;
}

const TransactionHistory = ({ user, filterType = 'all', gameFilter, maxItems = 50 }: TransactionHistoryProps) => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const filterTransactions = (transactions: any[], type: string, game?: string) => {
    let filtered = transactions;
    
    switch (type) {
      case 'casino':
        filtered = transactions.filter((tx: any) => 
          tx.game || ['bet', 'win', 'loss', 'refund'].includes(tx.type)
        );
        break;
      case 'wallet':
        filtered = transactions.filter((tx: any) => 
          ['conversion', 'chip_conversion', 'topup', 'withdrawal'].includes(tx.type)
        );
        break;
      case 'tree':
        filtered = transactions.filter((tx: any) => 
          tx.description?.includes('tree') || 
          tx.description?.includes('Claimed Checkels') ||
          tx.description?.includes('Upgraded tree') ||
          tx.description?.includes('booster') ||
          tx.description?.includes('Purchased')
        );
        break;
      default:
        filtered = transactions;
    }

    // Apply game filter if specified
    if (game) {
      filtered = filtered.filter((tx: any) => tx.game === game);
    }

    return filtered;
  };

  const loadTransactions = async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      const dbTransactions = await getUserTransactions(user.id, maxItems);

      // Filter transactions based on type and game
      const filteredTransactions = filterTransactions(dbTransactions, filterType, gameFilter);

      // Format transactions for display
      const formattedTransactions = filteredTransactions.map((tx: any) => ({
        ...tx,
        timestamp: new Date(tx.created_at).getTime(),
        description: (tx.description || `${tx.type} transaction`).replace(/\s*-\s*null\s*$/i, '')
      }));

      setTransactions(formattedTransactions);
    } catch (error) {
      console.error('Error loading transactions from Supabase:', error);
      toast({
        title: "Warning",
        description: "Failed to load transaction history",
        variant: "destructive",
      });
      setTransactions([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      loadTransactions();
    }

    // Set up real-time subscription for immediate updates only
    if (user?.id && supabase) {
      const subscription = supabase
        .channel(`transactions_realtime_${filterType}_${user.id}_${Date.now()}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: `user_id=eq.${user.id}`
        }, (payload) => {
          console.log(`${filterType} transaction change detected:`, payload);

          if (payload.eventType === 'INSERT' && payload.new) {
            // Check if this transaction should be included in our filter
            const shouldInclude = filterTransactions([payload.new], filterType, gameFilter).length > 0;

            if (shouldInclude) {
              const newTransaction = {
                ...payload.new,
                timestamp: new Date(payload.new.created_at).getTime(),
                description: payload.new.description || `${payload.new.type} transaction`
              };

              setTransactions(prev => [newTransaction, ...prev].slice(0, maxItems));
            }
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            // Check if this transaction should be included in our filter
            const shouldInclude = filterTransactions([payload.new], filterType, gameFilter).length > 0;

            if (shouldInclude) {
              setTransactions(prev => 
                prev.map(tx => tx.id === payload.new.id ? {
                  ...tx,
                  ...payload.new,
                  timestamp: new Date(payload.new.created_at).getTime(),
                  description: payload.new.description || `${payload.new.type} transaction`
                } : tx)
              );
            }
          }
        })
        .subscribe();

      return () => {
        supabase.removeChannel(subscription);
      };
    }
  }, [user?.id, filterType, gameFilter, maxItems]);

  const formatAmount = (transaction: any) => {
    if (transaction.type === 'conversion' && transaction.coins_amount && transaction.chips_amount) {
      return (
        <div>
          <p className="text-xs text-red-600">-{Math.abs(transaction.coins_amount || 0).toFixed(2)} ₵</p>
          <p className="text-xs text-green-600">+{Math.abs(transaction.chips_amount || 0).toFixed(2)} chips</p>
        </div>
      );
    }

    const amount = transaction.coins_amount || transaction.chips_amount || transaction.amount || 0;
    const currency = transaction.coins_amount ? '₵ Checkels' : transaction.chips_amount ? 'Chips' : (transaction.game ? 'Chips' : '₵ Checkels');

    return (
      <div className={`font-bold ${amount >= 0 ? "text-green-600" : "text-red-600"}`}>
        {amount >= 0 ? "+" : ""}
        {Number(amount).toFixed(4)} {currency}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <DollarSign className="w-6 h-6 text-green-500" />
          <span>{gameFilter ? `${gameFilter} History` : 'Transaction History'}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {isLoading ? (
            <div className="text-center py-4">
              <span className="text-gray-500 text-sm">Loading transactions...</span>
            </div>
          ) : (
            <>
              {transactions.slice(0, maxItems).map((transaction, index) => (
                <div
                  key={`${transaction.id || index}-${transaction.timestamp}`}
                  className="p-2 bg-white rounded border text-sm flex justify-between items-center"
                >
                  <div className="flex-1">
                    <p className="font-medium">
                      {transaction.game && transaction.game !== 'null' && `${transaction.game} - `}
                      {transaction.description}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(transaction.created_at || transaction.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    {formatAmount(transaction)}
                  </div>
                </div>
              ))}
              {transactions.length === 0 && (
                <p className="text-center text-gray-500 text-sm py-4">
                  No transactions yet
                </p>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TransactionHistory;
