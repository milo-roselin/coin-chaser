import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useAuth } from './useAuth';

interface CoinBankState {
  totalCoins: number;
  sessionCoins: number;
  addCoins: (amount: number) => void;
  spendCoins: (amount: number) => boolean;
  resetSessionCoins: () => void;
  getTotalCoins: () => number;
  getSessionCoins: () => number;
  syncWithUser: (userCoinBank: number) => void;
  syncToDatabase: () => Promise<void>;
  clearForUnauthenticated: () => void;
  transferSessionCoinsToUser: () => Promise<void>;
  initializeForUnauthenticated: () => void;
}

export const useCoinBank = create<CoinBankState>()(
  persist(
    (set, get) => ({
      totalCoins: 0,
      sessionCoins: 0,
      
      addCoins: (amount: number) => {
        const authState = useAuth.getState();
        
        if (authState.user) {
          // For authenticated users, add to both total and session
          set((state) => ({
            totalCoins: state.totalCoins + amount,
            sessionCoins: state.sessionCoins + amount,
          }));
          // Sync to database (debounced to avoid too many calls)
          setTimeout(() => get().syncToDatabase(), 100);
        } else {
          // For unauthenticated users, only track session coins (don't persist total)
          set((state) => ({
            sessionCoins: state.sessionCoins + amount,
          }));
        }
      },

      spendCoins: (amount: number) => {
        const { totalCoins } = get();
        if (totalCoins >= amount) {
          set((state) => ({
            totalCoins: state.totalCoins - amount,
          }));
          
          // Sync to database if user is authenticated
          get().syncToDatabase();
          return true;
        }
        return false;
      },
      
      resetSessionCoins: () => {
        set({ sessionCoins: 0 });
      },
      
      getTotalCoins: () => {
        const authState = useAuth.getState();
        const { totalCoins, sessionCoins } = get();
        
        // For unauthenticated users, return session coins as their "total"
        if (!authState.user) {
          return sessionCoins;
        }
        return totalCoins;
      },
      
      getSessionCoins: () => get().sessionCoins,

      syncWithUser: (userCoinBank: number) => {
        // Only sync if the database value is different from local storage
        const { totalCoins } = get();
        if (userCoinBank !== totalCoins) {
          set({ totalCoins: userCoinBank });
        }
      },

      syncToDatabase: async () => {
        const { totalCoins } = get();
        const authState = useAuth.getState();
        
        if (authState.user) {
          const success = await authState.syncCoinBank(totalCoins);
          if (!success) {
            console.error('Failed to sync coin bank to database');
          }
        }
      },

      clearForUnauthenticated: () => {
        set({ totalCoins: 0, sessionCoins: 0 });
      },

      transferSessionCoinsToUser: async () => {
        const { sessionCoins, totalCoins } = get();
        const authState = useAuth.getState();
        
        if (authState.user && sessionCoins > 0) {
          // Add session coins to the user's database account
          const newTotal = totalCoins + sessionCoins;
          set({ totalCoins: newTotal, sessionCoins: 0 });
          
          const success = await authState.syncCoinBank(newTotal);
          if (!success) {
            console.error('Failed to transfer session coins to user account');
          }
        }
      },

      initializeForUnauthenticated: () => {
        // For unauthenticated users, ensure they start with 0 coins each session
        const authState = useAuth.getState();
        if (!authState.user) {
          set({ totalCoins: 0, sessionCoins: 0 });
        }
      },
    }),
    {
      name: 'coin-bank-storage',
      partialize: (state) => {
        // Only persist coins if user is authenticated
        const authState = useAuth.getState();
        if (authState.user) {
          return { totalCoins: state.totalCoins };
        }
        return {};
      },
    }
  )
);