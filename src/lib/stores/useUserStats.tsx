import { create } from 'zustand';
import { useAuth } from './useAuth';

interface UserStats {
  highestScore: number;
  totalCoins: number;
  highestLevel: number;
  recentScores: Array<{
    score: number;
    coins: number;
    level: number;
    createdAt: string;
  }>;
}

interface UserStatsStore {
  stats: UserStats | null;
  isLoading: boolean;
  error: string | null;
  fetchUserStats: () => Promise<void>;
  clearStats: () => void;
  getHighestScore: () => number;
  getHighestLevel: () => number;
}

export const useUserStats = create<UserStatsStore>((set, get) => ({
  stats: null,
  isLoading: false,
  error: null,

  fetchUserStats: async () => {
    const authState = useAuth.getState();
    if (!authState.user) {
      set({ stats: null, error: null });
      return;
    }

    set({ isLoading: true, error: null });

    try {
      // Use the new user stats endpoint that gets data directly from database
      const response = await fetch('/api/user/stats', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        
        // Use database values directly
        const stats: UserStats = {
          highestScore: data.totalScore || 0,
          totalCoins: data.coinBank || 0,
          highestLevel: data.highestLevel || 1,
          recentScores: [], // Not needed for display
        };

        set({ stats, isLoading: false, error: null });
      } else {
        set({ stats: null, isLoading: false, error: 'Failed to fetch user stats' });
      }
    } catch (error) {
      console.error('User stats fetch error:', error);
      set({ stats: null, isLoading: false, error: 'Network error' });
    }
  },

  clearStats: () => {
    set({ stats: null, error: null });
  },

  getHighestScore: () => {
    const { stats } = get();
    const authState = useAuth.getState();
    
    if (authState.user && stats) {
      return stats.highestScore;
    }
    
    // Fall back to local storage for guests
    const localStats = JSON.parse(localStorage.getItem('coin-game-storage') || '{}');
    return localStats.state?.totalScore || 0;
  },

  getHighestLevel: () => {
    const { stats } = get();
    const authState = useAuth.getState();
    
    if (authState.user && stats) {
      return Math.max(stats.highestLevel, 1);
    }
    
    // Fall back to local storage for guests
    const localStats = JSON.parse(localStorage.getItem('coin-game-storage') || '{}');
    return localStats.state?.highestLevelUnlocked || 1;
  },
}));