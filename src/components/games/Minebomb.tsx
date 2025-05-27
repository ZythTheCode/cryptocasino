import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { soundManager } from "@/utils/sounds";

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

    soundManager.playBetSound();

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
      soundManager.playExplosionSound();
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
      soundManager.playCollectSound();
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

    soundManager.playWinSound();

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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-center space-x-2">
          <span>💣</span>
          <span>Minebomb</span>
          <span>💎</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {gameState === 'betting' && (
            <div className="text-center">
              <h3 className="font-bold text-lg mb-6">Setup Your Game</h3>

              <div className="flex items-center justify-center space-x-3 mb-6">
                <label className="font-medium min-w-[100px] text-right">Bet Amount:</label>
                <Input
                  type="number"
                  min="1"
                  max={user?.chips || 0}
                  value={betAmount}
                  onChange={(e) => setBetAmount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-24 text-center"
                  disabled={gameState !== 'betting'}
                />
                <span className="text-sm text-gray-600 min-w-[40px]">chips</span>
              </div>

              <div className="mb-6">
                <p className="font-medium mb-4">Number of Bombs:</p>
                <div className="flex justify-center space-x-4">
                  {[
                    { bombs: 3, label: "Easy" },
                    { bombs: 5, label: "Med" },
                    { bombs: 10, label: "High" }
                  ].map(({ bombs, label }) => (
                    <button
                      key={bombs}
                      onClick={() => setBombCount(bombs)}
                      className={`w-20 h-16 rounded-lg border-2 flex flex-col items-center justify-center font-bold transition-all ${
                        bombCount === bombs 
                          ? 'bg-yellow-500 text-white border-yellow-600' 
                          : 'bg-gray-200 text-gray-700 border-gray-300 hover:bg-gray-300'
                      }`}
                    >
                      <span className="text-lg">{bombs}</span>
                      <span className="text-xs">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <Button
                onClick={startGame}
                disabled={!user?.chips || betAmount > user.chips}
                className="mb-6 bg-green-600 hover:bg-green-700 px-8 py-3 text-lg font-semibold"
              >
                Start Game
              </Button>
            </div>
          )}

          {gameState !== 'betting' && (
            <div className="bg-gray-100 p-6 rounded-lg">
              <div className="grid grid-cols-5 gap-2 max-w-sm mx-auto">
                {grid.map((tile) => renderTile(tile))}
              </div>
            </div>
          )}

          {gameState === 'ended' && (
            <div className="text-center">
              <Button
                onClick={resetGame}
                className="bg-blue-600 hover:bg-blue-700 px-6 py-3 text-lg font-semibold"
              >
                Play Again
              </Button>
            </div>
          )}

          {gameState !== 'betting' && (
            <div className="text-center space-y-3 bg-blue-50 p-4 rounded-lg">
              <p className="font-bold text-lg">
                Current Multiplier: <span className="text-blue-600">{currentMultiplier.toFixed(2)}x</span>
              </p>
              <p className="text-green-600 font-semibold">
                Potential Win: {(betAmount * currentMultiplier).toFixed(2)} chips
              </p>
              <Button
                onClick={() => cashOut()}
                className="bg-yellow-600 hover:bg-yellow-700 px-6 py-2 text-lg font-semibold"
              >
                💰 Cash Out
              </Button>
            </div>
          )}

          <div className="bg-blue-50 p-4 rounded-lg text-sm">
            <h4 className="font-bold mb-2 text-center">How to Play:</h4>
            <ul className="space-y-1 text-left">
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