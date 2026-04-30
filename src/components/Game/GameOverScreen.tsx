import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCoinGame } from "@/lib/stores/useCoinGame";
import { RotateCcw, Home, Play, Lock } from "lucide-react";
import CoinBankDisplay from "./CoinBankDisplay";
import MobileFullscreenButton from "../ui/MobileFullscreenButton";

export default function GameOverScreen() {
  const { score, coinsCollected, currentLevel, highestLevelUnlocked, resetGame, startGame, startFromLevel, applyPenalty, penaltyApplied } = useCoinGame();
  const [levelInput, setLevelInput] = useState("");
  const [inputTimeout, setInputTimeout] = useState<NodeJS.Timeout | null>(null);

  const handleRetry = () => {
    startFromLevel(currentLevel);
  };

  const handleHome = () => {
    resetGame();
  };

  // Apply penalty when GameOver screen first appears
  useEffect(() => {
    if (!penaltyApplied) {
      applyPenalty();
    }
  }, []); // Run only once when component mounts

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      

      
      const key = e.key.toLowerCase();
      const code = e.code;
      
      // Handle retry keys
      if (key === 'r' || code === 'KeyR' || key === 'enter' || code === 'Enter' || e.keyCode === 13 || key === ' ' || code === 'Space' || e.keyCode === 32) {
        e.preventDefault();
        handleRetry();
        return;
      }
      
      // Handle home/escape keys
      if (key === 'h' || code === 'KeyH' || key === 'escape' || code === 'Escape' || e.keyCode === 27) {
        e.preventDefault();
        handleHome();
        return;
      }
      
      // Handle number keys for multi-digit input
      const numberKeys = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
      const numberCodes = ['Digit0', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9'];
      
      let digit = '';
      if (numberKeys.includes(key)) {
        digit = key;
      } else if (numberCodes.includes(code)) {
        digit = code.replace('Digit', '');
      } else if (e.keyCode >= 48 && e.keyCode <= 57) {
        digit = String(e.keyCode - 48);
      }
      
      if (digit !== '') {
        e.preventDefault();
        
        // Clear existing timeout
        if (inputTimeout) {
          clearTimeout(inputTimeout);
        }
        
        const newInput = levelInput + digit;
        setLevelInput(newInput);
        
        // Set timeout to execute level selection after 1 second
        const timeout = setTimeout(() => {
          const level = parseInt(newInput);
          if (level > 0 && level <= highestLevelUnlocked) {
            startFromLevel(level);
          }
          setLevelInput("");
        }, 1000);
        
        setInputTimeout(timeout);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      if (inputTimeout) {
        clearTimeout(inputTimeout);
      }
    };
  }, [handleRetry, handleHome, startFromLevel, highestLevelUnlocked, levelInput, inputTimeout]);

  return (
    <div className="flex flex-col items-center justify-start w-full h-full p-2 sm:p-4 relative overflow-y-auto min-h-screen pt-20 pb-12 sm:pt-6 sm:pb-6">
      {/* Coin Bank Display - Top Left */}
      <div className="absolute top-4 left-4 z-10">
        <CoinBankDisplay />
      </div>
      
      {/* Mobile Fullscreen Button - Top Right */}
      <div className="absolute top-4 right-4 z-10">
        <MobileFullscreenButton />
      </div>
      
      {/* Game Over Message */}
      <div className="mb-4 sm:mb-8 text-center mt-2 sm:mt-0">
        <div className="text-4xl sm:text-5xl md:text-6xl mb-2 sm:mb-4">💥</div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-red-600 mb-1 sm:mb-2">Game Over!</h1>
        <p className="text-sm sm:text-base md:text-lg text-gray-600">Better luck next time!</p>
      </div>

      {/* Score Card */}
      <Card className="w-full max-w-md bg-white/90 backdrop-blur-sm shadow-xl mb-3 sm:mb-6 mx-2">
        <CardContent className="p-3 sm:p-6 text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Final Score</h2>
          <div className="space-y-2">
            <div className="text-3xl font-bold text-blue-600">{score}</div>
            <div className="text-lg text-gray-600">
              Coins Collected: <span className="font-semibold text-yellow-600">{coinsCollected}</span>
            </div>
            <div className="text-sm text-gray-500 mt-2">
              Died on Level: <span className="font-semibold">{currentLevel}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Checkpoint Section */}
      {highestLevelUnlocked > 1 && (
        <Card className="w-full max-w-4xl bg-white/90 backdrop-blur-sm shadow-xl mb-3 sm:mb-6 mx-2">
          <CardContent className="p-3 sm:p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4 text-center">🏃‍♂️ Continue from Checkpoint</h3>
            <div className="overflow-x-auto">
              <div className="flex flex-wrap gap-3 mb-4 justify-center min-h-[60px]">
                {Array.from({ length: highestLevelUnlocked }, (_, i) => {
                  const level = i + 1;
                  const isUnlocked = level <= highestLevelUnlocked;
                  return (
                    <Button
                      key={level}
                      onClick={() => startFromLevel(level)}
                      size="default"
                      className={`w-12 h-12 text-base font-bold flex-shrink-0 ${
                        isUnlocked 
                          ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                      disabled={!isUnlocked}
                      title={isUnlocked ? `Press ${level} to start Level ${level}` : `Level ${level} locked`}
                    >
                      {isUnlocked ? level : <Lock className="h-4 w-4" />}
                    </Button>
                  );
                })}
              </div>
            </div>
            <p className="text-xs text-gray-500 text-center">
              Highest Level Reached: {highestLevelUnlocked}
              <br />
              <span className="text-xs opacity-75">
                Type level number (e.g., press 1 then 7 for Level 17)
                {levelInput && <span className="ml-2 text-blue-600 font-semibold">Typing: {levelInput}...</span>}
              </span>
            </p>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="space-y-2 sm:space-y-3 w-full max-w-md mx-2 mb-8 sm:mb-4">
        <Button 
          onClick={handleRetry}
          size="lg"
          className="w-full text-lg sm:text-xl py-4 sm:py-6 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl shadow-lg"
        >
          <RotateCcw className="mr-2 h-4 w-4 sm:h-6 sm:w-6" />
          Try Again (Level {currentLevel})
          <span className="ml-auto text-xs sm:text-sm opacity-75">[R]</span>
        </Button>

        <Button 
          onClick={handleHome}
          variant="outline"
          size="lg"
          className="w-full text-base sm:text-lg py-3 sm:py-4 border-2 border-gray-300 text-gray-600 hover:bg-gray-50 font-semibold rounded-xl"
        >
          <Home className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
          Back to Menu
          <span className="ml-auto text-xs sm:text-sm opacity-75">[H]</span>
        </Button>
      </div>
    </div>
  );
}
