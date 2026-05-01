import { create } from 'zustand';

interface GlobalCoinBankState {
  maxCoinBank: number;
  isLoading: boolean;
  error: string | null;
  fetchMaxCoinBank: () => Promise<void>;
}

export const useGlobalCoinBank = create<GlobalCoinBankState>((set, get) => ({
  maxCoinBank: 0,
  isLoading: false,
  error: null,

  fetchMaxCoinBank: async () => {
    set({ isLoading: true, error: null });

    try {
      const response = await fetch('/api/coinbank/max', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        set({ maxCoinBank: data.maxCoinBank || 0, isLoading: false, error: null });
      } else {
        set({ maxCoinBank: 0, isLoading: false, error: 'Failed to fetch max coin bank' });
      }
    } catch (error) {
      console.error('Max coin bank fetch error:', error);
      set({ maxCoinBank: 0, isLoading: false, error: 'Network error' });
    }
  },
}));