import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Transaction {
  type: 'bet' | 'win' | 'refund' | 'conversion';
  game?: string;
  amount: number;
  coinsAmount?: number;
  chipsAmount?: number;
  description: string;
  timestamp: string;
}

interface TransactionHistoryProps {
  user: any;
}

const TransactionHistory = ({ user }: TransactionHistoryProps) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState<'all' | 'casino' | 'conversion'>('all');

  useEffect(() => {
    if (user) {
      // Get conversion transactions
      const conversionTx = JSON.parse(localStorage.getItem(`transactions_${user.username}`) || '[]');

      // Get casino transactions
      const casinoTx = JSON.parse(localStorage.getItem(`casino_transactions_${user.username}`) || '[]');

      // Combine and sort by timestamp
      const allTransactions = [...conversionTx, ...casinoTx].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setTransactions(allTransactions);
    }
  }, [user]);

  const filteredTransactions = transactions.filter(tx => {
    if (filter === 'casino') return tx.game;
    if (filter === 'conversion') return tx.type === 'conversion';
    return true;
  });

  const getTransactionIcon = (transaction: Transaction) => {
    if (transaction.type === 'conversion') return '🔄';
    if (transaction.type === 'bet') return '🎲';
    if (transaction.type === 'win') return '🏆';
    if (transaction.type === 'refund') return '↩️';
    return '💰';
  };

  const getTransactionColor = (transaction: Transaction) => {
    if (transaction.type === 'bet') return 'text-red-600';
    if (transaction.type === 'win' || transaction.type === 'conversion') return 'text-green-600';
    if (transaction.type === 'refund') return 'text-blue-600';
    return 'text-gray-600';
  };

  const getTotalStats = () => {
    const casinoTransactions = transactions.filter(tx => tx.game);
    const totalBets = casinoTransactions
      .filter(tx => tx.type === 'bet')
      .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

    const totalWins = casinoTransactions
      .filter(tx => tx.type === 'win')
      .reduce((sum, tx) => sum + tx.amount, 0);

    const totalConversions = transactions
      .filter(tx => tx.type === 'conversion')
      .reduce((sum, tx) => sum + (tx.chipsAmount || 0), 0);

    return {
      totalBets: Math.round(totalBets * 100) / 100,
      totalWins: Math.round(totalWins * 100) / 100,
      totalConversions: Math.round(totalConversions * 100) / 100,
      netGaming: Math.round((totalWins - totalBets) * 100) / 100
    };
  };

  const stats = getTotalStats();

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="space-y-3">
          <div className="flex items-center space-x-2">
            <span>📊</span>
            <span>Transaction History</span>
          </div>
          <div className="flex space-x-2 overflow-x-auto pb-2">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
              className="whitespace-nowrap"
            >
              All
            </Button>
            <Button
              variant={filter === 'casino' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('casino')}
              className="whitespace-nowrap"
            >
              Casino
            </Button>
            <Button
              variant={filter === 'conversion' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('conversion')}
              className="whitespace-nowrap"
            >
              Conversions
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Stats Summary */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200">
            <p className="text-xs text-gray-600 mb-1">Total Bets</p>
            <p className="font-bold text-sm text-red-600">{stats.totalBets}</p>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
            <p className="text-xs text-gray-600 mb-1">Total Wins</p>
            <p className="font-bold text-sm text-green-600">{stats.totalWins}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-xs text-gray-600 mb-1">Conversions</p>
            <p className="font-bold text-sm text-blue-600">{stats.totalConversions}</p>
          </div>
          <div className={`text-center p-3 rounded-lg border ${
            stats.netGaming >= 0 
              ? 'bg-green-50 border-green-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <p className="text-xs text-gray-600 mb-1">Net Gaming</p>
            <p className={`font-bold text-sm ${
              stats.netGaming >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {stats.netGaming >= 0 ? '+' : ''}{stats.netGaming}
            </p>
          </div>
        </div>

        {/* Transaction List */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredTransactions.map((transaction, index) => (
            <div key={index} className="p-3 bg-white rounded-lg border shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <div className="flex items-start space-x-2 flex-1 min-w-0">
                  <span className="text-lg flex-shrink-0">{getTransactionIcon(transaction)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm text-gray-700 break-words">
                      {transaction.game ? `${transaction.game} - ` : ''}
                      {transaction.description}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(transaction.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-2">
                  {transaction.type === 'conversion' ? (
                    <div>
                      <p className="text-xs text-red-600">-{transaction.coinsAmount?.toFixed(2)} ₵</p>
                      <p className="text-xs text-green-600">+{transaction.chipsAmount?.toFixed(2)} chips</p>
                    </div>
                  ) : (
                    <p className={`font-bold text-sm ${getTransactionColor(transaction)}`}>
                      {transaction.amount > 0 ? '+' : ''}{transaction.amount.toFixed(2)} chips
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
          {filteredTransactions.length === 0 && (
            <div className="text-center py-8">
              <span className="text-6xl mb-4 block">📋</span>
              <p className="text-gray-500">No transactions yet</p>
              <p className="text-sm text-gray-400 mt-1">
                {filter === 'casino' ? 'Play some casino games to see your betting history' :
                 filter === 'conversion' ? 'Convert some ₵ Checkels to see your conversion history' :
                 'Your transaction history will appear here'}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TransactionHistory;