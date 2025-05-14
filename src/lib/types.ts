export interface PlayerProfile {
  name: string;
  age: number;
  nationality: string;
  position: string;
  startClub: string;
  createdAt?: string;
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

export interface NationalityOption {
  value: string;
  label: string;
}

export interface PositionOption {
  value: string;
  label: string;
}

export interface Choice {
  id: number;
  event: string;
  choice: 'A' | 'B';
  timestamp: string;
  narrative?: string;
  nextEvent?: {
    labelA: string;
    labelB: string;
  };
  outcome?: {
    type: 'POSITIVO' | 'NEGATIVO' | 'NEUTRO' | 'DECISIVO' | 'ESTRATÉGICO';
    message: string;
  };
  timeline?: TimelineEvent[];
  xpGain?: number;
  attributeFocus?: keyof PlayerProfile['attributes'] | null;
  matchStats?: {
    goals: number;
    assists: number;
    rating: number;
    keyDefenses: number;
  };
  attributeImproved?: {
    name: keyof PlayerProfile['attributes'];
    oldValue: number;
    newValue: number;
  };
}

export interface TimelineEvent {
  slot: number;
  type: string;
  subType?: string;
  choice: 'A' | 'B' | null;
  result: string | null;
}

export interface GameResponse {
  narrative: string;
  nextEvent: {
    labelA: string;
    labelB: string;
  };
  outcome: {
    type: 'POSITIVO' | 'NEGATIVO' | 'NEUTRO' | 'DECISIVO' | 'ESTRATÉGICO';
    message: string;
  };
  timeline: TimelineEvent[];
  matchStats?: {
    goals: number;
    assists: number;
    rating: number;
    keyDefenses: number;
  };
  xpGain?: number;
  attributeFocus?: keyof PlayerProfile['attributes'] | null;
  attributeImproved?: {
    name: keyof PlayerProfile['attributes'];
    oldValue: number;
    newValue: number;
  };
}

export interface PlayerStats {
  matches: number;
  goals: number;
  assists: number;
  keyDefenses: number;
  age: number;
  followers: number;
}

export interface SeasonStats {
  goals: number;
  assists: number;
  appearances: number;
  averageRating: number;
  totalRating: number;
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
  gameEnded: boolean;
  activeScreen: "creation" | "game" | "history";
  creationStep: number;
  xpPool: number;
  attributeFocus: keyof PlayerProfile['attributes'] | null;
  weekCount: number;
  seasonStats: SeasonStats;
  careerStats: PlayerStats;
}
