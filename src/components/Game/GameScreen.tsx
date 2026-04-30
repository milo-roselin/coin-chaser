import { useRef, useEffect } from "react";
import GameCanvas from "./GameCanvas";
import TouchControls from "./TouchControls";
import { useCoinGame } from "@/lib/stores/useCoinGame";
import { Button } from "@/components/ui/button";
import { Pause, Home, Magnet, Shield } from "lucide-react";

export default function GameScreen() {
  const { 
    resetGame, 
    magnetActive, 
    magnetTimeLeft, 
    extraLives, 
    shieldActive 
  } = useCoinGame();
  const gameCanvasRef = useRef<{ togglePause: () => void } | null>(null);

  const handlePause = () => {
    // Trigger pause in the game engine
    if (gameCanvasRef.current) {
      gameCanvasRef.current.togglePause();
    }
  };

  const handleHome = () => {
    resetGame();
  };

  // Add keyboard shortcuts for home button
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      if (e.key === 'h' || e.key === 'H') {
        handleHome();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  return (
    <div className="relative w-full h-full">
      {/* Game Canvas */}
      <GameCanvas ref={gameCanvasRef} />

      {/* Power-up Status Display */}
      <div className="absolute top-4 left-4 z-50 flex flex-col gap-2">
        {magnetActive && (
          <div className="bg-red-500/90 text-white px-3 py-2 rounded-lg flex items-center gap-2 animate-pulse">
            <Magnet className="w-4 h-4" />
            <span className="text-sm font-bold">
              Magnet: {Math.ceil(magnetTimeLeft / 1000)}s
            </span>
          </div>
        )}
        
        {shieldActive && extraLives > 0 && (
          <div className="bg-teal-500/90 text-white px-3 py-2 rounded-lg flex items-center gap-2">
            <Shield className="w-4 h-4" />
            <span className="text-sm font-bold">
              Shield: {extraLives} lives
            </span>
          </div>
        )}
      </div>

      {/* Touch Controls */}
      <TouchControls onPause={handlePause} onHome={handleHome} />
    </div>
  );
}
