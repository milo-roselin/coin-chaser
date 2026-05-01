import { create } from "zustand";
import { subscribeWithSelector, persist } from "zustand/middleware";
import { useAudio } from "./useAudio";
import { useCoinBank } from "./useCoinBank";

export type GameState = "start" | "playing" | "gameOver" | "victory" | "leaderboard" | "nextLevel";

interface CoinGameState {
  gameState: GameState;
  score: number;
  coinsCollected: number;
  playerPosition: { x: number; y: number };
  currentLevel: number;
  highestLevelUnlocked: number;
  totalScore: number;
  totalCoinsCollected: number;
  penaltyApplied: boolean;
  // Power-up states
  magnetActive: boolean;
  magnetTimeLeft: number;
  extraLives: number;
  shieldActive: boolean;
  invulnerable: boolean;
  invulnerabilityTimeLeft: number;
  
  // Actions
  startGame: () => void;
  startFromLevel: (level: number) => void;
  resetGame: () => void;
  resetProgress: () => void;
  endGame: () => void;
  winGame: () => void;
  applyPenalty: () => Promise<void>;
  showLeaderboard: () => void;
  showNextLevel: () => void;
  nextLevel: () => void;
  updateScore: (points: number) => void;
  updateCoinsCollected: () => void;
  setPlayerPosition: (x: number, y: number) => void;
  activateMagnet: () => void;
  addExtraLife: () => void;
  useExtraLife: () => boolean;
  updateMagnetTimer: () => void;
  updateInvulnerabilityTimer: () => void;
  activateInvulnerability: () => void;
  setHighestLevelUnlocked: (level: number) => void;
}

export const useCoinGame = create<CoinGameState>()(
  persist(
    subscribeWithSelector((set, get) => ({
      gameState: "start",
      score: 0,
      coinsCollected: 0,
      playerPosition: { x: 50, y: 300 },
      currentLevel: 1,
      highestLevelUnlocked: 1,
      totalScore: 0,
      totalCoinsCollected: 0,
      penaltyApplied: false,
      magnetActive: false,
      magnetTimeLeft: 0,
      extraLives: 0,
      shieldActive: false,
      invulnerable: false,
      invulnerabilityTimeLeft: 0,
      
      startGame: () => {
        set({ 
          gameState: "playing",
          score: 0,
          coinsCollected: 0,
          playerPosition: { x: 50, y: 300 },
          currentLevel: 1,
          penaltyApplied: false,
          magnetActive: false,
          magnetTimeLeft: 0,
          extraLives: 0,
          shieldActive: false,
          invulnerable: false,
          invulnerabilityTimeLeft: 0
        });
      },
      
      startFromLevel: (level: number) => {
        set({ 
          gameState: "playing",
          score: 0,
          coinsCollected: 0,
          playerPosition: { x: 50, y: 300 },
          currentLevel: level,
          penaltyApplied: false,
          magnetActive: false,
          magnetTimeLeft: 0,
          // Keep extra lives between levels
          shieldActive: get().extraLives > 0
        });
      },
      
      resetGame: () => {
        // Reset session coins in bank when starting new game
        const { resetSessionCoins } = useCoinBank.getState();
        resetSessionCoins();
        
        set((state) => ({ 
          gameState: "start",
          score: 0,
          coinsCollected: 0,
          playerPosition: { x: 50, y: 300 },
          currentLevel: 1,
          // Keep checkpoint progress
          highestLevelUnlocked: state.highestLevelUnlocked,
          totalScore: state.totalScore,
          totalCoinsCollected: state.totalCoinsCollected
        }));
      },
      
      resetProgress: () => {
        set({ 
          gameState: "start",
          score: 0,
          coinsCollected: 0,
          playerPosition: { x: 50, y: 300 },
          currentLevel: 1,
          highestLevelUnlocked: 1,
          totalScore: 0,
          totalCoinsCollected: 0
        });
      },
      
      endGame: () => {
        // No longer check for extra lives here - let the game engine handle shield protection
        set((state) => ({
          gameState: state.gameState === "playing" ? "gameOver" : state.gameState
        }));
        // Stop background music when game ends
        const { stopBackgroundMusic } = useAudio.getState();
        stopBackgroundMusic();
      },
      
      winGame: () => {
        set((state) => {
          const newLevel = state.currentLevel + 1;
          const newTotalScore = state.totalScore + state.score;
          return {
            gameState: state.gameState === "playing" ? "victory" : state.gameState,
            highestLevelUnlocked: Math.max(state.highestLevelUnlocked, newLevel),
            totalScore: newTotalScore
          };
        });
        // Stop background music when game is won
        const { stopBackgroundMusic } = useAudio.getState();
        stopBackgroundMusic();
      },

      applyPenalty: async () => {
        const state = get();
        if (state.penaltyApplied) {
          return; // Don't apply penalty twice
        }

        // Check if user is authenticated and apply penalty
        const { user } = (await import('./useAuth')).useAuth.getState();
        if (user) {
          try {
            const response = await fetch('/api/scores/penalty', {
              method: 'POST',
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json',
              },
            });
            
            if (response.ok) {
              const result = await response.json();
              console.log(`TNT Penalty Applied: ${result.message}`);
              
              // Refresh user stats to reflect the new score
              const { useUserStats } = await import('./useUserStats');
              useUserStats.getState().fetchUserStats();
              
              // Mark penalty as applied
              set({ penaltyApplied: true });
            } else {
              console.error('Failed to apply TNT penalty');
            }
          } catch (error) {
            console.error('Error applying TNT penalty:', error);
          }
        }
      },
      
      showLeaderboard: () => {
        set({ gameState: "leaderboard" });
      },
      
      showNextLevel: () => {
        set({ gameState: "nextLevel" });
      },
      
      nextLevel: () => {
        set((state) => ({
          gameState: "playing",
          currentLevel: state.currentLevel + 1,
          playerPosition: { x: 50, y: 300 }
        }));
      },
      
      updateScore: (points: number) => {
        set((state) => ({ 
          score: state.score + points 
        }));
      },
      
      updateCoinsCollected: () => {
        // Add coin to the bank (this will automatically sync to database if user is authenticated)
        const { addCoins } = useCoinBank.getState();
        addCoins(1);
        
        set((state) => ({ 
          coinsCollected: state.coinsCollected + 1,
          totalCoinsCollected: state.totalCoinsCollected + 1
        }));
      },
      
      setPlayerPosition: (x: number, y: number) => {
        set({ playerPosition: { x, y } });
      },

      activateMagnet: () => {
        console.log('Store: Activating magnet for 10 seconds');
        set({ 
          magnetActive: true, 
          magnetTimeLeft: 10000 // 10 seconds in milliseconds
        });
      },

      addExtraLife: () => {
        console.log('Store: Adding extra life and activating shield');
        set((state) => ({ 
          extraLives: state.extraLives + 1,
          shieldActive: true
        }));
      },

      useExtraLife: () => {
        const state = get();
        if (state.extraLives > 0) {
          set({ 
            extraLives: state.extraLives - 1,
            shieldActive: state.extraLives > 1 // Keep shield if more lives remain
          });
          return true;
        }
        return false;
      },

      updateMagnetTimer: () => {
        set((state) => {
          if (state.magnetActive && state.magnetTimeLeft > 0) {
            const newTimeLeft = Math.max(0, state.magnetTimeLeft - 16); // ~60fps
            return {
              magnetTimeLeft: newTimeLeft,
              magnetActive: newTimeLeft > 0
            };
          }
          return state;
        });
      },

      // Alias for useExtraLife for consistency with callback naming
      useShield: () => {
        return get().useExtraLife();
      },

      updateInvulnerabilityTimer: () => {
        set((state) => {
          if (state.invulnerable && state.invulnerabilityTimeLeft > 0) {
            const newTimeLeft = Math.max(0, state.invulnerabilityTimeLeft - 16); // ~60fps
            return {
              invulnerabilityTimeLeft: newTimeLeft,
              invulnerable: newTimeLeft > 0
            };
          }
          return state;
        });
      },

      activateInvulnerability: () => {
        console.log('Store: Activating invulnerability for 2 seconds');
        set({ 
          invulnerable: true, 
          invulnerabilityTimeLeft: 2000 // 2 seconds in milliseconds
        });
      },

      setHighestLevelUnlocked: (level: number) => {
        set({ highestLevelUnlocked: level });
      }
    })),
    {
      name: "coin-game-checkpoint",
      version: 1,
      partialize: (state) => ({
        highestLevelUnlocked: state.highestLevelUnlocked,
        totalScore: state.totalScore
      })
    }
  )
);
