
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { GameState, PlayerProfile, Choice } from '@/lib/types';

const initialState: GameState = {
  playerProfile: null,
  choiceLog: [],
  currentNarrative: '',
  nextOptions: null,
  isLoading: false,
  gameStarted: false,
  activeScreen: "creation",
  creationStep: 0,
};

export const useGameStore = create<GameState & {
  setPlayerProfile: (profile: PlayerProfile) => void;
  addChoice: (choice: Choice) => void;
  setCurrentNarrative: (narrative: string | ((prev: string) => string)) => void;
  setNextOptions: (options: { labelA: string; labelB: string; }) => void;
  setLoading: (isLoading: boolean) => void;
  startGame: () => void;
  setActiveScreen: (screen: "creation" | "game" | "history") => void;
  setCreationStep: (step: number) => void;
  resetGame: () => void;
}>()(
  persist(
    (set) => ({
      ...initialState,
      
      setPlayerProfile: (profile) => set(() => ({ 
        playerProfile: profile 
      })),
      
      addChoice: (choice) => set((state) => ({ 
        choiceLog: [...state.choiceLog, choice] 
      })),
      
      setCurrentNarrative: (narrative) => set((state) => ({ 
        currentNarrative: typeof narrative === 'function' ? narrative(state.currentNarrative) : narrative 
      })),
      
      setNextOptions: (options) => set(() => ({ 
        nextOptions: options 
      })),
      
      setLoading: (isLoading) => set(() => ({ 
        isLoading 
      })),
      
      startGame: () => set(() => ({ 
        gameStarted: true,
        activeScreen: "game" 
      })),
      
      setActiveScreen: (screen) => set(() => ({ 
        activeScreen: screen 
      })),
      
      setCreationStep: (step) => set(() => ({ 
        creationStep: step 
      })),
      
      resetGame: () => set(() => ({ 
        ...initialState 
      })),
    }),
    {
      name: "campo-8bit-storage",
    }
  )
);
