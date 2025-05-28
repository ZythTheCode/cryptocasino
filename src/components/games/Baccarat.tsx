import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { soundManager } from "@/utils/sounds";
import TransactionHistory from "@/components/TransactionHistory";

interface BaccaratProps {
  user: any;
  onUpdateUser: (updatedUser: any) => void;
  onAddTransaction: (transaction: any) => void;
}

const Baccarat = ({ user, onUpdateUser, onAddTransaction }: BaccaratProps) => {
  const [betAmount, setBetAmount] = useState(10);
  const [betType, setBetType] = useState<'player' | 'banker' | 'tie' | null>(null);
  const [gameActive, setGameActive] = useState(false);
  const [isRevealing, setIsRevealing] = useState(isRevealing);
  const [playerCards, setPlayerCards] = useState<number[]>([]);
  const [bankerCards, setBankerCards] = useState<number[]>([]);
  const [playerScore, setPlayerScore] = useState(0);
  const [bankerScore, setBankerScore] = useState(0);
  const [gameResult, setGameResult] = useState<string>('');
  const [revealStep, setRevealStep] = useState(0);
  const { toast } = useToast();

  const getRandomCard = () => Math.floor(Math.random() * 13) + 1;

  const getCardValue = (card: number) => {
    if (card > 10) return 0; // Face cards worth 0
    if (card === 1) return 1; // Ace worth 1
    return card;
  };

  const calculateScore = (cards: number[]) => {
    const total = cards.reduce((sum, card) => sum + getCardValue(card), 0);
    return total % 10; // Baccarat scoring - only last digit matters
  };

  const getCardDisplay = (card: number) => {
    if (card === 1) return 'A';
    if (card === 11) return 'J';
    if (card === 12) return 'Q';
    if (card === 13) return 'K';
    return card.toString();
  };

  const getSuit = (index: number) => {
    const suits = ['♠️', '♥️', '♦️', '♣️'];
    return suits[index % 4];
  };

  const startGame = () => {
    if (!betType || betAmount > user.chips || betAmount < 1) {
      toast({
        title: "Invalid Bet",
        description: "Please select a bet type and valid amount",
        variant: "destructive",
      });
      return;
    }

    // Deduct bet amount
    const updatedUser = {
      ...user,
      chips: Math.round((user.chips - betAmount) * 100) / 100
    };
    onUpdateUser(updatedUser);

    onAddTransaction({
      type: 'bet',
      game: 'Baccarat',
      amount: -betAmount,
      description: `Bet ${betAmount} chips on ${betType}`,
      timestamp: new Date().toISOString()
    });

    setGameActive(true);
    setIsRevealing(true);
    setRevealStep(0);
    setPlayerCards([]);
    setBankerCards([]);
    setPlayerScore(0);
    setBankerScore(0);
    setGameResult('');

    // Generate all cards at once but reveal them step by step
    const allPlayerCards = [getRandomCard(), getRandomCard()];
    const allBankerCards = [getRandomCard(), getRandomCard()];

    // Check if third card is needed
    const playerInitialScore = calculateScore(allPlayerCards);
    const bankerInitialScore = calculateScore(allBankerCards);

    let playerThirdCard = null;
    let bankerThirdCard = null;

    // Player draws third card if score is 0-5
    if (playerInitialScore <= 5) {
      playerThirdCard = getRandomCard();
      allPlayerCards.push(playerThirdCard);
    }

    // Banker drawing rules (simplified)
    if (bankerInitialScore <= 5 && !playerThirdCard) {
      bankerThirdCard = getRandomCard();
      allBankerCards.push(bankerThirdCard);
    } else if (bankerInitialScore <= 2 && playerThirdCard) {
      bankerThirdCard = getRandomCard();
      allBankerCards.push(bankerThirdCard);
    } else if (bankerInitialScore === 3 && playerThirdCard && getCardValue(playerThirdCard) !== 8) {
      bankerThirdCard = getRandomCard();
      allBankerCards.push(bankerThirdCard);
    }

    // Reveal cards step by step
    let step = 0;
    const revealInterval = setInterval(() => {
      step++;
      setRevealStep(step);

      if (step === 1) {
        setPlayerCards([allPlayerCards[0]]);
      } else if (step === 2) {
        setBankerCards([allBankerCards[0]]);
      } else if (step === 3) {
        setPlayerCards([allPlayerCards[0], allPlayerCards[1]]);
        setPlayerScore(calculateScore([allPlayerCards[0], allPlayerCards[1]]));
      } else if (step === 4) {
        setBankerCards([allBankerCards[0], allBankerCards[1]]);
        setBankerScore(calculateScore([allBankerCards[0], allBankerCards[1]]));
      } else if (step === 5 && allPlayerCards[2]) {
        setPlayerCards(allPlayerCards);
        setPlayerScore(calculateScore(allPlayerCards));
      } else if (step === 6 && allBankerCards[2]) {
        setBankerCards(allBankerCards);
        setBankerScore(calculateScore(allBankerCards));
      } else {
        clearInterval(revealInterval);
        finishGame(allPlayerCards, allBankerCards, updatedUser);
      }
    }, 1000);
  };

  const finishGame = (finalPlayerCards: number[], finalBankerCards: number[], currentUser: any) => {
    const finalPlayerScore = calculateScore(finalPlayerCards);
    const finalBankerScore = calculateScore(finalBankerCards);

    setPlayerScore(finalPlayerScore);
    setBankerScore(finalBankerScore);
    setIsRevealing(false);

    let winner = '';
    let payout = 0;

    if (finalPlayerScore > finalBankerScore) {
      winner = 'player';
    } else if (finalBankerScore > finalPlayerScore) {
      winner = 'banker';
    } else {
      winner = 'tie';
    }

    let resultMessage = '';

    if (betType === winner) {
      if (winner === 'player') {
        payout = betAmount * 2; // 1:1 payout
        resultMessage = `Player wins ${finalPlayerScore}-${finalBankerScore}! You won ${payout} chips!`;
      } else if (winner === 'banker') {
        payout = betAmount * 1.95; // 0.95:1 payout (5% commission)
        resultMessage = `Banker wins ${finalBankerScore}-${finalPlayerScore}! You won ${payout} chips!`;
      } else {
        payout = betAmount * 9; // 8:1 payout for tie
        resultMessage = `It's a tie ${finalPlayerScore}-${finalBankerScore}! You won ${payout} chips!`;
      }

      const finalUser = {
        ...currentUser,
        chips: Math.round((currentUser.chips + payout) * 100) / 100
      };
      onUpdateUser(finalUser);

      onAddTransaction({
        type: 'win',
        game: 'Baccarat',
        amount: payout,
        description: resultMessage,
        timestamp: new Date().toISOString()
      });

      toast({
        title: "🎉 You Win!",
        description: resultMessage,
      });
      soundManager.playWinSound();
    } else {
      resultMessage = `${winner === 'player' ? 'Player' : winner === 'banker' ? 'Banker' : 'Tie'} wins! Better luck next time!`;
      toast({
        title: "😢 You Lose",
        description: resultMessage,
        variant: "destructive",
      });
      soundManager.playLoseSound();
    }

    setGameResult(resultMessage);
    setGameActive(false);
  };

  const resetGame = () => {
    setGameActive(false);
    setIsRevealing(false);
    setPlayerCards([]);
    setBankerCards([]);
    setPlayerScore(0);
    setBankerScore(0);
    setGameResult('');
    setRevealStep(0);
    setBetType(null);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center justify-center space-x-2">
            <span>🃏</span>
            <span>Baccarat</span>
            <span>🎴</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {!gameActive ? (
            <div className="space-y-4">
              {/* Bet Selection */}
              <div className="space-y-3">
                <h3 className="font-medium text-center">Choose Your Bet:</h3>
                <div className="grid grid-cols-3 gap-3">
                  <Button
                    variant={betType === 'player' ? 'default' : 'outline'}
                    onClick={() => setBetType('player')}
                    className="h-16 flex flex-col space-y-1"
                  >
                    <span className="text-lg">👤</span>
                    <span>Player</span>
                    <span className="text-xs">1:1</span>
                  </Button>
                  <Button
                    variant={betType === 'banker' ? 'default' : 'outline'}
                    onClick={() => setBetType('banker')}
                    className="h-16 flex flex-col space-y-1"
                  >
                    <span className="text-lg">🏦</span>
                    <span>Banker</span>
                    <span className="text-xs">0.95:1</span>
                  </Button>
                  <Button
                    variant={betType === 'tie' ? 'default' : 'outline'}
                    onClick={() => setBetType('tie')}
                    className="h-16 flex flex-col space-y-1"
                  >
                    <span className="text-lg">🤝</span>
                    <span>Tie</span>
                    <span className="text-xs">8:1</span>
                  </Button>
                </div>
              </div>

              {/* Bet Amount */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-center">Bet Amount:</label>
                <div className="flex space-x-2 max-w-md mx-auto">
                  <input
                    type="number"
                    min="1"
                    max={user.chips}
                    value={betAmount}
                    onChange={(e) => setBetAmount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="flex-1 px-3 py-2 border rounded-lg text-center"
                  />
                  <Button
                    variant="outline"
                    onClick={() => setBetAmount(Math.floor(user.chips / 4))}
                    disabled={user.chips < 4}
                  >
                    25%
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setBetAmount(Math.floor(user.chips / 2))}
                    disabled={user.chips < 2}
                  >
                    50%
                  </Button>
                </div>
              </div>

              <Button 
                onClick={startGame} 
                className="w-full py-3 text-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700" 
                disabled={!betType || betAmount > user.chips || betAmount < 1}
              >
                Deal Cards ({betAmount} chips)
              </Button>

              {gameResult && (
                <div className="p-4 bg-gray-100 rounded-lg text-center">
                  <p className="font-medium">{gameResult}</p>
                  <Button onClick={resetGame} className="mt-2">
                    Play Again
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Game Table */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Player Side */}
                <div className="space-y-3">
                  <h3 className="font-bold text-center text-blue-600">Player</h3>
                  <div className="min-h-[100px] flex justify-center items-center space-x-2">
                    {playerCards.map((card, index) => (
                      <div
                        key={index}
                        className="w-16 h-24 bg-white border-2 border-gray-300 rounded-lg flex flex-col items-center justify-center font-bold shadow-lg transform transition-transform duration-300 hover:scale-105"
                      >
                        <span className="text-lg">{getCardDisplay(card)}</span>
                        <span className="text-sm">{getSuit(index)}</span>
                      </div>
                    ))}
                    {isRevealing && revealStep < 3 && (
                      <div className="w-16 h-24 bg-blue-500 border-2 border-blue-600 rounded-lg flex items-center justify-center animate-pulse">
                        <span className="text-white">?</span>
                      </div>
                    )}
                  </div>
                  <div className="text-center">
                    <span className="text-xl font-bold">Score: {playerScore}</span>
                  </div>
                </div>

                {/* Banker Side */}
                <div className="space-y-3">
                  <h3 className="font-bold text-center text-red-600">Banker</h3>
                  <div className="min-h-[100px] flex justify-center items-center space-x-2">
                    {bankerCards.map((card, index) => (
                      <div
                        key={index}
                        className="w-16 h-24 bg-white border-2 border-gray-300 rounded-lg flex flex-col items-center justify-center font-bold shadow-lg transform transition-transform duration-300 hover:scale-105"
                      >
                        <span className="text-lg">{getCardDisplay(card)}</span>
                        <span className="text-sm">{getSuit(index)}</span>
                      </div>
                    ))}
                    {isRevealing && revealStep < 4 && (
                      <div className="w-16 h-24 bg-red-500 border-2 border-red-600 rounded-lg flex items-center justify-center animate-pulse">
                        <span className="text-white">?</span>
                      </div>
                    )}
                  </div>
                  <div className="text-center">
                    <span className="text-xl font-bold">Score: {bankerScore}</span>
                  </div>
                </div>
              </div>

              {/* Current Bet Display */}
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-lg">
                  <span className="font-medium">Your Bet:</span> {betAmount} chips on{' '}
                  <span className="font-bold capitalize text-purple-600">{betType}</span>
                </p>
                {isRevealing && (
                  <p className="text-sm text-gray-600 mt-2">Revealing cards...</p>
                )}
              </div>
            </div>
          )}

          {/* Available Chips */}
          <div className="text-center text-sm text-gray-600 p-3 bg-blue-50 rounded-lg">
            Available Chips: <span className="font-bold text-blue-700">{user.chips}</span>
          </div>
        </CardContent>
      </Card>
      <TransactionHistory user={user} filterType="casino" gameFilter="Baccarat" />
    </div>
  );
};

export default Baccarat;