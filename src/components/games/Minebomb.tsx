
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface MinebombProps {
  user: any;
  onUpdateUser: (updatedUser: any) => void;
  onAddTransaction: (transaction: any) => void;
}

interface Tile {
  id: number;
  isBomb: boolean;
  isRevealed: boolean;
  row: number;
  col: number;
}

const Minebomb = ({ user, onUpdateUser, onAddTransaction }: MinebombProps) => {
  const [betAmount, setBetAmount] = useState(1);
  const [bombCount, setBombCount] = useState(3);
  const [gameState, setGameState] = useState<'betting' | 'playing' | 'ended'>('betting');
  const [grid, setGrid] = useState<Tile[]>([]);
  const [revealedTiles, setRevealedTiles] = useState(0);
  const [currentMultiplier, setCurrentMultiplier] = useState(1.0);
  const [gameResult, setGameResult] = useState<'won' | 'lost' | null>(null);
  const { toast } = useToast();

  // Multiplier calculations based on bomb count and revealed tiles
  const getMultiplierIncrease = (bombs: number, revealed: number): number => {
    const safeTiles = 25 - bombs;
    const baseMultiplier = bombs === 3 ? 0.12 : bombs === 5 ? 0.20 : 0.35;
    return 1 + (baseMultiplier * revealed * (bombs / 3));
  };

  // Initialize 5x5 grid
  const initializeGrid = (): Tile[] => {
    const newGrid: Tile[] = [];
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 5; col++) {
        newGrid.push({
          id: row * 5 + col,
          isBomb: false,
          isRevealed: false,
          row,
          col
        });
      }
    }
    return newGrid;
  };

  // Place bombs randomly
  const placeBombs = (grid: Tile[], bombCount: number): Tile[] => {
    const newGrid = [...grid];
    const bombPositions = new Set<number>();
    
    while (bombPositions.size < bombCount) {
      const randomIndex = Math.floor(Math.random() * 25);
      bombPositions.add(randomIndex);
    }
    
    bombPositions.forEach(index => {
      newGrid[index].isBomb = true;
    });
    
    return newGrid;
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
      game: 'Minebomb',
      amount: -betAmount,
      description: `Bet ${betAmount} chips on Minebomb (${bombCount} bombs)`,
      timestamp: new Date().toISOString()
    });

    // Initialize game
    const initialGrid = initializeGrid();
    const gameGrid = placeBombs(initialGrid, bombCount);
    
    setGrid(gameGrid);
    setGameState('playing');
    setRevealedTiles(0);
    setCurrentMultiplier(1.0);
    setGameResult(null);
  };

  const handleTileClick = (tileId: number) => {
    if (gameState !== 'playing') return;
    
    const clickedTile = grid[tileId];
    if (clickedTile.isRevealed) return;

    const newGrid = [...grid];
    newGrid[tileId].isRevealed = true;
    setGrid(newGrid);

    if (clickedTile.isBomb) {
      // Hit a bomb - game over
      setGameState('ended');
      setGameResult('lost');
      
      // Reveal all bombs
      const revealedGrid = newGrid.map(tile => ({
        ...tile,
        isRevealed: tile.isBomb ? true : tile.isRevealed
      }));
      setGrid(revealedGrid);
      
      toast({
        title: "💥 BOOM!",
        description: "You hit a bomb! Better luck next time!",
        variant: "destructive",
      });
    } else {
      // Safe tile
      const newRevealedCount = revealedTiles + 1;
      setRevealedTiles(newRevealedCount);
      
      const newMultiplier = getMultiplierIncrease(bombCount, newRevealedCount);
      setCurrentMultiplier(newMultiplier);
      
      // Check if all safe tiles are revealed (auto win)
      const totalSafeTiles = 25 - bombCount;
      if (newRevealedCount === totalSafeTiles) {
        cashOut(newMultiplier);
      }
    }
  };

  const cashOut = (multiplier: number = currentMultiplier) => {
    if (gameState !== 'playing') return;
    
    const winnings = Math.round(betAmount * multiplier * 100) / 100;
    
    setGameState('ended');
    setGameResult('won');
    
    // Add winnings to user
    const updatedUser = { ...user, chips: user.chips + winnings };
    onUpdateUser(updatedUser);
    
    // Add win transaction
    onAddTransaction({
      type: 'win',
      game: 'Minebomb',
      amount: winnings,
      description: `Won ${winnings} chips in Minebomb (${multiplier.toFixed(2)}x multiplier)`,
      timestamp: new Date().toISOString()
    });
    
    toast({
      title: "💰 Cashed Out!",
      description: `You won ${winnings} chips with ${multiplier.toFixed(2)}x multiplier!`,
    });
  };

  const resetGame = () => {
    setGameState('betting');
    setGrid([]);
    setRevealedTiles(0);
    setCurrentMultiplier(1.0);
    setGameResult(null);
  };

  const renderTile = (tile: Tile) => {
    let tileClass = "w-12 h-12 border-2 border-gray-300 rounded-lg flex items-center justify-center cursor-pointer transition-all text-lg font-bold ";
    
    if (gameState === 'betting') {
      tileClass += "bg-gray-200 hover:bg-gray-300";
    } else if (tile.isRevealed) {
      if (tile.isBomb) {
        tileClass += "bg-red-500 text-white border-red-600";
      } else {
        tileClass += "bg-green-400 text-white border-green-500";
      }
    } else {
      tileClass += gameState === 'playing' 
        ? "bg-blue-500 hover:bg-blue-600 text-white border-blue-600" 
        : "bg-gray-400 text-gray-600";
    }

    return (
      <div
        key={tile.id}
        className={tileClass}
        onClick={() => handleTileClick(tile.id)}
      >
        {tile.isRevealed && (tile.isBomb ? '💣' : '💎')}
      </div>
    );
  };

  return (
    <Card className="w-full max-w-6xl mx-auto">
      <CardHeader>
        <CardTitle className="text-center flex items-center justify-center space-x-2">
          <span className="text-2xl">💣</span>
          <span>Minebomb</span>
          <span className="text-2xl">💎</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Game Controls */}
          {gameState === 'betting' && (
            <div className="text-center space-y-4">
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold mb-4">Setup Your Game</h3>
                
                {/* Bet Amount */}
                <div className="flex items-center justify-center space-x-4 mb-4">
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

                {/* Bomb Count Selection */}
                <div className="mb-4">
                  <label className="font-medium block mb-2">Number of Bombs:</label>
                  <div className="flex justify-center space-x-3">
                    {[3, 5, 10].map(count => (
                      <Button
                        key={count}
                        variant={bombCount === count ? 'default' : 'outline'}
                        onClick={() => setBombCount(count)}
                        className="flex flex-col h-16 w-20"
                      >
                        <span className="text-lg">💣</span>
                        <span>{count}</span>
                        <span className="text-xs">
                          {count === 3 ? 'Low' : count === 5 ? 'Med' : 'High'}
                        </span>
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
              
              <Button 
                onClick={startGame} 
                className="px-8 py-3 text-lg bg-green-600 hover:bg-green-700"
                disabled={!user?.chips || betAmount > user.chips}
              >
                Start Game
              </Button>
            </div>
          )}

          {/* Game Status */}
          {gameState !== 'betting' && (
            <div className="text-center bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="font-medium">Bombs</p>
                  <p className="text-lg font-bold text-red-600">{bombCount}</p>
                </div>
                <div>
                  <p className="font-medium">Multiplier</p>
                  <p className="text-lg font-bold text-green-600">{currentMultiplier.toFixed(2)}x</p>
                </div>
                <div>
                  <p className="font-medium">Potential Win</p>
                  <p className="text-lg font-bold text-blue-600">
                    {Math.round(betAmount * currentMultiplier * 100) / 100} chips
                  </p>
                </div>
              </div>
              
              {gameState === 'playing' && (
                <Button 
                  onClick={() => cashOut()} 
                  className="mt-4 px-6 py-2 bg-yellow-600 hover:bg-yellow-700"
                  disabled={revealedTiles === 0}
                >
                  💰 Cash Out ({(betAmount * currentMultiplier).toFixed(2)} chips)
                </Button>
              )}
            </div>
          )}

          {/* Game Grid */}
          <div className="flex justify-center">
            <div className="grid grid-cols-5 gap-2 bg-gray-800 p-4 rounded-lg">
              {grid.map(tile => renderTile(tile))}
            </div>
          </div>

          {/* Game End */}
          {gameState === 'ended' && (
            <div className="text-center space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-xl font-bold mb-2">
                  {gameResult === 'won' ? '🎉 Game Won!' : '💥 Game Over!'}
                </h3>
                <p className="text-sm text-gray-600">
                  {gameResult === 'won' 
                    ? `You cashed out with ${currentMultiplier.toFixed(2)}x multiplier!`
                    : `You revealed ${revealedTiles} safe tiles before hitting a bomb.`
                  }
                </p>
              </div>
              <Button onClick={resetGame} className="px-8 py-3 text-lg bg-green-600 hover:bg-green-700">
                Play Again
              </Button>
            </div>
          )}

          {/* Game Rules */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">How to Play:</h4>
            <ul className="text-sm space-y-1 text-gray-700">
              <li>• Choose your bet amount and number of bombs (3, 5, or 10)</li>
              <li>• Click tiles in the 5×5 grid to reveal them - avoid the bombs!</li>
              <li>• Each safe tile increases your multiplier</li>
              <li>• Cash out anytime to secure your winnings</li>
              <li>• Hit a bomb and lose everything!</li>
              <li>• More bombs = higher risk but bigger multipliers</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default Minebomb;
