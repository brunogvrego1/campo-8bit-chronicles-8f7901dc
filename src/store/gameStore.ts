
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
  xpPool: 0,
  attributeFocus: null,
  weekCount: 0,
  seasonStats: {
    goals: 0,
    assists: 0,
    appearances: 0,
    averageRating: 0,
    totalRating: 0,
  },
  careerStats: {
    matches: 0,
    goals: 0,
    assists: 0,
    keyDefenses: 0,
    age: 18,
    followers: 100 // Starting with some initial followers
  }
};

export const useGameStore = create<GameState & {
  setPlayerProfile: (profile: PlayerProfile) => void;
  addChoice: (choice: Choice) => void;
  setCurrentNarrative: (narrative: string) => void;
  setNextOptions: (options: { labelA: string; labelB: string; }) => void;
  setLoading: (isLoading: boolean) => void;
  startGame: () => void;
  setActiveScreen: (screen: "creation" | "game" | "history") => void;
  setCreationStep: (step: number) => void;
  resetGame: () => void;
  addXp: (amount: number) => void;
  setAttributeFocus: (attribute: keyof PlayerProfile['attributes'] | null) => void;
  processWeekEnd: () => void;
  updateAttribute: (attribute: keyof PlayerProfile['attributes'], newValue: number) => void;
  addToSeasonStats: (stats: { goals?: number, assists?: number, rating?: number }) => void;
  resetSeasonStats: () => void;
  updateCareerStats: (stats: { 
    matches?: number, 
    goals?: number, 
    assists?: number, 
    keyDefenses?: number, 
    followers?: number 
  }) => void;
  incrementAge: () => void;
}>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      setPlayerProfile: (profile) => set(() => ({ 
        playerProfile: profile,
        careerStats: {
          ...initialState.careerStats,
          age: profile.age
        }
      })),
      
      addChoice: (choice) => set((state) => ({ 
        choiceLog: [...state.choiceLog, choice] 
      })),
      
      setCurrentNarrative: (narrative) => set(() => ({ 
        currentNarrative: narrative 
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
      
      addXp: (amount) => {
        // Get current state
        const { playerProfile, xpPool } = get();
        
        // Apply age multiplier
        const age = playerProfile?.age || 18;
        let multiplier = 1.0;
        
        if (age <= 22) multiplier = 1.2;
        else if (age >= 28) multiplier = 0.7;
        
        // Calculate final XP gain
        const finalAmount = Math.round(amount * multiplier);
        
        set({ xpPool: xpPool + finalAmount });
        
        // Process attribute improvements based on new XP
        get().processWeekEnd();
      },
      
      setAttributeFocus: (attribute) => set(() => ({
        attributeFocus: attribute
      })),
      
      processWeekEnd: () => {
        const state = get();
        const { playerProfile, xpPool, attributeFocus } = state;
        
        if (!playerProfile || !attributeFocus) return;
        
        // Calculate potential (basic implementation)
        const potential = 10; // Can be made dynamic in the future
        
        // Current value of the focused attribute
        const currentValue = playerProfile.attributes[attributeFocus];
        
        // If already at or above potential, no improvement
        if (currentValue >= potential) return;
        
        // Calculate cost for next point
        const costToNextPoint = 5 * (currentValue - 2);
        
        let remainingXp = xpPool;
        let newValue = currentValue;
        
        // Check if we have enough XP for improvement
        if (remainingXp >= costToNextPoint) {
          // Improve attribute and deduct XP
          newValue += 1;
          remainingXp -= costToNextPoint;
          
          // Update the attribute
          state.updateAttribute(attributeFocus, newValue);
          
          // Update week count
          set({ weekCount: state.weekCount + 1 });
        }
        
        // Set remaining XP
        set({ xpPool: remainingXp });
      },
      
      updateAttribute: (attribute, newValue) => set(state => {
        if (!state.playerProfile) return state;
        
        return {
          playerProfile: {
            ...state.playerProfile,
            attributes: {
              ...state.playerProfile.attributes,
              [attribute]: newValue
            }
          }
        };
      }),
      
      addToSeasonStats: (stats) => set(state => {
        const currentStats = state.seasonStats;
        const appearances = stats.rating !== undefined ? currentStats.appearances + 1 : currentStats.appearances;
        const totalRating = stats.rating !== undefined 
          ? currentStats.totalRating + stats.rating 
          : currentStats.totalRating;
          
        return {
          seasonStats: {
            goals: currentStats.goals + (stats.goals || 0),
            assists: currentStats.assists + (stats.assists || 0),
            appearances,
            totalRating,
            averageRating: appearances > 0 ? totalRating / appearances : 0
          }
        };
      }),
      
      resetSeasonStats: () => set({
        seasonStats: {
          goals: 0,
          assists: 0,
          appearances: 0,
          averageRating: 0,
          totalRating: 0
        }
      }),
      
      updateCareerStats: (stats) => set(state => {
        return {
          careerStats: {
            ...state.careerStats,
            matches: state.careerStats.matches + (stats.matches || 0),
            goals: state.careerStats.goals + (stats.goals || 0),
            assists: state.careerStats.assists + (stats.assists || 0),
            keyDefenses: state.careerStats.keyDefenses + (stats.keyDefenses || 0),
            followers: state.careerStats.followers + (stats.followers || 0)
          }
        };
      }),
      
      incrementAge: () => set(state => {
        return {
          careerStats: {
            ...state.careerStats,
            age: state.careerStats.age + 1
          }
        };
      })
    }),
    {
      name: "campo-8bit-storage",
    }
  )
);
