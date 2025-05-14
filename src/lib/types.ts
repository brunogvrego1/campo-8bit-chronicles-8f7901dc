
export interface PlayerProfile {
  name: string;
  age: number;
  nationality: string;
  position: string;
  startClub?: string;
  createdAt: string;
  attributes: {
    speed: number;
    physical: number;
    shooting: number;
    heading: number;
    charisma: number;
    passing: number;
    defense: number;
  };
}

export interface TimelineEvent {
  slot: number;
  type: string;
  subType?: string;
  choice: string | null;
  result: string | null;
}

export interface Choice {
  id: number;
  event: string;
  choice: string | null;
  timestamp: string;
  narrative?: string;
  nextEvent?: {
    labelA: string;
    labelB: string;
  };
  outcome?: {
    type: "POSITIVO" | "NEGATIVO" | "NEUTRO" | "DECISIVO" | "ESTRATÉGICO";
    message: string;
  };
  timeline?: TimelineEvent[];
  xpGain?: number;
  attributeFocus?: keyof PlayerProfile['attributes'] | null;
  attributeImproved?: {
    name: keyof PlayerProfile['attributes'];
    oldValue: number;
    newValue: number;
  };
  matchStats?: {
    goals?: number;
    assists?: number;
    rating?: number; // 0-2 scale as per narrativeRating
  };
}

export interface GameState {
  playerProfile: PlayerProfile | null;
  choiceLog: Choice[];
  currentNarrative: string;
  nextOptions: {
    labelA: string;
    labelB: string;
  } | null;
  isLoading: boolean;
  gameStarted: boolean;
  activeScreen: "creation" | "game" | "history";
  creationStep: number;
  xpPool: number;
  attributeFocus: keyof PlayerProfile['attributes'] | null;
  weekCount: number;
  seasonStats: {
    goals: number;
    assists: number;
    appearances: number;
    averageRating: number;
    totalRating: number;
  };
}

export interface NationalityOption {
  code: string;
  name: string;
  flag: string;
  startClub: string;
  league: string;
}

export interface PositionOption {
  code: string;
  name: string;
}

export interface GameResponse {
  narrative: string;
  nextEvent: {
    labelA: string;
    labelB: string;
  };
  outcome?: {
    type: "POSITIVO" | "NEGATIVO" | "NEUTRO" | "DECISIVO" | "ESTRATÉGICO";
    message: string;
  };
  timeline?: TimelineEvent[];
  xpGain?: number;
  attributeFocus?: keyof PlayerProfile['attributes'] | null;
  matchStats?: {
    goals?: number;
    assists?: number;
    rating?: number;
  };
}
