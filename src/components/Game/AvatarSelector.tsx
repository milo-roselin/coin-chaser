import React, { useEffect } from 'react';
import { usePlayerAvatar } from '../../lib/stores/usePlayerAvatar';
import { useCoinBank } from '../../lib/stores/useCoinBank';
import { useAudio } from '../../lib/stores/useAudio';

interface AvatarSelectorProps {
  onClose: () => void;
}

export function AvatarSelector({ onClose }: AvatarSelectorProps) {
  const { 
    availableAvatars, 
    selectedAvatar, 
    unlockedAvatars, 
    selectAvatar, 
    unlockAvatar, 
    isAvatarUnlocked 
  } = usePlayerAvatar();
  
  const { totalCoins, spendCoins } = useCoinBank();
  const { playCoin } = useAudio();

  const handleAvatarSelect = (avatarId: string, unlockCost: number) => {
    const isUnlocked = isAvatarUnlocked(avatarId);
    
    if (isUnlocked) {
      // Avatar is already unlocked, just select it
      selectAvatar(avatarId);
      playCoin();
    } else if (totalCoins >= unlockCost) {
      // Player has enough coins to unlock
      if (spendCoins(unlockCost)) {
        unlockAvatar(avatarId);
        selectAvatar(avatarId);
        playCoin();
      }
    }
    // If not enough coins, do nothing (could add error feedback later)
  };

  // Keyboard shortcuts for avatar selection
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      
      // Map keyboard shortcuts to avatar IDs
      const keyToAvatar: { [key: string]: string } = {
        '1': 'leprechaun',       // Mr. MoneyBags
        '2': 'count-olaf',       // Count Olaf
        '3': 'tom-nook',         // Tom Nook  
        '4': 'ebenezer-scrooge', // Ebenezer Scrooge
        '5': 'wario'             // Wario
      };

      if (keyToAvatar[key]) {
        const avatarId = keyToAvatar[key];
        const avatar = availableAvatars.find(a => a.id === avatarId);
        if (avatar) {
          handleAvatarSelect(avatarId, avatar.unlockCost);
        }
      }

      // ESC to close
      if (key === 'escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [availableAvatars, onClose]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg p-6 max-w-md w-full mx-4 border border-yellow-400">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-yellow-400">Choose Your Avatar</h2>
          <button
            onClick={onClose}
            className="text-yellow-400 hover:text-yellow-300 text-xl font-bold"
          >
            ×
          </button>
        </div>
        
        <div className="mb-4 text-center text-sm text-gray-400">
          Use keys 1-5 to select avatars, ESC to close
        </div>

        <div className="mb-4 text-center">
          <div className="text-yellow-400 font-semibold">
            Your Coins: {totalCoins}
          </div>
        </div>

        <div className="space-y-3">
          {availableAvatars.map((avatar, index) => {
            const isSelected = selectedAvatar === avatar.id;
            const isUnlocked = isAvatarUnlocked(avatar.id);
            const canAfford = totalCoins >= avatar.unlockCost;
            const keyNumber = index + 1;

            return (
              <div
                key={avatar.id}
                className={`
                  p-3 rounded-lg border-2 transition-all relative
                  ${isSelected 
                    ? 'border-yellow-400 bg-yellow-900 bg-opacity-30' 
                    : isUnlocked 
                      ? 'border-gray-600 hover:border-yellow-600 cursor-pointer'
                      : canAfford 
                        ? 'border-green-600 hover:border-green-400 cursor-pointer'
                        : 'border-red-600 opacity-60 cursor-not-allowed'
                  }
                `}
                onClick={() => handleAvatarSelect(avatar.id, avatar.unlockCost)}
              >
                {/* Keyboard shortcut indicator */}
                <div className="absolute top-2 left-2 w-6 h-6 bg-gray-700 rounded-full flex items-center justify-center text-xs text-yellow-400 font-bold">
                  {keyNumber}
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
                    {avatar.id === 'leprechaun' ? (
                      <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center relative overflow-hidden">
                        <img 
                          src="/mr-moneybags.png" 
                          alt="Mr. MoneyBags" 
                          className="w-full h-full object-cover"
                          style={{ imageRendering: 'pixelated' }}
                        />
                      </div>
                    ) : avatar.id === 'count-olaf' ? (
                      <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center relative overflow-hidden">
                        <img 
                          src="/images/count-olaf.png" 
                          alt="Count Olaf" 
                          className="w-full h-full object-cover"
                          style={{ imageRendering: 'pixelated' }}
                          onError={(e) => {
                            console.error('Failed to load Count Olaf avatar image');
                            e.currentTarget.style.display = 'none';
                          }}
                          onLoad={() => console.log('Count Olaf avatar image loaded successfully')}
                        />
                      </div>
                    ) : avatar.id === 'tom-nook' ? (
                      <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center relative overflow-hidden">
                        <img 
                          src="/images/tom-nook.png" 
                          alt="Tom Nook" 
                          className="w-full h-full object-cover"
                          style={{ imageRendering: 'pixelated' }}
                          onError={(e) => {
                            console.error('Failed to load Tom Nook avatar image');
                            e.currentTarget.style.display = 'none';
                          }}
                          onLoad={() => console.log('Tom Nook avatar image loaded successfully')}
                        />
                      </div>
                    ) : avatar.id === 'ebenezer-scrooge' ? (
                      <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center relative overflow-hidden">
                        <img 
                          src="/scrooge-avatar.png" 
                          alt="Ebenezer Scrooge" 
                          className="w-full h-full object-cover"
                          style={{ imageRendering: 'pixelated' }}
                        />
                      </div>
                    ) : avatar.id === 'wario' ? (
                      <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center relative overflow-hidden">
                        <img 
                          src="/images/wario-thumbnail.png" 
                          alt="Wario" 
                          className="w-full h-full object-cover"
                          style={{ imageRendering: 'pixelated' }}
                          onError={(e) => {
                            console.error('Failed to load Wario avatar image at /images/wario-thumbnail.png');
                            // Fallback to yellow background if image fails
                            e.currentTarget.style.display = 'none';
                            const parent = e.currentTarget.parentElement;
                            if (parent) {
                              parent.style.background = '#FFD700';
                              parent.innerHTML = '<div style="color: #800080; font-size: 20px; font-weight: bold;">W</div>';
                            }
                          }}
                          onLoad={() => console.log('Wario avatar image loaded successfully from /images/wario-thumbnail.png')}
                        />
                      </div>
                    ) : (
                      <div className="w-10 h-10 bg-gray-500 rounded-full"></div>
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-white">{avatar.name}</h3>
                      {isSelected ? (
                        <div className="text-yellow-400 text-sm font-semibold">
                          SELECTED
                        </div>
                      ) : isUnlocked ? (
                        <div className="text-green-400 text-sm font-semibold">
                          OWNED
                        </div>
                      ) : (
                        <div className={`text-sm font-semibold ${canAfford ? 'text-yellow-400' : 'text-red-400'}`}>
                          {avatar.unlockCost} coins
                        </div>
                      )}
                    </div>
                    <p className="text-gray-300 text-sm">{avatar.description}</p>
                    {!isUnlocked && avatar.unlockCost > 0 && (
                      <div className="mt-2 text-xs">
                        {canAfford ? (
                          <span className="text-green-400">Click to unlock!</span>
                        ) : (
                          <span className="text-red-400">
                            Need {avatar.unlockCost - totalCoins} more coins
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 text-center">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-yellow-600 text-black font-semibold rounded hover:bg-yellow-500 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}