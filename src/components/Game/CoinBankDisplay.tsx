import { useCoinBank } from "@/lib/stores/useCoinBank";
import { useAuth } from "@/lib/stores/useAuth";

interface CoinBankDisplayProps {
  className?: string;
  showSessionCoins?: boolean;
}

export default function CoinBankDisplay({ className = "", showSessionCoins = false }: CoinBankDisplayProps) {
  const { totalCoins, sessionCoins } = useCoinBank();
  const { user } = useAuth();
  
  // Show authenticated user's database coins, or local storage for guests
  const displayCoins = user ? user.coinBank : totalCoins;

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* Leprechaun's Pot of Gold with Rainbow SVG */}
      <div className="relative">
        <svg width="80" height="75" viewBox="0 0 100 75" className="drop-shadow-lg">
          {/* Rainbow extending from pot to edge of screen */}
          <path d="M10 50 Q50 5 90 50" fill="none" stroke="#FF0000" strokeWidth="5" opacity="0.95" />
          <path d="M11 52 Q50 8 89 52" fill="none" stroke="#FF8C00" strokeWidth="5" opacity="0.95" />
          <path d="M12 54 Q50 11 88 54" fill="none" stroke="#FFD700" strokeWidth="5" opacity="0.95" />
          <path d="M13 56 Q50 14 87 56" fill="none" stroke="#32CD32" strokeWidth="5" opacity="0.95" />
          <path d="M14 58 Q50 17 86 58" fill="none" stroke="#1E90FF" strokeWidth="5" opacity="0.95" />
          <path d="M15 60 Q50 20 85 60" fill="none" stroke="#4169E1" strokeWidth="5" opacity="0.95" />
          <path d="M16 62 Q50 23 84 62" fill="none" stroke="#8A2BE2" strokeWidth="5" opacity="0.95" />
          
          {/* Round pot body with 3D effect */}
          <defs>
            <radialGradient id="potGradient" cx="30%" cy="30%">
              <stop offset="0%" stopColor="#2a2a2a" />
              <stop offset="100%" stopColor="#0a0a0a" />
            </radialGradient>
          </defs>
          
          {/* Main round pot body */}
          <circle
            cx="50"
            cy="55"
            r="20"
            fill="url(#potGradient)"
            stroke="#000000"
            strokeWidth="2"
          />
          
          {/* Pot opening (elliptical top) */}
          <ellipse
            cx="50"
            cy="40"
            rx="22"
            ry="6"
            fill="#1a1a1a"
            stroke="#000000"
            strokeWidth="2"
          />
          
          {/* 3D Gold coins only at top of pot with depth and layering */}
          <defs>
            <radialGradient id="coinGradient" cx="35%" cy="35%">
              <stop offset="0%" stopColor="#FFED4E" />
              <stop offset="70%" stopColor="#FFD700" />
              <stop offset="100%" stopColor="#B8860B" />
            </radialGradient>
            <radialGradient id="coinGradientMid" cx="35%" cy="35%">
              <stop offset="0%" stopColor="#FFD700" />
              <stop offset="70%" stopColor="#DAA520" />
              <stop offset="100%" stopColor="#B8860B" />
            </radialGradient>
            <radialGradient id="coinGradientBack" cx="35%" cy="35%">
              <stop offset="0%" stopColor="#DAA520" />
              <stop offset="70%" stopColor="#B8860B" />
              <stop offset="100%" stopColor="#8B6914" />
            </radialGradient>
          </defs>
          
          {/* Gold coins clustered at top opening only for 3D effect */}
          {/* Back layer - deeper in pot, smaller perspective */}
          <ellipse cx="45" cy="44" rx="3" ry="1.2" fill="url(#coinGradientBack)" opacity="0.7" />
          <ellipse cx="52" cy="45" rx="2.5" ry="1" fill="url(#coinGradientBack)" opacity="0.7" />
          <ellipse cx="38" cy="46" rx="2.8" ry="1.1" fill="url(#coinGradientBack)" opacity="0.7" />
          
          {/* Middle layer - partially visible */}
          <ellipse cx="42" cy="42" rx="4" ry="1.8" fill="url(#coinGradientMid)" opacity="0.85" />
          <ellipse cx="55" cy="43" rx="3.5" ry="1.6" fill="url(#coinGradientMid)" opacity="0.85" />
          <ellipse cx="48" cy="44" rx="3.2" ry="1.5" fill="url(#coinGradientMid)" opacity="0.85" />
          
          {/* Top layer - most visible, spilling over rim */}
          <ellipse cx="45" cy="40" rx="5" ry="2.5" fill="url(#coinGradient)" />
          <ellipse cx="52" cy="41" rx="4.5" ry="2.2" fill="url(#coinGradient)" />
          <ellipse cx="38" cy="42" rx="4.2" ry="2" fill="url(#coinGradient)" />
          <ellipse cx="49" cy="39" rx="3.8" ry="1.8" fill="url(#coinGradient)" />
          
          {/* Coin shine effects on top coins only */}
          <ellipse cx="45" cy="38.5" rx="2.5" ry="1" fill="#FFFF99" opacity="0.7" />
          <ellipse cx="52" cy="39.5" rx="2" ry="0.8" fill="#FFFF99" opacity="0.7" />
          <ellipse cx="38" cy="40.5" rx="1.8" ry="0.7" fill="#FFFF99" opacity="0.6" />
          
          {/* Magical sparkles */}
          <g fill="#FFFFFF" opacity="0.9">
            <circle cx="25" cy="20" r="1.2" />
            <circle cx="75" cy="20" r="1.2" />
            <circle cx="50" cy="10" r="1" />
            <circle cx="15" cy="35" r="0.8" />
            <circle cx="85" cy="35" r="0.8" />
          </g>
        </svg>
        
        {/* Coin count on pot front */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
          <span className="text-xl font-black text-yellow-300 text-center block leading-none" 
                style={{
                  textShadow: '3px 3px 0px #000000, -2px -2px 0px #000000, 2px -2px 0px #000000, -2px 2px 0px #000000',
                  filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.9))'
                }}>
{displayCoins.toLocaleString()}
          </span>
        </div>
      </div>
      
      {/* Session coins indicator */}
      {showSessionCoins && sessionCoins > 0 && (
        <div className="text-sm font-semibold text-yellow-700 bg-yellow-100 px-2 py-1 rounded-md border border-yellow-300">
          +{sessionCoins}
        </div>
      )}
    </div>
  );
}