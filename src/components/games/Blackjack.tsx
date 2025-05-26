
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface BlackjackProps {
  user: any;
  onUpdateUser: (updatedUser: any) => void;
  onAddTransaction: (transaction: any) => void;
}

interface PlayingCard {
  suit: string;
  value: string;
  numValue: number;
}

const Blackjack = ({ user, onUpdateUser, onAddTransaction }: BlackjackProps) => {
  const [betAmount, setBetAmount] = useState(1);
  const [gameState, setGameState] = useState<'betting' | 'playing' | 'finished'>('betting');
  const [playerHand, setPlayerHand] = useState<PlayingCard[]>([]);
  const [dealerHand, setDealerHand] = useState<PlayingCard[]>([]);
  const [playerScore, setPlayerScore] = useState(0);
  const [dealerScore, setDealerScore] = useState(0);
  const [gameResult, setGameResult] = useState<string>('');
  const [deck, setDeck] = useState<PlayingCard[]>([]);
  const { toast } = useToast();

  const suits = ['♠️', '♥️', '♦️', '♣️'];
  const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

  const createDeck = (): PlayingCard[] => {
    const newDeck: PlayingCard[] = [];
    suits.forEach(suit => {
      values.forEach(value => {
        let numValue = parseInt(value);
        if (value === 'A') numValue = 11;
        else if (['J', 'Q', 'K'].includes(value)) numValue = 10;
        
        newDeck.push({ suit, value, numValue });
      });
    });
    return shuffleDeck(newDeck);
  };

  const shuffleDeck = (deck: PlayingCard[]): PlayingCard[] => {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const calculateScore = (hand: PlayingCard[]): number => {
    let score = 0;
    let aces = 0;
    
    hand.forEach(card => {
      if (card.value === 'A') {
        aces++;
        score += 11;
      } else {
        score += card.numValue;
      }
    });
    
    while (score > 21 && aces > 0) {
      score -= 10;
      aces--;
    }
    
    return score;
  };

  const dealCard = (currentDeck: PlayingCard[]): { card: PlayingCard; newDeck: PlayingCard[] } => {
    const newDeck = [...currentDeck];
    const card = newDeck.pop()!;
    return { card, newDeck };
  };

  const startGame = () => {
    if (betAmount > user.chips || betAmount < 1) {
      toast({
        title: "Invalid bet",
        description: "Please enter a valid bet amount",
        variant: "destructive",
      });
      return;
    }

    // Deduct bet amount
    const updatedUser = { ...user, chips: user.chips - betAmount };
    onUpdateUser(updatedUser);
    
    // Add bet transaction
    onAddTransaction({
      type: 'bet',
      game: 'Blackjack',
      amount: -betAmount,
      description: `Bet ${betAmount} chips on Blackjack`,
      timestamp: new Date().toISOString()
    });

    // Create and shuffle deck
    const newDeck = createDeck();
    let currentDeck = newDeck;
    
    // Deal initial cards
    const { card: playerCard1, newDeck: deck1 } = dealCard(currentDeck);
    const { card: dealerCard1, newDeck: deck2 } = dealCard(deck1);
    const { card: playerCard2, newDeck: deck3 } = dealCard(deck2);
    const { card: dealerCard2, newDeck: finalDeck } = dealCard(deck3);
    
    const newPlayerHand = [playerCard1, playerCard2];
    const newDealerHand = [dealerCard1, dealerCard2];
    
    setPlayerHand(newPlayerHand);
    setDealerHand(newDealerHand);
    setDeck(finalDeck);
    
    const newPlayerScore = calculateScore(newPlayerHand);
    const newDealerScore = calculateScore(newDealerHand);
    
    setPlayerScore(newPlayerScore);
    setDealerScore(newDealerScore);
    
    // Check for immediate blackjack
    if (newPlayerScore === 21) {
      if (newDealerScore === 21) {
        endGame('Push! Both have Blackjack', betAmount);
      } else {
        endGame('Blackjack! You win!', betAmount * 2.5);
      }
    } else {
      setGameState('playing');
    }
  };

  const hit = () => {
    const { card, newDeck } = dealCard(deck);
    const newPlayerHand = [...playerHand, card];
    const newScore = calculateScore(newPlayerHand);
    
    setPlayerHand(newPlayerHand);
    setPlayerScore(newScore);
    setDeck(newDeck);
    
    if (newScore > 21) {
      endGame('Bust! You lose!', 0);
    }
  };

  const stand = () => {
    let currentDealerHand = [...dealerHand];
    let currentDeck = [...deck];
    let currentDealerScore = dealerScore;
    
    // Dealer hits on 16 and stands on 17
    while (currentDealerScore < 17) {
      const { card, newDeck } = dealCard(currentDeck);
      currentDealerHand.push(card);
      currentDealerScore = calculateScore(currentDealerHand);
      currentDeck = newDeck;
    }
    
    setDealerHand(currentDealerHand);
    setDealerScore(currentDealerScore);
    
    // Determine winner
    if (currentDealerScore > 21) {
      endGame('Dealer busts! You win!', betAmount * 2);
    } else if (currentDealerScore > playerScore) {
      endGame('Dealer wins!', 0);
    } else if (playerScore > currentDealerScore) {
      endGame('You win!', betAmount * 2);
    } else {
      endGame('Push! It\'s a tie!', betAmount);
    }
  };

  const endGame = (result: string, winnings: number) => {
    setGameResult(result);
    setGameState('finished');
    
    if (winnings > 0) {
      const updatedUser = { ...user, chips: user.chips + winnings };
      onUpdateUser(updatedUser);
      
      if (winnings > betAmount) {
        onAddTransaction({
          type: 'win',
          game: 'Blackjack',
          amount: winnings - betAmount,
          description: `Won ${winnings - betAmount} chips in Blackjack`,
          timestamp: new Date().toISOString()
        });
      } else {
        onAddTransaction({
          type: 'refund',
          game: 'Blackjack',
          amount: winnings,
          description: `Push - refunded ${winnings} chips in Blackjack`,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    toast({
      title: result,
      description: winnings > 0 ? `You won ${winnings} chips!` : "Better luck next time!",
      variant: winnings > 0 ? "default" : "destructive",
    });
  };

  const resetGame = () => {
    setGameState('betting');
    setPlayerHand([]);
    setDealerHand([]);
    setPlayerScore(0);
    setDealerScore(0);
    setGameResult('');
    setDeck([]);
  };

  const renderCard = (card: PlayingCard, hidden: boolean = false) => {
    if (hidden) {
      return (
        <div className="w-16 h-24 bg-blue-600 border-2 border-blue-800 rounded-lg flex items-center justify-center text-white font-bold">
          ?
        </div>
      );
    }
    
    const isRed = card.suit === '♥️' || card.suit === '♦️';
    return (
      <div className={`w-16 h-24 bg-white border-2 border-gray-300 rounded-lg flex flex-col items-center justify-center ${isRed ? 'text-red-600' : 'text-black'} font-bold text-sm`}>
        <div className="text-lg">{card.value}</div>
        <div className="text-xl">{card.suit}</div>
      </div>
    );
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="text-center flex items-center justify-center space-x-2">
          <span className="text-2xl">♠️</span>
          <span>Blackjack</span>
          <span className="text-2xl">♥️</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {gameState === 'betting' && (
            <div className="text-center space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-lg font-semibold mb-2">Place Your Bet</p>
                <p className="text-sm text-gray-600 mb-4">Get as close to 21 as possible without going over!</p>
                <div className="flex items-center justify-center space-x-4">
                  <label className="font-medium">Bet Amount:</label>
                  <input
                    type="number"
                    min="1"
                    max={user?.chips || 0}
                    value={betAmount}
                    onChange={(e) => setBetAmount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-24 px-3 py-2 border rounded-lg text-center"
                  />
                  <span className="text-sm text-gray-600">chips</span>
                </div>
              </div>
              <Button 
                onClick={startGame} 
                className="px-8 py-3 text-lg bg-green-600 hover:bg-green-700"
                disabled={!user?.chips || betAmount > user.chips}
              >
                Deal Cards
              </Button>
            </div>
          )}

          {(gameState === 'playing' || gameState === 'finished') && (
            <div className="space-y-6">
              {/* Dealer's Hand */}
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">Dealer's Hand {gameState === 'finished' && `(${dealerScore})`}</h3>
                <div className="flex justify-center space-x-2 mb-2">
                  {dealerHand.map((card, index) => (
                    <div key={index}>
                      {renderCard(card, gameState === 'playing' && index === 1)}
                    </div>
                  ))}
                </div>
                {gameState === 'playing' && (
                  <p className="text-sm text-gray-600">Showing: {dealerHand[0]?.numValue || 0}</p>
                )}
              </div>

              {/* Player's Hand */}
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">Your Hand ({playerScore})</h3>
                <div className="flex justify-center space-x-2 mb-4">
                  {playerHand.map((card, index) => (
                    <div key={index}>
                      {renderCard(card)}
                    </div>
                  ))}
                </div>
              </div>

              {/* Game Controls */}
              {gameState === 'playing' && (
                <div className="flex justify-center space-x-4">
                  <Button onClick={hit} className="px-6 py-2 bg-blue-600 hover:bg-blue-700">
                    Hit
                  </Button>
                  <Button onClick={stand} className="px-6 py-2 bg-orange-600 hover:bg-orange-700">
                    Stand
                  </Button>
                </div>
              )}

              {gameState === 'finished' && (
                <div className="text-center space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-xl font-bold mb-2">{gameResult}</h3>
                    <p className="text-sm text-gray-600">
                      Your Score: {playerScore} | Dealer Score: {dealerScore}
                    </p>
                  </div>
                  <Button onClick={resetGame} className="px-8 py-3 text-lg bg-green-600 hover:bg-green-700">
                    Play Again
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Game Rules */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">How to Play:</h4>
            <ul className="text-sm space-y-1 text-gray-700">
              <li>• Get as close to 21 as possible without going over</li>
              <li>• Aces count as 1 or 11, face cards count as 10</li>
              <li>• Dealer must hit on 16 and stand on 17</li>
              <li>• Blackjack (21 with 2 cards) pays 2.5:1</li>
              <li>• Regular wins pay 2:1</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default Blackjack;
