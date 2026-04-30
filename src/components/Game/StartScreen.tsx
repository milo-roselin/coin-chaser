import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCoinGame } from "@/lib/stores/useCoinGame";
import { useAudio } from "@/lib/stores/useAudio";
import { usePlayerAvatar } from "@/lib/stores/usePlayerAvatar";
import { useCoinBank } from "@/lib/stores/useCoinBank";
import { useAuth } from "@/lib/stores/useAuth";
import { useUserStats } from "@/lib/stores/useUserStats";
import { Trophy, Play, Volume2, VolumeX, Lock, Settings, User, Globe, LogOut, UserCheck } from "lucide-react";
import AudioSettingsMenu from "./AudioSettingsMenu";
import CoinBankDisplay from "./CoinBankDisplay";
import { AvatarSelector } from "./AvatarSelector";
import MobileFullscreenButton from "../ui/MobileFullscreenButton";
import GlobalLeaderboard from "./GlobalLeaderboard";
import LoginForm from "../Auth/LoginForm";

export default function StartScreen() {
  const { startGame, startFromLevel, highestLevelUnlocked, totalScore, resetProgress } = useCoinGame();
  const { isMuted, toggleMute, startBackgroundMusic } = useAudio();
  const { getSelectedAvatar } = usePlayerAvatar();
  const { totalCoins } = useCoinBank();
  const { checkAuth, logout, user } = useAuth();
  const { getHighestScore, getHighestLevel } = useUserStats();
  
  // Use database values for authenticated users, local storage for guests
  const displayScore = getHighestScore();
  const displayLevel = getHighestLevel();
  const [levelInput, setLevelInput] = useState("");
  const [inputTimeout, setInputTimeout] = useState<NodeJS.Timeout | null>(null);
  const [showAudioSettings, setShowAudioSettings] = useState(false);
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);
  const [showGlobalLeaderboard, setShowGlobalLeaderboard] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  // Check authentication status on component mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const handleStartGame = () => {
    // Enable audio context on user interaction
    const { explosionSound } = useAudio.getState();
    if (explosionSound) {
      explosionSound.muted = false;
      explosionSound.load();
    }
    
    // Start background music
    startBackgroundMusic();
    
    startGame();
  };





  const handleResetProgress = () => {
    if (confirm("Reset all progress? This will delete your checkpoint and start from Level 1.")) {
      resetProgress();
    }
  };

  const handleLogout = async () => {
    if (confirm("Are you sure you want to log out?")) {
      await logout();
    }
  };

  const handleLoginSuccess = () => {
    setShowLogin(false);
  };

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Skip if typing in input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      

      
      const key = e.key.toLowerCase();
      const code = e.code;
      
      // Handle Enter key (multiple ways for Microsoft keyboards)
      if (key === 'enter' || code === 'Enter' || e.keyCode === 13) {
        e.preventDefault();
        handleStartGame();
        return;
      }
      
      // Handle letter keys
      if (key === 'n' || code === 'KeyN') {
        e.preventDefault();
        handleStartGame();
        return;
      }
      

      
      if (key === 'l' || code === 'KeyL') {
        e.preventDefault();
        setShowGlobalLeaderboard(true);
        return;
      }
      
      if (key === 'm' || code === 'KeyM') {
        e.preventDefault();
        toggleMute();
        return;
      }
      
      if (key === 'o' || code === 'KeyO') {
        e.preventDefault();
        setShowAudioSettings(true);
        return;
      }
      
      if (key === 'a' || code === 'KeyA') {
        e.preventDefault();
        setShowAvatarSelector(true);
        return;
      }
      
      if ((key === 'r' || code === 'KeyR') && displayLevel > 1) {
        e.preventDefault();
        handleResetProgress();
        return;
      }

      if ((key === 'x' || code === 'KeyX') && user) {
        e.preventDefault();
        handleLogout();
        return;
      }

      if ((key === 'i' || code === 'KeyI') && !user) {
        e.preventDefault();
        setShowLogin(true);
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
          if (level > 0 && level <= displayLevel) {
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
  }, [handleStartGame, toggleMute, handleResetProgress, handleLogout, displayLevel, startFromLevel, levelInput, inputTimeout, user]);

  return (
    <div className="flex flex-col items-center justify-start w-full h-full p-2 sm:p-4 relative overflow-y-auto min-h-screen pt-24 pb-16 sm:pt-8 sm:pb-8 md:pt-12 md:pb-12">
      {/* Coin Bank Display - Top Left */}
      <div className="absolute top-4 left-4 z-10">
        <CoinBankDisplay showSessionCoins={true} />
      </div>
      
      {/* User Status and Mobile Fullscreen Button - Top Right */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        {user && (
          <div className="bg-white/90 backdrop-blur-sm shadow-lg rounded-lg px-3 py-2 border border-gray-200">
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-gray-700">{user.username}</span>
              <Button
                onClick={handleLogout}
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 relative group"
                title="Logout [X]"
              >
                <LogOut className="h-3 w-3" />
                <span className="absolute -bottom-1 -right-1 text-[8px] font-bold text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">X</span>
              </Button>
            </div>
          </div>
        )}
        <MobileFullscreenButton />
      </div>
      
      {/* Game Logo */}
      <div className="mb-4 sm:mb-6 text-center mt-2 sm:mt-0">
        <div className="mb-2 sm:mb-3 flex justify-center">
          <img src="/gold-coin.svg" alt="Gold Coin" className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16" />
        </div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-blue-600 mb-1 sm:mb-2">Coin Rush</h1>
        <p className="text-sm sm:text-base text-gray-600">Collect coins, avoid obstacles and more!</p>
      </div>

      {/* User Score Display for Logged-in Users */}
      {user && (
        <Card className="w-full max-w-md bg-blue-50/90 backdrop-blur-sm shadow-lg mx-2 mb-2">
          <CardContent className="p-2 sm:p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <UserCheck className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-semibold text-blue-700">{user.username}</span>
              <span className="text-lg font-bold text-blue-600">{displayScore.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Menu Card */}
      <Card className="w-full max-w-md bg-white/90 backdrop-blur-sm shadow-xl mx-2">
        <CardContent className="p-3 sm:p-6 space-y-2 sm:space-y-4">
          <Button 
            onClick={handleStartGame}
            size="lg"
            className="w-full text-lg sm:text-xl py-4 sm:py-6 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl shadow-lg"
            title="Start New Game [N] or [Enter]"
          >
            <Play className="mr-2 h-4 w-4 sm:h-6 sm:w-6" />
            New Game
            <span className="ml-auto text-xs sm:text-sm opacity-75">[N]</span>
          </Button>



          <Button 
            onClick={() => setShowGlobalLeaderboard(true)}
            variant="outline"
            size="lg"
            className="w-full text-base sm:text-lg py-3 sm:py-4 border-2 border-purple-500 text-purple-600 hover:bg-purple-50 font-semibold rounded-xl"
            title="View Global Leaderboard [L]"
          >
            <Trophy className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
            Leaderboard
            <span className="ml-auto text-xs sm:text-sm opacity-75">[L]</span>
          </Button>

          {!user && (
            <Button 
              onClick={() => setShowLogin(true)}
              variant="outline"
              size="lg"
              className="w-full text-base sm:text-lg py-3 sm:py-4 border-2 border-blue-500 text-blue-600 hover:bg-blue-50 font-semibold rounded-xl"
              title="Login / Sign Up [I]"
            >
              <User className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
              Login / Sign Up
              <span className="ml-auto text-xs sm:text-sm opacity-75">[I]</span>
            </Button>
          )}

          <Button 
            onClick={() => setShowAvatarSelector(true)}
            variant="outline"
            size="lg"
            className="w-full text-base sm:text-lg py-3 sm:py-4 border-2 border-yellow-500 text-yellow-600 hover:bg-yellow-50 font-semibold rounded-xl"
            title="Choose Your Avatar [A]"
          >
            <User className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
            Choose Avatar
            <span className="ml-2 text-xs sm:text-sm text-yellow-500">({totalCoins} coins)</span>
            <span className="ml-auto text-xs sm:text-sm opacity-75">[A]</span>
          </Button>

          <div className="flex gap-2">
            <Button 
              onClick={toggleMute}
              variant="outline"
              size="lg"
              className="flex-1 text-sm sm:text-lg py-3 sm:py-4 border-2 border-gray-300 text-gray-600 hover:bg-gray-50 font-semibold rounded-xl"
              title={isMuted ? "Unmute Audio [M]" : "Mute Audio [M]"}
            >
              {isMuted ? <VolumeX className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5" /> : <Volume2 className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5" />}
              {isMuted ? "Unmute" : "Mute"}
              <span className="ml-auto text-xs sm:text-sm opacity-75">[M]</span>
            </Button>
            
            <Button 
              onClick={() => setShowAudioSettings(true)}
              variant="outline"
              size="lg"
              className="px-3 sm:px-4 py-3 sm:py-4 border-2 border-blue-300 text-blue-600 hover:bg-blue-50 font-semibold rounded-xl"
              title="Audio Settings [O]"
            >
              <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="ml-1 sm:ml-2 text-xs sm:text-sm opacity-75">[O]</span>
            </Button>
          </div>

          {displayLevel > 1 && (
            <Button 
              onClick={handleResetProgress}
              variant="outline"
              size="sm"
              className="w-full text-sm py-2 border border-red-300 text-red-600 hover:bg-red-50 rounded-lg"
              title="Reset All Progress [R]"
            >
              Reset Progress
              <span className="ml-auto text-xs opacity-75">[R]</span>
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Level Selection Grid - Show if user has unlocked higher levels */}
      {displayLevel > 1 && (
        <Card className="w-full max-w-4xl bg-white/90 backdrop-blur-sm shadow-xl mt-3 sm:mt-6 mx-2">
          <CardContent className="p-3 sm:p-6">
            <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-2 sm:mb-4 text-center">🎯 Level Select</h3>
            <div className="overflow-x-auto">
              <div className="flex flex-wrap gap-2 sm:gap-3 mb-2 sm:mb-4 justify-center min-h-[40px] sm:min-h-[60px]">
                {Array.from({ length: displayLevel }, (_, i) => {
                  const level = i + 1;
                  const isUnlocked = level <= displayLevel;
                  return (
                    <Button
                      key={level}
                      onClick={() => startFromLevel(level)}
                      size="default"
                      className={`w-8 h-8 sm:w-12 sm:h-12 text-sm sm:text-base font-bold flex-shrink-0 ${
                        isUnlocked 
                          ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                      disabled={!isUnlocked}
                      title={isUnlocked ? `Press ${level} to start Level ${level}` : `Level ${level} locked`}
                    >
                      {isUnlocked ? level : <Lock className="h-3 w-3 sm:h-4 sm:w-4" />}
                    </Button>
                  );
                })}
              </div>
            </div>
            <p className="text-xs text-gray-500 text-center px-2">
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

      {/* Instructions */}
      <div className="mt-3 sm:mt-6 text-center max-w-md mx-2 mb-12 sm:mb-6">
        <p className="text-sm text-gray-600 mb-2">How to Play:</p>
        <p className="text-xs text-gray-500 px-2">
          Use arrow keys or WASD to move your character. You can also tap and hold to move. 
          Collect coins and avoid TNT guards patrolling around them. Reach the portal to win!
        </p>
      </div>

      {/* Modals */}
      {showAudioSettings && (
        <AudioSettingsMenu 
          isOpen={showAudioSettings} 
          onClose={() => setShowAudioSettings(false)} 
        />
      )}
      
      {showAvatarSelector && (
        <AvatarSelector onClose={() => setShowAvatarSelector(false)} />
      )}

      {showGlobalLeaderboard && (
        <GlobalLeaderboard onClose={() => setShowGlobalLeaderboard(false)} />
      )}

      {showLogin && (
        <LoginForm
          onSuccess={handleLoginSuccess}
          onClose={() => setShowLogin(false)}
        />
      )}
      
      {/* Audio Settings Modal */}
      <AudioSettingsMenu 
        isOpen={showAudioSettings} 
        onClose={() => setShowAudioSettings(false)} 
      />

      {/* Avatar Selector Modal */}
      {showAvatarSelector && (
        <AvatarSelector 
          onClose={() => setShowAvatarSelector(false)} 
        />
      )}
    </div>
  );
}
