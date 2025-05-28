import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { soundManager } from "@/utils/sounds";
import TransactionHistory from "@/components/TransactionHistory";

interface ColorGameProps {
  user: any;
  onUpdateUser: (updatedUser: any) => void;
  onAddTransaction: (transaction: any) => void;
}

const ColorGame = ({ user, onUpdateUser, onAddTransaction }: ColorGameProps) => {
  const [colorBets, setColorBets] = useState<{[key: string]: number}>({});
  const [isRolling, setIsRolling] = useState(false);
  const [diceResults, setDiceResults] = useState<string[]>([]);
  const [lastResult, setLastResult] = useState<{
    matches: number;
    multiplier: number;
    winnings: number;
    totalBet: number;
  } | null>(null);
  const { toast } = useToast();

  const colors = [
    { name: 'Red', bgColor: 'bg-red-500', textColor: 'text-white', borderColor: 'border-red-600' },
    { name: 'Blue', bgColor: 'bg-blue-500', textColor: 'text-white', borderColor: 'border-blue-600' },
    { name: 'Green', bgColor: 'bg-green-500', textColor: 'text-white', borderColor: 'border-green-600' },
    { name: 'Yellow', bgColor: 'bg-yellow-400', textColor: 'text-black', borderColor: 'border-yellow-500' },
    { name: 'White', bgColor: 'bg-white', textColor: 'text-black', borderColor: 'border-gray-400' },
    { name: 'Violet', bgColor: 'bg-purple-500', textColor: 'text-white', borderColor: 'border-purple-600' }
  ];

  const updateColorBet = (colorName: string, amount: number) => {
    if (isRolling) return;

    setColorBets(prev => {
      const newBets = { ...prev };
      if (amount <= 0) {
        delete newBets[colorName];
      } else {
        newBets[colorName] = Math.min(amount, user.chips);
      }
      return newBets;
    });
  };

  const getTotalBet = () => Object.values(colorBets).reduce((sum, bet) => sum + bet, 0);

  const getSelectedColors = () => Object.keys(colorBets);

  const getColorClass = (colorName: string) => {
    const color = colors.find(c => c.name === colorName);
    return color ? { 
      bg: color.bgColor, 
      text: color.textColor, 
      border: color.borderColor 
    } : { 
      bg: 'bg-gray-500', 
      text: 'text-white', 
      border: 'border-gray-600' 
    };
  };

  const rollDice = async () => {
    const totalBet = getTotalBet();
    const selectedColors = getSelectedColors();

    if (selectedColors.length === 0) {
      toast({
        title: "No Colors Selected",
        description: "Please place bets on at least one color",
        variant: "destructive",
      });
      return;
    }

    if (totalBet > user.chips) {
      toast({
        title: "Insufficient Chips",
        description: "You don't have enough chips for this bet",
        variant: "destructive",
      });
      return;
    }

    soundManager.playSpinSound();
    setIsRolling(true);

    // Deduct bet amount immediately
    const updatedUser = {
      ...user,
      chips: Math.round((user.chips - totalBet) * 100) / 100
    };
    onUpdateUser(updatedUser);

    // Add outflow transaction
    const betDescription = selectedColors.map(color => `${color} (${colorBets[color]} chips)`).join(', ');
    onAddTransaction({
      type: 'bet',
      game: 'Color Game',
      amount: -totalBet,
      description: `Bet on ${betDescription}`,
      timestamp: new Date().toISOString()
    });

    // Simulate rolling animation
    const rollAnimation = setInterval(() => {
      setDiceResults([
        colors[Math.floor(Math.random() * colors.length)].name,
        colors[Math.floor(Math.random() * colors.length)].name,
        colors[Math.floor(Math.random() * colors.length)].name
      ]);
    }, 100);

    // Final results after 2 seconds
    setTimeout(() => {
      clearInterval(rollAnimation);

      // Generate final dice results
      const finalResults = [
        colors[Math.floor(Math.random() * colors.length)].name,
        colors[Math.floor(Math.random() * colors.length)].name,
        colors[Math.floor(Math.random() * colors.length)].name
      ];

      setDiceResults(finalResults);

      // Calculate winnings based on individual color bets
      let totalWinnings = 0;
      let totalMatches = 0;

      selectedColors.forEach(selectedColor => {
        const matches = finalResults.filter(diceColor => diceColor === selectedColor).length;
        if (matches > 0) {
          totalMatches += matches;
          const colorBet = colorBets[selectedColor];
          let multiplier = 0;

          if (matches === 1) multiplier = 2;
          else if (matches === 2) multiplier = 3;
          else if (matches >= 3) multiplier = 4;

          totalWinnings += colorBet * multiplier;
        }
      });

      if (totalWinnings > 0) {
        const finalUser = {
          ...updatedUser,
          chips: Math.round((updatedUser.chips + totalWinnings) * 100) / 100
        };
        onUpdateUser(finalUser);

        // Add inflow transaction
        onAddTransaction({
          type: 'win',
          game: 'Color Game',
          amount: totalWinnings,
          description: `${totalMatches} total matches across selected colors`,
          timestamp: new Date().toISOString()
        });

        toast({
          title: "🎉 You Win!",
          description: `${totalMatches} matches! You won ${totalWinnings} chips!`,
        });
        soundManager.playWinSound();
      } else {
        toast({
          title: "😢 Try Again!",
          description: "No matches this time. Better luck next roll!",
          variant: "destructive",
        });
        soundManager.playLoseSound();
      }

      setLastResult({
        matches: totalMatches,
        multiplier: totalWinnings > 0 ? Math.round((totalWinnings / totalBet) * 100) / 100 : 0,
        winnings: totalWinnings,
        totalBet
      });

      setIsRolling(false);
    }, 2000);
  };

  const clearAllBets = () => {
    if (isRolling) return;
    setColorBets({});
  };

  const maxBetPerColor = () => {
    if (isRolling) return;
    const selectedColors = getSelectedColors();
    if (selectedColors.length === 0) return;

    const maxPerColor = Math.floor(user.chips / selectedColors.length);
    const newBets: {[key: string]: number} = {};
    selectedColors.forEach(color => {
      newBets[color] = maxPerColor;
    });
    setColorBets(newBets);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-2">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center space-x-2 text-2xl">
            <span>🎲</span>
            <span>Color Game (Perya Style)</span>
          </CardTitle>
          <div className="text-sm text-gray-600 space-y-1">
            <p className="font-medium">Select colors to bet on • Roll 3 dice • Match colors to win!</p>
            <p className="text-xs">1 match = 2x • 2 matches = 3x • 3+ matches = 4x</p>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Color Betting Grid */}
          <div className="space-y-3">
            <h3 className="font-medium text-gray-700 text-center">Select Colors to Bet On:</h3>
            <div className="grid grid-cols-2 gap-4">
              {colors.map((color) => {
                const currentBet = colorBets[color.name] || 0;
                const hasBet = currentBet > 0;

                return (
                  <div
                    key={color.name}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      hasBet
                        ? `${color.borderColor} ring-2 ring-gray-400` 
                        : 'border-gray-300'
                    } ${color.bgColor}`}
                  >
                    <div className={`font-bold text-center mb-2 ${color.textColor}`}>
                      {color.name}
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        min="0"
                        max={user.chips}
                        value={currentBet}
                        onChange={(e) => updateColorBet(color.name, parseInt(e.target.value) || 0)}
                        className="flex-1 px-2 py-1 text-sm border rounded text-center"
                        placeholder="0"
                        disabled={isRolling}
                      />
                      <span className={`text-xs ${color.textColor}`}>chips</span>
                    </div>

                    <div className="flex space-x-1 mt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateColorBet(color.name, Math.min(currentBet + 1, user.chips))}
                        disabled={isRolling || currentBet >= user.chips}
                        className="flex-1 h-6 text-xs"
                      >
                        +1
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateColorBet(color.name, Math.min(currentBet + 5, user.chips))}
                        disabled={isRolling || currentBet + 5 > user.chips}
                        className="flex-1 h-6 text-xs"
                      >
                        +5
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateColorBet(color.name, 0)}
                        disabled={isRolling || currentBet === 0}
                        className="flex-1 h-6 text-xs"
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Betting Summary */}
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border">
              <span className="font-medium">Total Bet:</span>
              <span className="font-bold text-lg text-blue-600">{getTotalBet()} chips</span>
            </div>

            <div className="flex space-x-2">
              <Button
                onClick={rollDice}
                className="flex-1 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 py-3"
                disabled={isRolling || getSelectedColors().length === 0 || getTotalBet() > user.chips}
              >
                {isRolling ? 'Rolling...' : '🎲 Roll Dice'}
              </Button>
              <Button
                variant="outline"
                onClick={maxBetPerColor}
                disabled={isRolling || getSelectedColors().length === 0}
                className="px-4"
              >
                Max
              </Button>
              <Button
                variant="outline"
                onClick={clearAllBets}
                disabled={isRolling || Object.keys(colorBets).length === 0}
                className="px-4"
              >
                Clear All
              </Button>
            </div>
          </div>

          {/* Dice Results */}
          {diceResults.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-medium text-gray-700 text-center">Dice Results:</h3>
              <div className="flex justify-center space-x-4">
                {diceResults.map((color, index) => {
                  const colorClass = getColorClass(color);
                  return (
                    <div
                      key={index}
                      className={`w-20 h-20 rounded-lg border-3 ${colorClass.border} flex items-center justify-center ${
                        isRolling ? 'animate-bounce' : ''
                      } ${colorClass.bg} shadow-lg`}
                    >
                      <span className={`font-bold text-sm ${colorClass.text}`}>
                        {color}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Result Display */}
          {lastResult && !isRolling && (
            <div className={`p-4 rounded-lg border-2 ${
              lastResult.winnings > 0 
                ? 'bg-green-50 border-green-300' 
                : 'bg-red-50 border-red-300'
            }`}>
              <div className="text-center space-y-2">
                <p className="font-bold text-lg">
                  {lastResult.winnings > 0 ? '🎉 You Win!' : '😢 Try Again!'}
                </p>
                <div className="text-sm space-y-1">
                  <p>Total Matches: <span className="font-bold">{lastResult.matches}</span></p>
                  <p>Total Bet: <span className="font-bold">{lastResult.totalBet} chips</span></p>
                  {lastResult.winnings > 0 && (
                    <p className="text-green-700 font-bold text-lg">
                      Total Winnings: {lastResult.winnings} chips
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Current Status */}
          <div className="text-center text-sm text-gray-600 space-y-1 p-3 bg-blue-50 rounded-lg">
            <p>Available Chips: <span className="font-bold text-blue-700">{user.chips}</span></p>
            {getSelectedColors().length > 0 && (
              <p>
                Betting on: <span className="font-medium text-blue-700">
                  {getSelectedColors().map(color => `${color} (${colorBets[color]})`).join(', ')}
                </span>
              </p>
            )}
          </div>
        </CardContent>
      </Card>
      <TransactionHistory user={user} filterType="casino" gameFilter="Color Game" />
    </div>
  );
};

export default ColorGame;