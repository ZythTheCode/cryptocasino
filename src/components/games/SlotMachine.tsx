import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { soundManager } from "@/utils/sounds";
import TransactionHistory from "@/components/TransactionHistory";

interface SlotMachineProps {
  user: any;
  onUpdateUser: (updatedUser: any) => void;
  onAddTransaction: (transaction: any) => void;
}

const SlotMachine = ({ user, onUpdateUser, onAddTransaction }: SlotMachineProps) => {
  const { toast } = useToast();
  const [betAmount, setBetAmount] = useState(10);
  const [isSpinning, setIsSpinning] = useState(false);
  const [reels, setReels] = useState(['🍒', '🍒', '🍒']);


  const symbols = ['🍒', '🍋', '🍊', '🍇', '⭐', '💎'];
  const payouts = {
    '💎💎💎': 100,
    '⭐⭐⭐': 50,
    '🍇🍇🍇': 25,
    '🍊🍊🍊': 15,
    '🍋🍋🍋': 10,
    '🍒🍒🍒': 5,
    '💎💎': 3,
    '⭐⭐': 2,
    '🍒🍒': 1.5
  };

  const handleSpin = async () => {
    if (betAmount <= 0 || betAmount > user.chips) {
      toast({
        title: "Invalid Bet",
        description: "Please enter a valid bet amount",
        variant: "destructive",
      });
      return;
    }

    soundManager.playSpinSound();
    setIsSpinning(true);

    // Deduct bet amount
    const updatedUser = {
      ...user,
      chips: Math.round((user.chips - betAmount) * 100) / 100
    };
    onUpdateUser(updatedUser);

    // Add outflow transaction
    onAddTransaction({
      type: 'bet',
      game: 'Slot Machine',
      amount: -betAmount,
      description: 'Slot spin',
      timestamp: new Date().toISOString()
    });

    // Simulate spinning animation
    const spinDuration = 2000;
    const interval = setInterval(() => {
      setReels([
        symbols[Math.floor(Math.random() * symbols.length)],
        symbols[Math.floor(Math.random() * symbols.length)],
        symbols[Math.floor(Math.random() * symbols.length)]
      ]);
    }, 100);

    setTimeout(() => {
      clearInterval(interval);

      // Final result
      const finalReels = [
        symbols[Math.floor(Math.random() * symbols.length)],
        symbols[Math.floor(Math.random() * symbols.length)],
        symbols[Math.floor(Math.random() * symbols.length)]
      ];
      setReels(finalReels);

      // Check for wins
      const reelString = finalReels.join('');
      let winMultiplier = 0;
      let winDescription = '';

      // Check for exact matches
      if (payouts[reelString as keyof typeof payouts]) {
        winMultiplier = payouts[reelString as keyof typeof payouts];
        winDescription = `Three ${finalReels[0]}`;
      } else {
        // Check for pairs
        const firstTwo = finalReels.slice(0, 2).join('');
        if (payouts[firstTwo as keyof typeof payouts]) {
          winMultiplier = payouts[firstTwo as keyof typeof payouts];
          winDescription = `Two ${finalReels[0]}`;
        }
      }

      if (winMultiplier > 0) {
        const winAmount = betAmount * winMultiplier;
        const finalUser = {
          ...updatedUser,
          chips: Math.round((updatedUser.chips + winAmount) * 100) / 100
        };
        onUpdateUser(finalUser);

        // Add inflow transaction
        onAddTransaction({
          type: 'win',
          game: 'Slot Machine',
          amount: winAmount,
          description: `${winDescription} (${winMultiplier}x)`,
          timestamp: new Date().toISOString()
        });

        toast({
          title: "Winner!",
          description: `${winDescription}! You won ${winAmount} chips!`,
        });
        soundManager.playWinSound();
      } else {
        toast({
          title: "No Win",
          description: "Better luck next spin!",
          variant: "destructive",
        });
        soundManager.playLoseSound();
      }

      setIsSpinning(false);
    }, spinDuration);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center justify-center space-x-2">
            <span>🎰</span>
            <span>Slot Machine</span>
            <span>🎰</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <div className="flex justify-center space-x-2 mb-4 p-4 bg-black rounded-lg">
              {reels.map((symbol, index) => (
                <div
                  key={index}
                  className={`w-16 h-16 bg-white rounded border-2 flex items-center justify-center text-3xl ${
                    isSpinning ? 'animate-pulse' : ''
                  }`}
                >
                  {symbol}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">Bet Amount:</label>
            <div className="flex space-x-2">
              <input
                type="number"
                min="1"
                max={user.chips}
                value={betAmount}
                onChange={(e) => setBetAmount(Math.max(1, parseInt(e.target.value) || 1))}
                className="flex-1 px-3 py-2 border rounded-lg"
                disabled={isSpinning}
              />
              <Button
                variant="outline"
                onClick={() => setBetAmount(Math.floor(user.chips / 4))}
                disabled={isSpinning}
              >
                25%
              </Button>
              <Button
                variant="outline"
                onClick={() => setBetAmount(Math.floor(user.chips / 2))}
                disabled={isSpinning}
              >
                50%
              </Button>
            </div>
          </div>

          <Button
            onClick={handleSpin}
            className="w-full"
            disabled={isSpinning || betAmount > user.chips}
          >
            {isSpinning ? 'Spinning...' : `Spin for ${betAmount} Chips`}
          </Button>

          <div className="text-center text-sm text-gray-600">
            Available Chips: {user.chips}
          </div>

          <div className="text-xs text-gray-500 space-y-1">
            <p className="font-medium">Payouts:</p>
            <div className="grid grid-cols-2 gap-1">
              <span>💎💎💎: 100x</span>
              <span>⭐⭐⭐: 50x</span>
              <span>🍇🍇🍇: 25x</span>
              <span>🍊🍊🍊: 15x</span>
              <span>🍋🍋🍋: 10x</span>
              <span>🍒🍒🍒: 5x</span>
              <span>💎💎: 3x</span>
              <span>⭐⭐: 2x</span>
              <span>🍒🍒: 1.5x</span>
            </div>
          </div>
        </CardContent>
      </Card>
      <TransactionHistory user={user} filterType="casino" gameFilter="Slot Machine" />
    </div>
  );
};

export default SlotMachine;