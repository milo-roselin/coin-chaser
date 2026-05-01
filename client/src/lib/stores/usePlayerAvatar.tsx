import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Avatar {
  id: string;
  name: string;
  image: string;
  unlockCost: number;
  description: string;
}

interface PlayerAvatarState {
  selectedAvatar: string;
  unlockedAvatars: string[];
  availableAvatars: Avatar[];
  selectAvatar: (avatarId: string) => void;
  unlockAvatar: (avatarId: string) => boolean;
  isAvatarUnlocked: (avatarId: string) => boolean;
  getSelectedAvatar: () => Avatar | undefined;
}

const defaultAvatars: Avatar[] = [
  {
    id: 'leprechaun',
    name: 'Mr. MoneyBags',
    image: '', // Will be drawn as the current green circle
    unlockCost: 0,
    description: 'The wealthy gentleman from Monopoly who loves collecting rent and coins'
  },
  {
    id: 'count-olaf',
    name: 'Count Olaf',
    image: '', // Animated avatar, no image needed
    unlockCost: 100,
    description: 'The villainous actor from A Series of Unfortunate Events'
  },
  {
    id: 'tom-nook',
    name: 'Tom Nook',
    image: '', // Animated avatar, no image needed
    unlockCost: 200,
    description: 'The business-savvy tanuki from Animal Crossing'
  },
  {
    id: 'ebenezer-scrooge',
    name: 'Ebenezer Scrooge',
    image: '', // Animated avatar, no image needed
    unlockCost: 300,
    description: 'The miserly old man who learned the value of generosity'
  },
  {
    id: 'wario',
    name: 'Wario',
    image: '', // Animated avatar, no image needed
    unlockCost: 400,
    description: 'The greedy anti-hero who loves coins and treasure'
  }
];

export const usePlayerAvatar = create<PlayerAvatarState>()(
  persist(
    (set, get) => ({
      selectedAvatar: 'leprechaun',
      unlockedAvatars: ['leprechaun'], // Default avatar is always unlocked
      availableAvatars: defaultAvatars,
      
      selectAvatar: (avatarId: string) => {
        const { isAvatarUnlocked } = get();
        if (isAvatarUnlocked(avatarId)) {
          set({ selectedAvatar: avatarId });
        }
      },
      
      unlockAvatar: (avatarId: string) => {
        const { unlockedAvatars, availableAvatars } = get();
        const avatar = availableAvatars.find(a => a.id === avatarId);
        
        if (!avatar || unlockedAvatars.includes(avatarId)) {
          return false; // Avatar doesn't exist or already unlocked
        }
        
        set({ 
          unlockedAvatars: [...unlockedAvatars, avatarId]
        });
        return true;
      },
      
      isAvatarUnlocked: (avatarId: string) => {
        const { unlockedAvatars } = get();
        return unlockedAvatars.includes(avatarId);
      },
      
      getSelectedAvatar: () => {
        const { selectedAvatar, availableAvatars } = get();
        return availableAvatars.find(a => a.id === selectedAvatar);
      }
    }),
    {
      name: 'player-avatar-storage',
      partialize: (state) => ({
        selectedAvatar: state.selectedAvatar,
        unlockedAvatars: state.unlockedAvatars
      })
    }
  )
);