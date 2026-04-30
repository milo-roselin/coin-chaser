import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useCoinGame } from "@/lib/stores/useCoinGame";

import { useCoinBank } from "@/lib/stores/useCoinBank";
import { useAuth } from "@/lib/stores/useAuth";
import { useGlobalLeaderboard } from "@/lib/stores/useGlobalLeaderboard";
import { useUserStats } from "@/lib/stores/useUserStats";
import { Trophy, Home, Upload, Lock, Coins, Globe, LogIn } from "lucide-react";
import CoinBankDisplay from "./CoinBankDisplay";
import MobileFullscreenButton from "../ui/MobileFullscreenButton";
import LoginForm from "../Auth/LoginForm";

export default function VictoryScreen() {
  const { score, coinsCollected, resetGame, totalScore, highestLevelUnlocked, startFromLevel, currentLevel, totalCoinsCollected } = useCoinGame();

  const { totalCoins, sessionCoins } = useCoinBank();
  const { user } = useAuth();
  const { submitScore } = useGlobalLeaderboard();
  const { getHighestScore } = useUserStats();
  const [globalScoreSubmitted, setGlobalScoreSubmitted] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [levelInput, setLevelInput] = useState("");
  const [inputTimeout, setInputTimeout] = useState<NodeJS.Timeout | null>(null);



  // Handle score submission on screen load - only once per victory screen
  useEffect(() => {
    // Only auto-submit to global leaderboard if user is logged in and score hasn't been submitted yet
    if (user && !globalScoreSubmitted) {
      console.log(`Auto-submitting score for authenticated user: ${user.username}, Score: ${totalScore}, Coins: ${coinsCollected}`);
      handleGlobalScoreSubmit();
    }
  }, [user]); // Remove dependency on totalScore and totalCoinsCollected to prevent multiple submissions

  const handleGlobalScoreSubmit = async () => {
    if (user && !globalScoreSubmitted) {
      // Set flag immediately to prevent multiple submissions
      setGlobalScoreSubmitted(true);
      
      const highestCompleted = Math.max(currentLevel, highestLevelUnlocked);
      console.log(`Attempting score submission: Score=${totalScore}, Coins=${coinsCollected}, HighestLevel=${highestCompleted}, User=${user.username}`);
      
      // First sync coin bank to ensure database has latest coin count
      await useCoinBank.getState().syncToDatabase();
      
      const success = await submitScore(totalScore, coinsCollected, highestCompleted); // Pass highest level completed as level
      if (success) {
        console.log('Score submission successful, syncing local state with database');
        
        // Sync local game state with database after successful submission
        try {
          const statsResponse = await fetch('/api/user/stats', {
            credentials: 'include'
          });
          
          if (statsResponse.ok) {
            const stats = await statsResponse.json();
            console.log('Database stats:', stats);
            
            // Update local game state to match database
            if (stats.highestLevel > highestLevelUnlocked) {
              useCoinGame.getState().setHighestLevelUnlocked(stats.highestLevel);
              console.log(`Updated local highest level to: ${stats.highestLevel}`);
            }
          }
        } catch (error) {
          console.error('Failed to sync stats after score submission:', error);
        }
      } else {
        console.log('Score submission failed, resetting flag');
        // Reset flag if submission failed
        setGlobalScoreSubmitted(false);
      }
    }
  };



  const handleLoginSuccess = () => {
    setShowLogin(false);
    handleGlobalScoreSubmit();
  };

  const handleHome = () => {
    resetGame();
  };

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      

      
      const key = e.key.toLowerCase();
      const code = e.code;
      
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
  }, [handleHome, startFromLevel, highestLevelUnlocked, levelInput, inputTimeout]);

  return (
    <div className="flex flex-col items-center justify-start w-full h-full p-2 sm:p-4 relative overflow-y-auto min-h-screen pt-20 pb-12 sm:pt-6 sm:pb-6">
      {/* Coin Bank Display - Top Left */}
      <div className="absolute top-4 left-4 z-10">
        <CoinBankDisplay showSessionCoins={true} />
      </div>
      
      {/* Mobile Fullscreen Button - Top Right */}
      <div className="absolute top-4 right-4 z-10">
        <MobileFullscreenButton />
      </div>
      
      {/* Victory Message */}
      <div className="mb-4 sm:mb-8 text-center mt-2 sm:mt-0">
        <div className="text-4xl sm:text-5xl md:text-6xl mb-2 sm:mb-4">🎉</div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-green-600 mb-1 sm:mb-2">Level {currentLevel} Complete!</h1>
        <p className="text-sm sm:text-base md:text-lg text-gray-600">
          Level Complete!
        </p>
      </div>

      {/* Score Card */}
      <Card className="w-full max-w-md bg-white/90 backdrop-blur-sm shadow-xl mb-3 sm:mb-6 mx-2">
        <CardContent className="p-3 sm:p-6 text-center">
          <div className="flex items-center justify-center mb-4">
            <Trophy className="h-8 w-8 text-yellow-500 mr-2" />
            <h2 className="text-2xl font-bold text-gray-800">Victory!</h2>
          </div>
          <div className="space-y-2 mb-6">
            <div className="text-3xl font-bold text-blue-600">{score}</div>
            <div className="text-lg text-gray-600">
              Level Coins: <span className="font-semibold text-yellow-600">{coinsCollected}</span>
            </div>
            <div className="text-sm text-gray-500 border-t pt-2">
              Total Progress: <span className="font-semibold text-purple-600">{getHighestScore().toLocaleString()}</span>
            </div>

            <div className="text-sm text-gray-500 border-t pt-2">
              <div className="flex items-center justify-center gap-1">
                <Coins className="h-4 w-4 text-yellow-600" />
                <span>Coin Bank: <span className="font-semibold text-yellow-600">{totalCoins.toLocaleString()}</span></span>
              </div>
            </div>

          </div>

          <div className="space-y-4">

            {/* Global Leaderboard Status */}
            {user ? (
              <div className="text-blue-600 font-semibold flex items-center justify-center mb-2">
                <Globe className="mr-2 h-5 w-5" />
                {globalScoreSubmitted ? 'Score saved globally!' : 'Saving to global leaderboard...'}
              </div>
            ) : (
              <div className="text-center mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  Login to save your score globally and compete with players worldwide!
                </p>
                <Button
                  onClick={() => setShowLogin(true)}
                  size="sm"
                  variant="outline"
                  className="text-blue-600 border-blue-600 hover:bg-blue-50"
                >
                  <LogIn className="mr-2 h-4 w-4" />
                  Login / Sign Up
                </Button>
              </div>
            )}
            

          </div>
        </CardContent>
      </Card>

      {/* Level Selection Grid */}
      {highestLevelUnlocked > 1 && (
        <Card className="w-full max-w-4xl bg-white/90 backdrop-blur-sm shadow-xl mb-3 sm:mb-6 mx-2">
          <CardContent className="p-3 sm:p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4 text-center">🎯 Play Another Level</h3>
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
              Jump to any unlocked level • Highest: Level {highestLevelUnlocked}
              <br />
              <span className="text-xs opacity-75">
                Type level number (e.g., press 1 then 7 for Level 17)
                {levelInput && <span className="ml-2 text-blue-600 font-semibold">Typing: {levelInput}...</span>}
              </span>
            </p>
          </CardContent>
        </Card>
      )}

      {/* Action Button */}
      <div className="w-full max-w-md mx-2 mb-8 sm:mb-4">
        <Button 
          onClick={handleHome}
          size="lg"
          className="w-full text-lg sm:text-xl py-4 sm:py-6 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl shadow-lg"
        >
          <Home className="mr-2 h-4 w-4 sm:h-6 sm:w-6" />
          Back to Menu
          <span className="ml-auto text-xs sm:text-sm opacity-75">[H]</span>
        </Button>
      </div>

      {/* Login Form Modal */}
      {showLogin && (
        <LoginForm
          onSuccess={handleLoginSuccess}
          onClose={() => setShowLogin(false)}
        />
      )}
    </div>
  );
}
