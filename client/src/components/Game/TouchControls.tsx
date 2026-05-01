import { useRef, useEffect, useState } from "react";
import { useCoinGame } from "@/lib/stores/useCoinGame";
import { useIsMobile } from '../../hooks/use-is-mobile';
import { Button } from "@/components/ui/button";
import { Pause, Home, Settings } from "lucide-react";
import AudioSettingsMenu from "./AudioSettingsMenu";

interface TouchControlsProps {
  onPause?: () => void;
  onHome?: () => void;
}

export default function TouchControls({ onPause, onHome }: TouchControlsProps) {
  const touchAreaRef = useRef<HTMLDivElement>(null);
  const { playerPosition, resetGame } = useCoinGame();
  const isMobile = useIsMobile();
  const [showAudioSettings, setShowAudioSettings] = useState(false);

  const handlePause = () => {
    if (onPause) {
      onPause();
    }
  };

  const handleHome = () => {
    if (onHome) {
      onHome();
    } else {
      resetGame();
    }
  };

  const handleAudioSettings = () => {
    setShowAudioSettings(true);
  };

  useEffect(() => {
    // Touch controls are handled by the canvas component
    // This component just provides visual feedback
    
    // Add keyboard shortcuts for audio controls
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      if (e.key === 'o' || e.key === 'O') {
        handleAudioSettings();
      }
      

    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  const handleSpeedIncrease = () => {
    // Create a keyboard event to trigger speed increase
    const event = new KeyboardEvent('keydown', {
      key: '=',
      code: 'Equal',
      bubbles: true
    });
    document.dispatchEvent(event);
  };

  const handleSpeedDecrease = () => {
    // Create a keyboard event to trigger speed decrease
    const event = new KeyboardEvent('keydown', {
      key: '-',
      code: 'Minus',
      bubbles: true
    });
    document.dispatchEvent(event);
  };

  const handleArrowKeyDown = (direction: string, e?: React.TouchEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    const keyMap = {
      up: { key: 'ArrowUp', code: 'ArrowUp' },
      down: { key: 'ArrowDown', code: 'ArrowDown' },
      left: { key: 'ArrowLeft', code: 'ArrowLeft' },
      right: { key: 'ArrowRight', code: 'ArrowRight' }
    };

    const keyData = keyMap[direction as keyof typeof keyMap];
    if (keyData) {
      const event = new KeyboardEvent('keydown', {
        key: keyData.key,
        code: keyData.code,
        bubbles: true
      });
      document.dispatchEvent(event);
    }
  };

  const handleArrowKeyUp = (direction: string, e?: React.TouchEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    const keyMap = {
      up: { key: 'ArrowUp', code: 'ArrowUp' },
      down: { key: 'ArrowDown', code: 'ArrowDown' },
      left: { key: 'ArrowLeft', code: 'ArrowLeft' },
      right: { key: 'ArrowRight', code: 'ArrowRight' }
    };

    const keyData = keyMap[direction as keyof typeof keyMap];
    if (keyData) {
      const event = new KeyboardEvent('keyup', {
        key: keyData.key,
        code: keyData.code,
        bubbles: true
      });
      document.dispatchEvent(event);
    }
  };

  // Remove debug logging for cleaner console

  return (
    <>
      {/* Control panel - shows different content based on device */}
      {isMobile ? (
        /* Mobile/iPad: Full control panel with all controls */
        <div className="absolute top-0 right-0 h-full w-32 bg-gray-900/90 border-l-2 border-gray-600 flex flex-col items-center justify-between py-6 pointer-events-auto z-[9999]">
          {/* Action Buttons - Top */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col items-center gap-1">
              <Button
                onClick={handlePause}
                size="sm"
                variant="default"
                className="bg-blue-600 hover:bg-blue-500 border-blue-400 text-white w-16 h-12 relative z-[9999] shadow-lg border-2"
              >
                <Pause className="h-4 w-4" />
              </Button>
              <span className="text-xs text-white font-semibold bg-black/50 px-1 rounded">
                SPACE
              </span>
            </div>
            
            <div className="flex flex-col items-center gap-1">
              <Button
                onClick={handleHome}
                size="sm"
                variant="default"
                className="bg-red-600 hover:bg-red-500 border-red-400 text-white w-16 h-12 relative z-[9999] shadow-lg border-2"
              >
                <Home className="h-4 w-4" />
              </Button>
              <span className="text-xs text-white font-semibold bg-black/50 px-1 rounded">
                H
              </span>
            </div>
            

            <div className="flex flex-col items-center gap-1">
              <Button
                onClick={handleAudioSettings}
                size="sm"
                variant="default"
                className="bg-green-600 hover:bg-green-500 border-green-400 text-white w-16 h-12 relative z-[9999] shadow-lg border-2"
              >
                <Settings className="h-4 w-4" />
              </Button>
              <span className="text-xs text-white font-semibold bg-black/50 px-1 rounded">
                O
              </span>
            </div>
          </div>

          {/* Arrow key controls - Middle */}
          <div className="flex flex-col items-center gap-1">
            {/* Up arrow - top row */}
            <div className="flex justify-center">
              <button
                onTouchStart={(e) => handleArrowKeyDown('up', e)}
                onTouchEnd={(e) => handleArrowKeyUp('up', e)}
                onMouseDown={(e) => handleArrowKeyDown('up', e)}
                onMouseUp={(e) => handleArrowKeyUp('up', e)}
                onMouseLeave={(e) => handleArrowKeyUp('up', e)}
                className="bg-gray-700 hover:bg-gray-600 active:bg-gray-500 text-white w-10 h-10 rounded-md border-2 border-gray-500 flex items-center justify-center shadow-lg transition-all duration-150 font-mono text-lg font-bold select-none focus:outline-none"
              >
                ↑
              </button>
            </div>
            
            {/* Left, Down, Right arrows - bottom row */}
            <div className="flex gap-1">
              <button
                onTouchStart={(e) => handleArrowKeyDown('left', e)}
                onTouchEnd={(e) => handleArrowKeyUp('left', e)}
                onMouseDown={(e) => handleArrowKeyDown('left', e)}
                onMouseUp={(e) => handleArrowKeyUp('left', e)}
                onMouseLeave={(e) => handleArrowKeyUp('left', e)}
                className="bg-gray-700 hover:bg-gray-600 active:bg-gray-500 text-white w-10 h-10 rounded-md border-2 border-gray-500 flex items-center justify-center shadow-lg transition-all duration-150 font-mono text-sm font-bold select-none focus:outline-none"
              >
                ←
              </button>
              <button
                onTouchStart={(e) => handleArrowKeyDown('down', e)}
                onTouchEnd={(e) => handleArrowKeyUp('down', e)}
                onMouseDown={(e) => handleArrowKeyDown('down', e)}
                onMouseUp={(e) => handleArrowKeyUp('down', e)}
                onMouseLeave={(e) => handleArrowKeyUp('down', e)}
                className="bg-gray-700 hover:bg-gray-600 active:bg-gray-500 text-white w-10 h-10 rounded-md border-2 border-gray-500 flex items-center justify-center shadow-lg transition-all duration-150 font-mono text-lg font-bold select-none focus:outline-none"
              >
                ↓
              </button>
              <button
                onTouchStart={(e) => handleArrowKeyDown('right', e)}
                onTouchEnd={(e) => handleArrowKeyUp('right', e)}
                onMouseDown={(e) => handleArrowKeyDown('right', e)}
                onMouseUp={(e) => handleArrowKeyUp('right', e)}
                onMouseLeave={(e) => handleArrowKeyUp('right', e)}
                className="bg-gray-700 hover:bg-gray-600 active:bg-gray-500 text-white w-10 h-10 rounded-md border-2 border-gray-500 flex items-center justify-center shadow-lg transition-all duration-150 font-mono text-sm font-bold select-none focus:outline-none"
              >
                →
              </button>
            </div>
          </div>

          {/* Speed control buttons - Bottom */}
          <div className="flex flex-col gap-2">
            <div className="flex flex-col items-center gap-1">
              <button
                onTouchStart={handleSpeedIncrease}
                onClick={handleSpeedIncrease}
                className="bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold shadow-lg transition-all duration-150 select-none focus:outline-none"
              >
                +
              </button>
              <span className="text-xs text-gray-300">
                Speed+
              </span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <button
                onTouchStart={handleSpeedDecrease}
                onClick={handleSpeedDecrease}
                className="bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold shadow-lg transition-all duration-150 select-none focus:outline-none"
              >
                -
              </button>
              <span className="text-xs text-gray-300">
                Speed-
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* Desktop: Only action buttons in top-right corner */
        <div className="absolute top-4 right-4 flex flex-col gap-2 pointer-events-auto z-10">
          <div className="flex items-center gap-2">
            <Button
              onClick={handlePause}
              size="sm"
              variant="outline"
              className="bg-white/90 hover:bg-white border-gray-300"
            >
              <Pause className="h-4 w-4" />
            </Button>
            <span className="text-xs text-white bg-black/70 px-2 py-1 rounded pointer-events-none">
              SPACE/ESC
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              onClick={handleHome}
              size="sm"
              variant="outline"
              className="bg-white/90 hover:bg-white border-gray-300"
            >
              <Home className="h-4 w-4" />
            </Button>
            <span className="text-xs text-white bg-black/70 px-2 py-1 rounded pointer-events-none">
              H
            </span>
          </div>
          

          <div className="flex items-center gap-2">
            <Button
              onClick={handleAudioSettings}
              size="sm"
              variant="outline"
              className="bg-white/90 hover:bg-white border-gray-300"
            >
              <Settings className="h-4 w-4" />
            </Button>
            <span className="text-xs text-white bg-black/70 px-2 py-1 rounded pointer-events-none">
              O
            </span>
          </div>
        </div>
      )}
      
      {/* Game instructions */}
      <div className={`absolute bottom-4 left-4 pointer-events-none ${isMobile ? 'right-36' : 'right-4'}`}>
        <div className="bg-black/50 text-white text-center py-2 px-4 rounded-lg text-sm">
          {isMobile ? 
            "Use arrow buttons to move • Collect yellow coins • Avoid TNT guards • Reach the portal • +/- to change speed" :
            "Use arrow keys or WASD to move • Collect yellow coins • Avoid TNT guards • Reach the portal • +/- to change speed"
          }
        </div>
      </div>
      
      {/* Audio Settings Modal */}
      <AudioSettingsMenu 
        isOpen={showAudioSettings} 
        onClose={() => setShowAudioSettings(false)} 
      />
    </>
  );
}
