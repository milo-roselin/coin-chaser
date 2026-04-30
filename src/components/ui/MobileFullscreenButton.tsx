import { useState, useEffect } from 'react';
import { Maximize, Minimize } from 'lucide-react';
import { Button } from './button';
import { isMobileDevice, requestFullscreen, exitFullscreen, isFullscreen } from '../../lib/utils/mobileFullscreen';

interface MobileFullscreenButtonProps {
  className?: string;
}

export default function MobileFullscreenButton({ className = '' }: MobileFullscreenButtonProps) {
  const [fullscreen, setFullscreen] = useState(false);
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    // Only show on mobile devices
    setShowButton(isMobileDevice());
    setFullscreen(isFullscreen());

    // Listen for fullscreen changes
    const handleFullscreenChange = () => {
      setFullscreen(isFullscreen());
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  }, []);

  const handleToggleFullscreen = () => {
    if (fullscreen) {
      exitFullscreen().catch(() => {
        // Handle exit fullscreen errors silently
      });
    } else {
      requestFullscreen().catch(() => {
        // Handle fullscreen request errors silently
      });
    }
  };

  if (!showButton) {
    return null;
  }

  return (
    <Button
      onClick={handleToggleFullscreen}
      variant="outline"
      size="sm"
      className={`p-2 bg-black/20 border-white/30 text-white hover:bg-white/20 backdrop-blur-sm ${className}`}
      title={fullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
    >
      {fullscreen ? (
        <Minimize className="h-4 w-4" />
      ) : (
        <Maximize className="h-4 w-4" />
      )}
    </Button>
  );
}