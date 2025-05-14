
import { supabase } from "@/integrations/supabase/client";
import { PlayerProfile, GameResponse, Choice, TimelineEvent } from "@/lib/types";

// Variable to track if OpenAI has been initialized
let isOpenAIInitialized = false;

// Function to initialize OpenAI with an API key
export const initializeOpenAI = (apiKey: string): boolean => {
  try {
    // We're just storing the initialization state for now
    // In a real implementation, this would configure the OpenAI client
    isOpenAIInitialized = true;
    return true;
  } catch (error) {
    console.error("Error initializing OpenAI:", error);
    return false;
  }
};

// Function to check if OpenAI has been initialized
export const isOpenAIInitialized = (): boolean => {
  return isOpenAIInitialized;
};

const BASE_RATING = 5;
const CELEBRITY_THRESHOLD = 100000;

const generateInitialTimeline = (): TimelineEvent[] => {
  return Array.from({ length: 52 }, (_, i) => ({
    slot: i + 1,
    type: 'WEEK',
    choice: null,
    result: null,
  }));
};

const updateTimeline = (timeline: TimelineEvent[], newEvents: TimelineEvent[]): TimelineEvent[] => {
  const updatedTimeline = [...timeline];
  newEvents.forEach(event => {
    if (event.slot >= 1 && event.slot <= 52) {
      updatedTimeline[event.slot - 1] = { ...event };
    }
  });
  return updatedTimeline;
};

const buildGameResponse = (
  narrative: string,
  labelA: string,
  labelB: string,
  timelineEvents: TimelineEvent[],
  currentTimeline: TimelineEvent[],
  outcomeType: 'POSITIVO' | 'NEGATIVO' | 'NEUTRO' | 'DECISIVO' | 'ESTRATÉGICO',
  outcomeMessage: string,
  matchStats?: { goals: number; assists: number; rating: number; keyDefenses: number; },
  xpGain?: number,
  attributeFocus?: keyof PlayerProfile['attributes'] | null,
  attributeImproved?: { name: keyof PlayerProfile['attributes']; oldValue: number; newValue: number; }
): GameResponse => {
  const updatedTimeline = updateTimeline(currentTimeline, timelineEvents);

  return {
    narrative,
    nextEvent: { labelA, labelB },
    outcome: {
      type: outcomeType,
      message: outcomeMessage,
    },
    timeline: updatedTimeline,
    matchStats,
    xpGain,
    attributeFocus,
    attributeImproved
  };
};

// Modified to store choices in memory instead of database since no table exists yet
let choiceHistory: Choice[] = [];

const saveChoiceToDatabase = async (choiceData: Omit<Choice, 'id'>): Promise<void> => {
  try {
    // Instead of using Supabase, we'll store in memory for now
    const newChoice = {
      ...choiceData,
      id: choiceHistory.length
    };
    choiceHistory.push(newChoice);
  } catch (error) {
    console.error("Error saving choice:", error);
  }
};

const calculateRating = (
  goals: number,
  assists: number,
  keyDefenses: number,
  position: string
): number => {
  let rating = BASE_RATING;

  rating += goals * 2;
  rating += assists * 1.5;

  if (position === 'GOL') {
    rating += keyDefenses * 0.5;
  } else {
    rating += keyDefenses * 0.2;
  }

  return Math.max(0, rating);
};

const calculateFollowersChange = (
  rating: number,
  outcomeType: 'POSITIVO' | 'NEGATIVO' | 'NEUTRO' | 'DECISIVO' | 'ESTRATÉGICO'
): number => {
  let followerChange = 0;

  switch (outcomeType) {
    case 'POSITIVO':
      followerChange += Math.round(rating * 10);
      break;
    case 'NEGATIVO':
      followerChange -= Math.round(rating * 15);
      break;
    case 'DECISIVO':
      followerChange += Math.round(rating * 20);
      break;
    case 'ESTRATÉGICO':
      followerChange += Math.round(rating * 12);
      break;
    default:
      followerChange += Math.round(rating * 5);
      break;
  }

  return followerChange;
};

const isCelebrity = (followers: number): boolean => {
  return followers >= CELEBRITY_THRESHOLD;
};

const generateTrainingEvent = (
  playerProfile: PlayerProfile,
  choice: 'A' | 'B',
  currentTimeline: TimelineEvent[]
): GameResponse => {
  const { attributes } = playerProfile;
  const attributeKeys = Object.keys(attributes) as (keyof PlayerProfile['attributes'])[];
  const randomAttribute = attributeKeys[Math.floor(Math.random() * attributeKeys.length)];

  let narrative = '';
  let outcomeMessage = '';
  let xpGain = 0;
  let attributeFocus: keyof PlayerProfile['attributes'] | null = null;
  let attributeImproved = undefined;
  let timelineEvents: TimelineEvent[] = [];

  if (choice === 'A') {
    narrative = `Você focou em aprimorar seu ${randomAttribute} durante o treino.`;
    xpGain = 10;
    attributeFocus = randomAttribute;
    outcomeMessage = `Sua dedicação em ${randomAttribute} pode trazer resultados em breve.`;
    timelineEvents = [{ slot: 1, type: 'TRAINING', choice: 'A', result: `Treinou ${randomAttribute}` }];
  } else {
    narrative = "Você optou por um treino mais leve, focando na diversão e evitando o estresse.";
    xpGain = 5;
    outcomeMessage = "Um treino mais leve pode ser bom para evitar lesões, mas o progresso é mais lento.";
    timelineEvents = [{ slot: 1, type: 'TRAINING', choice: 'B', result: 'Treino leve' }];
  }

  return buildGameResponse(
    narrative,
    "Continuar Treinando",
    "Descansar",
    timelineEvents,
    currentTimeline,
    'NEUTRO',
    outcomeMessage,
    undefined,
    xpGain,
    attributeFocus,
    attributeImproved
  );
};

const generateMatchEvent = (
  playerProfile: PlayerProfile,
  choice: 'A' | 'B',
  currentTimeline: TimelineEvent[]
): GameResponse => {
  const { position } = playerProfile;
  const isGoalKeeper = position === 'GOL';

  let narrative = '';
  let outcomeMessage = '';
  let goals = 0;
  let assists = 0;
  let keyDefenses = 0;
  let rating = 0;
  let timelineEvents: TimelineEvent[] = [];

  if (choice === 'A') {
    narrative = "Você se dedicou ao máximo durante a partida, buscando o melhor desempenho.";
    const success = Math.random() > 0.3;

    if (success) {
      goals = Math.random() > 0.7 ? 1 : 0;
      assists = Math.random() > 0.5 ? 1 : 0;
      keyDefenses = isGoalKeeper ? Math.floor(Math.random() * 5) : Math.floor(Math.random() * 2);
      rating = calculateRating(goals, assists, keyDefenses, position);

      outcomeMessage = "Sua dedicação resultou em um ótimo desempenho na partida!";
      timelineEvents = [{ slot: 1, type: 'MATCH', choice: 'A', result: 'Vitória' }];
    } else {
      outcomeMessage = "Apesar do esforço, a partida não foi como esperado.";
      timelineEvents = [{ slot: 1, type: 'MATCH', choice: 'A', result: 'Derrota' }];
    }
  } else {
    narrative = "Você jogou de forma mais conservadora, priorizando a segurança e evitando riscos.";
    const success = Math.random() > 0.5;

    if (success) {
      goals = Math.random() > 0.8 ? 1 : 0;
      assists = Math.random() > 0.6 ? 1 : 0;
      keyDefenses = isGoalKeeper ? Math.floor(Math.random() * 3) : Math.floor(Math.random() * 1);
      rating = calculateRating(goals, assists, keyDefenses, position);

      outcomeMessage = "Sua abordagem conservadora garantiu um desempenho seguro e eficiente.";
      timelineEvents = [{ slot: 1, type: 'MATCH', choice: 'B', result: 'Empate' }];
    } else {
      outcomeMessage = "A falta de ousadia pode ter limitado o impacto na partida.";
      timelineEvents = [{ slot: 1, type: 'MATCH', choice: 'B', result: 'Derrota' }];
    }
  }

  return buildGameResponse(
    narrative,
    "Próxima Partida",
    "Descansar",
    timelineEvents,
    currentTimeline,
    'NEUTRO',
    outcomeMessage,
    { goals, assists, rating, keyDefenses },
    5,
    null,
    undefined
  );
};

const generateMediaEvent = (
  playerProfile: PlayerProfile,
  choice: 'A' | 'B',
  currentTimeline: TimelineEvent[]
): GameResponse => {
  const followers = playerProfile?.careerStats?.followers || 0;
  const isWellKnown = isCelebrity(followers);

  let narrative = '';
  let outcomeMessage = '';
  let followerChange = 0;
  let timelineEvents: TimelineEvent[] = [];

  if (choice === 'A') {
    narrative = "Você decidiu dar uma entrevista, buscando aumentar sua visibilidade.";
    const success = Math.random() > (isWellKnown ? 0.2 : 0.5);

    if (success) {
      followerChange = Math.floor(Math.random() * 500);
      outcomeMessage = "A entrevista foi um sucesso e atraiu novos fãs!";
      timelineEvents = [{ slot: 1, type: 'MEDIA', choice: 'A', result: 'Sucesso' }];
    } else {
      followerChange = -Math.floor(Math.random() * 300);
      outcomeMessage = "A entrevista não teve o impacto esperado e gerou algumas críticas.";
      timelineEvents = [{ slot: 1, type: 'MEDIA', choice: 'A', result: 'Fracasso' }];
    }
  } else {
    narrative = "Você preferiu evitar a mídia, focando em sua privacidade e desempenho no campo.";
    outcomeMessage = "Manter a discrição pode ser bom para evitar distrações, mas limita o crescimento de sua imagem.";
    timelineEvents = [{ slot: 1, type: 'MEDIA', choice: 'B', result: 'Evitou' }];
  }

  return buildGameResponse(
    narrative,
    "Próxima Entrevista",
    "Focar nos Treinos",
    timelineEvents,
    currentTimeline,
    'NEUTRO',
    outcomeMessage,
    undefined,
    5,
    null,
    undefined
  );
};

const generateSponsorEvent = (
  playerProfile: PlayerProfile,
  choice: 'A' | 'B',
  currentTimeline: TimelineEvent[]
): GameResponse => {
  const followers = playerProfile?.careerStats?.followers || 0;
  const isFamous = isCelebrity(followers);

  let narrative = '';
  let outcomeMessage = '';
  let followerChange = 0;
  let timelineEvents: TimelineEvent[] = [];

  if (choice === 'A') {
    narrative = "Você aceitou uma proposta de patrocínio, buscando aumentar seus ganhos e visibilidade.";
    const success = Math.random() > (isFamous ? 0.3 : 0.6);

    if (success) {
      followerChange = Math.floor(Math.random() * 400);
      outcomeMessage = "O patrocínio foi benéfico e impulsionou sua imagem!";
      timelineEvents = [{ slot: 1, type: 'SPONSOR', choice: 'A', result: 'Sucesso' }];
    } else {
      followerChange = -Math.floor(Math.random() * 200);
      outcomeMessage = "O patrocínio não gerou o retorno esperado e afetou sua imagem.";
      timelineEvents = [{ slot: 1, type: 'SPONSOR', choice: 'A', result: 'Fracasso' }];
    }
  } else {
    narrative = "Você recusou a proposta de patrocínio, priorizando sua liberdade e imagem pessoal.";
    outcomeMessage = "Recusar um patrocínio pode ser bom para manter a autenticidade, mas limita as oportunidades financeiras.";
    timelineEvents = [{ slot: 1, type: 'SPONSOR', choice: 'B', result: 'Recusou' }];
  }

  return buildGameResponse(
    narrative,
    "Analisar Patrocínios",
    "Focar nos Treinos",
    timelineEvents,
    currentTimeline,
    'NEUTRO',
    outcomeMessage,
    undefined,
    5,
    null,
    undefined
  );
};

const generatePostMatchEvent = (
  playerProfile: PlayerProfile,
  choice: 'A' | 'B',
  currentTimeline: TimelineEvent[]
): GameResponse => {
  let narrative = '';
  let outcomeMessage = '';
  let xpGain = 8;
  let followerChange = 0;
  let timelineEvents: TimelineEvent[] = [];

  if (choice === 'A') {
    narrative = "Você decide falar com a imprensa após o jogo para comentar o resultado.";
    const success = Math.random() > 0.4;

    if (success) {
      followerChange = Math.floor(Math.random() * 300);
      outcomeMessage = "Suas palavras foram bem recebidas pela mídia e pelos torcedores!";
      timelineEvents = [{ slot: 1, type: 'POST_MATCH', choice: 'A', result: 'Boa entrevista' }];
    } else {
      followerChange = -Math.floor(Math.random() * 150);
      outcomeMessage = "Sua entrevista gerou algumas controvérsias nas redes sociais.";
      timelineEvents = [{ slot: 1, type: 'POST_MATCH', choice: 'A', result: 'Entrevista polêmica' }];
    }
  } else {
    narrative = "Você prefere evitar a imprensa e ir direto para o vestiário após o jogo.";
    outcomeMessage = "Você evitou possíveis polêmicas, mas também perdeu uma oportunidade de se comunicar com os fãs.";
    timelineEvents = [{ slot: 1, type: 'POST_MATCH', choice: 'B', result: 'Evitou entrevista' }];
  }

  return buildGameResponse(
    narrative,
    "Comemorar com a Equipe",
    "Recuperação Individual",
    timelineEvents,
    currentTimeline,
    'NEUTRO',
    outcomeMessage,
    undefined,
    xpGain,
    null,
    undefined
  );
};

const generateRandomEvent = (
  playerProfile: PlayerProfile,
  choice: 'A' | 'B',
  currentTimeline: TimelineEvent[]
): GameResponse => {
  const eventType = Math.random();

  if (eventType < 0.25) {
    return generateTrainingEvent(playerProfile, choice, currentTimeline);
  } else if (eventType < 0.5) {
    return generateMatchEvent(playerProfile, choice, currentTimeline);
  } else if (eventType < 0.75) {
    return generateMediaEvent(playerProfile, choice, currentTimeline);
  } else {
    return generateSponsorEvent(playerProfile, choice, currentTimeline);
  }
};

// Fix the issues with missing properties in mouseScore function
const mouseScore = (player: PlayerProfile) => {
  // Define variables
  const xpGain = Math.floor(Math.random() * 10);
  const attributeKeys = Object.keys(player.attributes) as (keyof PlayerProfile['attributes'])[];
  const attributeFocus = attributeKeys[Math.floor(Math.random() * attributeKeys.length)];
  
  return {
    matchStats: {
      goals: 0,
      assists: 0,
      rating: Math.floor(Math.random() * 3) + 7,
      keyDefenses: Math.floor(Math.random() * 3)
    },
    xpGain,
    attributeFocus
  };
};

// Fix the missing properties in generateRandomMatchStats function
const generateRandomMatchStats = (playerProfile: PlayerProfile) => {
  return {
    goals: 0,
    assists: 0,
    rating: Math.floor(Math.random() * 2) + 7,
    keyDefenses: Math.floor(Math.random() * 2)
  };
};

// New function to generate a sequence of events for a week
const generateWeekEvents = (
  playerProfile: PlayerProfile,
  currentTimeline: TimelineEvent[]
): GameResponse[] => {
  // Generate 2 off-field events
  const offFieldEvent1 = Math.random() < 0.5 
    ? generateMediaEvent(playerProfile, Math.random() < 0.5 ? 'A' : 'B', currentTimeline)
    : generateSponsorEvent(playerProfile, Math.random() < 0.5 ? 'A' : 'B', currentTimeline);
  
  const offFieldEvent2 = Math.random() < 0.5 
    ? generateTrainingEvent(playerProfile, Math.random() < 0.5 ? 'A' : 'B', currentTimeline)
    : generateMediaEvent(playerProfile, Math.random() < 0.5 ? 'A' : 'B', currentTimeline);
  
  // Generate 2 match day events
  const matchEvent1 = generateMatchEvent(playerProfile, Math.random() < 0.5 ? 'A' : 'B', currentTimeline);
  const matchEvent2 = generateMatchEvent(playerProfile, Math.random() < 0.5 ? 'A' : 'B', currentTimeline);
  
  // Generate 1 post-match event
  const postMatchEvent = generatePostMatchEvent(playerProfile, Math.random() < 0.5 ? 'A' : 'B', currentTimeline);
  
  return [offFieldEvent1, offFieldEvent2, matchEvent1, matchEvent2, postMatchEvent];
};

export const gameService = {
  startGame: async (playerProfile: PlayerProfile): Promise<GameResponse> => {
    const initialNarrative = `Bem-vindo à sua jornada no mundo do futebol! Você é um jovem talento de ${playerProfile.age} anos, vindo de ${playerProfile.nationality} e jogando como ${playerProfile.position} no clube ${playerProfile.startClub}. Prepare-se para tomar decisões que irão moldar sua carreira.`;
    const initialTimeline = generateInitialTimeline();

    return {
      narrative: initialNarrative,
      nextEvent: {
        labelA: "Começar a Treinar",
        labelB: "Analisar Estatísticas"
      },
      outcome: {
        type: "NEUTRO",
        message: "O início de uma nova jornada."
      },
      timeline: initialTimeline,
    };
  },

  chooseNextEvent: async (
    playerProfile: PlayerProfile,
    choice: 'A' | 'B',
    currentTimeline: TimelineEvent[]
  ): Promise<GameResponse> => {
    const gameResponse = generateRandomEvent(playerProfile, choice, currentTimeline);

    // Save choice to database
    const choiceData: Omit<Choice, 'id'> = {
      event: 'RANDOM_EVENT',
      choice: choice,
      timestamp: new Date().toISOString(),
      narrative: gameResponse.narrative,
      nextEvent: gameResponse.nextEvent,
      outcome: {
        type: gameResponse.outcome.type,
        message: gameResponse.outcome.message
      },
      timeline: gameResponse.timeline,
      matchStats: gameResponse.matchStats || {
        goals: 0,
        assists: 0,
        rating: 4,
        keyDefenses: 1
      },
    };
    await saveChoiceToDatabase(choiceData);

    return gameResponse;
  },

  // Simulate a more complex scenario
  handleComplexScenario: async (
    playerProfile: PlayerProfile,
    choice: 'A' | 'B',
    currentTimeline: TimelineEvent[]
  ): Promise<GameResponse> => {
    let narrative = '';
    let outcomeMessage = '';
    let timelineEvents: TimelineEvent[] = [];

    if (choice === 'A') {
      narrative = "Você decidiu investir em um novo empresário.";
      outcomeMessage = "Novo empresário pode abrir portas.";
      timelineEvents = [{ slot: 1, type: 'DECISION', choice: 'A', result: 'Novo empresário' }];
    } else {
      narrative = "Você decidiu continuar com seu empresário atual.";
      outcomeMessage = "Lealdade é importante.";
      timelineEvents = [{ slot: 1, type: 'DECISION', choice: 'B', result: 'Manteve empresário' }];
    }

    // Save choice to database
    const choiceData: Omit<Choice, 'id'> = {
      event: 'COMPLEX_SCENARIO',
      choice: choice,
      timestamp: new Date().toISOString(),
      narrative: narrative,
      nextEvent: { labelA: "Continuar Carreira", labelB: "Analisar Propostas" },
      outcome: {
        type: "ESTRATÉGICO",
        message: outcomeMessage
      },
      timeline: timelineEvents,
      matchStats: {
        goals: 0,
        assists: 0,
        rating: 7,
        keyDefenses: 0
      },
    };
    await saveChoiceToDatabase(choiceData);

    return buildGameResponse(
      narrative,
      "Continuar Carreira",
      "Analisar Propostas",
      timelineEvents,
      currentTimeline,
      'ESTRATÉGICO',
      outcomeMessage,
      undefined,
      undefined,
      null,
      undefined
    );
  },
  
  // New function to start a new week with multiple events
  startNewWeek: async (
    playerProfile: PlayerProfile,
    currentTimeline: TimelineEvent[]
  ): Promise<GameResponse[]> => {
    return generateWeekEvents(playerProfile, currentTimeline);
  },
  
  // This will be the function called from GameScreen
  makeChoice: async (
    playerProfile: PlayerProfile,
    choiceLog: Choice[],
    choice: 'A' | 'B',
    careerStats: any // Make sure to use the correct type here
  ): Promise<GameResponse> => {
    // Use the player's current timeline from the last choice
    const currentTimeline = choiceLog.length > 0 && choiceLog[choiceLog.length - 1].timeline 
      ? choiceLog[choiceLog.length - 1].timeline 
      : generateInitialTimeline();
    
    return generateRandomEvent(playerProfile, choice, currentTimeline);
  }
};
