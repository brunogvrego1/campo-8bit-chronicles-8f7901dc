
export interface PlayerProfile {
  name: string;
  age: number;
  nationality: string;
  position: string;
  startClub?: string;
  createdAt: string;
}

export interface Choice {
  id: number;
  event: string;
  choice: string | null;
  timestamp: string;
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
}
