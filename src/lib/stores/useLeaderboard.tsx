import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface LeaderboardScore {
  name: string;
  score: number;
  coins: number;
  date: string;
  playerId?: string;
  nameEdited?: boolean;
}

interface LeaderboardState {
  scores: LeaderboardScore[];
  currentPlayerId: string;
  addScore: (score: LeaderboardScore) => void;
  removeScore: (name: string) => void;
  updateScore: (oldName: string, newName: string) => void;
  canEditName: (score: LeaderboardScore) => boolean;
  clearScores: () => void;
}

// Generate a unique player ID for this session
const generatePlayerId = () => {
  const stored = localStorage.getItem('coin-game-player-id');
  if (stored) return stored;
  
  const newId = Date.now().toString(36) + Math.random().toString(36).substr(2);
  localStorage.setItem('coin-game-player-id', newId);
  return newId;
};

export const useLeaderboard = create<LeaderboardState>()(
  persist(
    (set, get) => ({
      scores: [],
      currentPlayerId: generatePlayerId(),
      
      addScore: (newScore: LeaderboardScore) => {
        set((state) => {
          // Add player ID to the score
          const scoreWithId = { 
            ...newScore, 
            playerId: state.currentPlayerId,
            nameEdited: false
          };
          
          // Remove existing entries for this user (by playerId)
          const scoresWithoutUser = state.scores.filter(score => score.playerId !== state.currentPlayerId);
          
          // Add the new score and sort by score descending
          const updatedScores = [...scoresWithoutUser, scoreWithId]
            .sort((a, b) => b.score - a.score)
            .slice(0, 10); // Keep only top 10 scores
          
          return { scores: updatedScores };
        });
      },
      
      removeScore: (name: string) => {
        set((state) => ({
          scores: state.scores.filter(score => score.name !== name)
        }));
      },

      updateScore: (oldName: string, newName: string) => {
        set((state) => ({
          scores: state.scores.map(score => 
            score.name === oldName 
              ? { ...score, name: newName.trim(), nameEdited: true }
              : score
          )
        }));
      },

      canEditName: (score: LeaderboardScore) => {
        const state = get();
        return score.playerId === state.currentPlayerId;
      },
      
      clearScores: () => {
        set({ scores: [] });
      }
    }),
    {
      name: "coin-game-leaderboard",
      version: 2,
      migrate: (persistedState: any, version: number) => {
        if (version < 2) {
          // Migrate old scores to new format
          const playerId = generatePlayerId();
          return {
            ...persistedState,
            currentPlayerId: playerId,
            scores: persistedState.scores?.map((score: any) => ({
              ...score,
              playerId: playerId,
              nameEdited: false
            })) || []
          };
        }
        return persistedState;
      }
    }
  )
);
