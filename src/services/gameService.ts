
import { PlayerProfile, Choice, GameResponse, TimelineEvent, PlayerStats } from '@/lib/types';
import OpenAI from 'openai';
import { supabase } from "@/integrations/supabase/client";
import { getDeepSeekChatCompletion } from './deepseekService';

// Initialize OpenAI client
// Note: In production, API keys should be stored securely, not in frontend code
let openai: OpenAI | null = null;

// Function to initialize the OpenAI client with user-provided API key
export const initializeOpenAI = (apiKey: string) => {
  try {
    openai = new OpenAI({ 
      apiKey,
      dangerouslyAllowBrowser: true // Required for browser usage
    });
    localStorage.setItem('openai_initialized', 'true');
    return true;
  } catch (error) {
    console.error('Failed to initialize OpenAI:', error);
    return false;
  }
};

// Check if OpenAI is initialized
export const isOpenAIInitialized = (): boolean => {
  return openai !== null || localStorage.getItem('openai_initialized') === 'true';
};

// Generate a timeline for the game day
const generateDayTimeline = (): TimelineEvent[] => {
  // Basic timeline structure following the 4-block logic
  return [
    { 
      slot: 1, 
      type: "TREINO_TECNICO", 
      choice: null, 
      result: null 
    },
    { 
      slot: 2, 
      type: Math.random() > 0.6 ? "COLETIVA_IMPRENSA" : "LIVE_REDES", 
      choice: null, 
      result: null 
    },
    { 
      slot: 3, 
      type: "TALK_LOCKERROOM", 
      choice: null, 
      result: null 
    },
    { 
      slot: 4, 
      type: "MICRO", 
      subType: "ATAQUE_FRANCO", 
      choice: null, 
      result: null 
    }
  ];
};

// Format the timeline for the DeepSeek prompt
const formatTimelineForPrompt = (timeline: TimelineEvent[], currentChoices: Choice[]): string => {
  // Update the timeline with choices that have been made
  if (currentChoices.length > 0) {
    for (let i = 0; i < Math.min(currentChoices.length, timeline.length); i++) {
      const choice = currentChoices[i];
      if (choice && choice.choice) {
        timeline[i].choice = choice.choice;
        timeline[i].result = choice.outcome?.type || "NEUTRO";
      }
    }
  }
  
  // Format the timeline for the prompt
  let timelinePrompt = "CRONOLOGIA_DIA\n";
  timeline.forEach((event, index) => {
    const choiceText = event.choice ? 
      ` (${event.choice === 'A' ? "opção A" : "opção B"})` : "";
    const statusMarker = event.result ? "✓ " : "";
    const pendingText = event.result ? "" : " → pendente";
    
    timelinePrompt += `${index + 1}) ${statusMarker}${getPeriodName(event.slot)} – ${event.type}${
      event.subType ? " (" + event.subType + ")" : ""
    }${choiceText}${pendingText}\n`;
  });
  timelinePrompt += "###\n";
  
  return timelinePrompt;
};

const getPeriodName = (slot: number): string => {
  switch (slot) {
    case 1: return "Manhã";
    case 2: return "Tarde";
    case 3: return "Pré-jogo";
    case 4: return "Partida";
    default: return "Período";
  }
};

// Format player attributes for the prompt
const formatPlayerAttributes = (attributes: PlayerProfile['attributes']): string => {
  return `Atributos: Vel ${attributes.speed}  Fís ${attributes.physical}  Chu ${attributes.shooting}  Cab ${attributes.heading}  Car ${attributes.charisma}  Pas ${attributes.passing}  Def ${attributes.defense}`;
};

// Format career stats for the prompt
const formatCareerStats = (stats: PlayerStats): string => {
  return `Histórico: ${stats.age} anos • ${stats.matches} jogos • ${stats.goals} gols • ${stats.assists} assistências • ${stats.keyDefenses} defesas-chave • ${stats.followers.toLocaleString()} seguidores`;
};

// Extract match performance stats from narrative
const extractMatchStats = (narrative: string, outcome?: { type: string }): { goals: number, assists: number, rating: number, keyDefenses: number } => {
  const stats = { goals: 0, assists: 0, rating: 0, keyDefenses: 0 };
  
  // Determine base rating from outcome type
  if (outcome) {
    stats.rating = outcome.type === "POSITIVO" ? 1 : 
                  outcome.type === "DECISIVO" ? 2 : 
                  outcome.type === "NEGATIVO" ? 0 : 0.5;
  }
  
  // Check for goals in narrative
  if (narrative.toLowerCase().includes("gol") || 
      narrative.toLowerCase().includes("marcar") || 
      narrative.toLowerCase().includes("balança a rede")) {
    stats.goals = 1;
    stats.rating = Math.max(stats.rating, 1.5);
  }
  
  // Check for assists
  if (narrative.toLowerCase().includes("assist") || 
      narrative.toLowerCase().includes("passe decisivo")) {
    stats.assists = 1;
    stats.rating = Math.max(stats.rating, 1.2);
  }
  
  // Check for key defensive actions
  if (narrative.toLowerCase().includes("defesa crucial") || 
      narrative.toLowerCase().includes("intercepta") ||
      narrative.toLowerCase().includes("bloqueia o chute") ||
      narrative.toLowerCase().includes("desarma")) {
    stats.keyDefenses = 1;
    stats.rating = Math.max(stats.rating, 1.2);
  }
  
  return stats;
};

export const gameService = {
  startGame: async (playerProfile: PlayerProfile): Promise<GameResponse> => {
    console.log("Starting game with profile:", playerProfile);
    
    try {
      // Generate initial timeline for the day
      const timeline = generateDayTimeline();
      
      // Format the timeline for the prompt
      const timelinePrompt = formatTimelineForPrompt(timeline, []);
      
      // Use DeepSeek to generate the initial narrative
      const data = await getDeepSeekChatCompletion([
        {
          role: "system", 
          content: `Você é um narrador de um simulador de carreira de futebol. Crie narrativas envolventes para a jornada de um jogador.
                   Você deve retornar APENAS em Português. Formate suas respostas como JSON:
                   {
                     "narrative": "Texto da narrativa aqui",
                     "options": {
                       "A": "Texto da opção A",
                       "B": "Texto da opção B"
                     }
                   }`
        },
        {
          role: "user", 
          content: `MICRO_PRE
###
${timelinePrompt}
Perfil
Nome: ${playerProfile.name} • ${playerProfile.age} anos • ${playerProfile.nationality} • ${playerProfile.position} • ${playerProfile.startClub}
${formatPlayerAttributes(playerProfile.attributes)}
###
Tarefa
Como narrador, descreva o primeiro treino técnico da manhã do jogador no clube
e ofereça 2 opções: "Focar finalização" ou "Focar passe".
Devolva JSON { "narrative": "...", "options": { "A": "...", "B": "..." } } seguido da narrativa curta.
Mantenha a narrativa envolvente e fluida, em um tom dramático e imersivo.`
        }
      ]);
      
      // Parse the response
      const responseText = data.content || '';
      let parsedResponse;
      
      try {
        parsedResponse = JSON.parse(responseText);
      } catch (e) {
        console.error("Failed to parse AI response:", e);
        
        // Fallback to default response
        return {
          narrative: `<cyan>Você, ${playerProfile.name}, ${playerProfile.position.toLowerCase()} ${getNationalityAdjective(playerProfile.nationality)} de ${playerProfile.age} anos, chega ao CT do ${playerProfile.startClub} para o primeiro treino profissional. O técnico lhe observa com atenção.</cyan>`,
          nextEvent: {
            labelA: "Treinar passe",
            labelB: "Treinar finalização"
          },
          outcome: null,
          timeline: timeline
        };
      }
      
      // Wrap narrative in cyan tags
      const formattedNarrative = `<cyan>${parsedResponse.narrative}</cyan>`;
      
      return {
        narrative: formattedNarrative,
        nextEvent: {
          labelA: parsedResponse.options.A,
          labelB: parsedResponse.options.B
        },
        outcome: null,
        timeline: timeline
      };
      
    } catch (error) {
      console.error("Error calling DeepSeek AI:", error);
      
      // Fallback to default response
      return {
        narrative: `<cyan>Você, ${playerProfile.name}, ${playerProfile.position.toLowerCase()} ${getNationalityAdjective(playerProfile.nationality)} de ${playerProfile.age} anos, chega ao CT do ${playerProfile.startClub} para o primeiro treino profissional. O técnico lhe observa com atenção.</cyan>`,
        nextEvent: {
          labelA: "Treinar passe",
          labelB: "Treinar finalização"
        },
        outcome: null,
        timeline: generateDayTimeline()
      };
    }
  },
  
  makeChoice: async (
    playerProfile: PlayerProfile, 
    choiceLog: Choice[], 
    choice: string,
    careerStats?: PlayerStats
  ): Promise<GameResponse> => {
    console.log("Making choice:", choice);
    
    try {
      // Get the last choice and its details
      const lastChoice = choiceLog.length > 0 ? choiceLog[choiceLog.length - 1] : null;
      
      // Generate or retrieve the timeline
      let timeline = lastChoice?.timeline || generateDayTimeline();
      
      // Determine current slot based on choices made
      const currentSlot = Math.min(choiceLog.length + 1, 4);
      
      // Determine what type of event to show based on the current slot
      let eventType, promptTask;
      
      switch (currentSlot) {
        case 1:
          eventType = "TREINO_TECNICO";
          promptTask = `Como narrador, descreva o treino técnico da manhã
e ofereça 2 opções diferentes relacionadas ao treino técnico.`;
          break;
        case 2:
          eventType = timeline[1].type;
          if (eventType === "COLETIVA_IMPRENSA") {
            promptTask = `Como narrador, descreva a coletiva de imprensa da tarde
e ofereça 2 opções de como o jogador pode se comportar durante a coletiva.`;
          } else {
            promptTask = `Como narrador, descreva a live nas redes sociais da tarde
e ofereça 2 opções de conteúdo que o jogador pode compartilhar com seus seguidores.`;
          }
          break;
        case 3:
          eventType = "TALK_LOCKERROOM";
          promptTask = `Como narrador, descreva o momento pré-jogo no vestiário
e ofereça 2 opções de como o jogador pode se preparar mentalmente para a partida.`;
          break;
        case 4:
          eventType = "MICRO";
          promptTask = `Como narrador, descreva o primeiro lance importante do jogo
e ofereça 2 opções táticas para o jogador durante este momento crucial.`;
          break;
        default:
          eventType = "POS_JOGO";
          promptTask = `Como narrador, descreva o resultado da partida e a reação da torcida
e ofereça 2 opções de como o jogador pode reagir após o jogo.`;
      }
      
      // Update the timeline with the most recent choice
      if (lastChoice && lastChoice.choice) {
        const slotIndex = Math.max(0, currentSlot - 2); // Current slot - 1 (for 0-indexing) - 1 (for previous choice)
        if (timeline[slotIndex]) {
          timeline[slotIndex].choice = lastChoice.choice;
          timeline[slotIndex].result = lastChoice.outcome?.type || "NEUTRO";
        }
      }
      
      // Format the timeline for the prompt
      const timelinePrompt = formatTimelineForPrompt(timeline, choiceLog);
      
      // Add career stats context to the prompt
      const statsContext = careerStats ? 
        `\n${formatCareerStats(careerStats)}` : '';
      
      // Create a relevant context based on career stats
      let careerContext = "";
      if (careerStats && careerStats.goals + careerStats.assists + careerStats.matches > 5) {
        // Create narrative hooks based on career stats
        const achievements = [];
        
        if (careerStats.goals > 10) {
          achievements.push(`artilheiro com ${careerStats.goals} gols`);
        } else if (careerStats.goals > 5) {
          achievements.push(`marcou ${careerStats.goals} gols na carreira`);
        }
        
        if (careerStats.assists > 10) {
          achievements.push(`distribuiu ${careerStats.assists} assistências para seus companheiros`);
        } else if (careerStats.assists > 5) {
          achievements.push(`contribuiu com ${careerStats.assists} assistências`);
        }
        
        if (careerStats.keyDefenses > 10) {
          achievements.push(`realizou ${careerStats.keyDefenses} defesas cruciais`);
        } else if (careerStats.keyDefenses > 5) {
          achievements.push(`fez ${careerStats.keyDefenses} intervenções defensivas importantes`);
        }
        
        if (careerStats.followers > 10000) {
          achievements.push(`tem uma base fiel de ${(careerStats.followers/1000).toFixed(1)}K seguidores`);
        } else if (careerStats.followers > 1000) {
          achievements.push(`conquistou ${(careerStats.followers/1000).toFixed(1)}K seguidores`);
        }
        
        if (careerStats.matches > 50) {
          achievements.push(`já disputou ${careerStats.matches} partidas profissionais`);
        } else if (careerStats.matches > 20) {
          achievements.push(`acumula experiência de ${careerStats.matches} jogos`);
        }
        
        if (achievements.length > 0) {
          careerContext = `\nContexto de Carreira: ${achievements.join('; ')}.`;
        }
      }
      
      // Use DeepSeek to generate the next part of the narrative
      const data = await getDeepSeekChatCompletion([
        {
          role: "system", 
          content: `Você é um narrador de um simulador de carreira de futebol. Crie narrativas envolventes e dramáticas baseadas nas escolhas do jogador.
                   Retorne APENAS em Português. Formate suas respostas como JSON:
                   {
                     "narrative": "Texto da narrativa baseado na escolha",
                     "options": {
                       "A": "Próxima opção A",
                       "B": "Próxima opção B"
                     },
                     "outcome": {
                       "type": "TIPO_RESULTADO",
                       "message": "Mensagem breve sobre o resultado"
                     }
                   }
                   
                   TIPO_RESULTADO deve ser um dos: "POSITIVO", "NEGATIVO", "NEUTRO", "DECISIVO", ou "ESTRATÉGICO".
                   Faça o resultado apropriado para a escolha feita.
                   Nunca repita opções já oferecidas anteriormente. Sempre ofereça escolhas novas e criativas.
                   Mantenha a narrativa envolvente e fluida, em um tom dramático e imersivo.
                   Quando relevante, integre referências sutis às estatísticas de carreira do jogador.`
        },
        {
          role: "user", 
          content: `MICRO_PRE
###
${timelinePrompt}
Perfil
Nome: ${playerProfile.name} • ${playerProfile.age} anos • ${getNationalityAdjective(playerProfile.nationality)} • ${playerProfile.position} • ${playerProfile.startClub}
${formatPlayerAttributes(playerProfile.attributes)}${statsContext}${careerContext}
###
Histórico de escolhas anteriores:
${choiceLog.map((log, idx) => {
  const choiceText = log.choice === 'A' ? log.nextEvent?.labelA : log.nextEvent?.labelB;
  return `Escolha ${idx+1}: "${choiceText}" - Resultado: ${log.outcome?.type || 'NEUTRO'}`;
}).join('\n')}

Escolha atual: ${choice === 'A' ? 'Opção A' : 'Opção B'} - "${choice === 'A' ? lastChoice?.nextEvent?.labelA : lastChoice?.nextEvent?.labelB}"

###
Tarefa
${promptTask}
Devolva JSON { "narrative": "...", "options": { "A": "...", "B": "..." }, "outcome": { "type": "...", "message": "..." } }`
        }
      ]);
      
      // Parse the response
      const responseText = data.content || '';
      let parsedResponse;
      
      try {
        parsedResponse = JSON.parse(responseText);
      } catch (e) {
        console.error("Failed to parse AI response:", e);
        
        // Fallback to a default response
        return {
          narrative: `<cyan>O treinador analisa sua decisão e direciona o time para o próximo exercício.</cyan>`,
          nextEvent: {
            labelA: "Continuar treinando com foco",
            labelB: "Conversar com colegas de time"
          },
          outcome: {
            type: "NEUTRO" as const,
            message: "O treino continua normalmente"
          },
          timeline: timeline,
          matchStats: { rating: 0.5, keyDefenses: 0 }
        };
      }
      
      // Validate outcome type
      const validOutcomeTypes = ["POSITIVO", "NEGATIVO", "NEUTRO", "DECISIVO", "ESTRATÉGICO"];
      let outcomeType = parsedResponse.outcome?.type || "NEUTRO";
      if (!validOutcomeTypes.includes(outcomeType)) {
        outcomeType = "NEUTRO";
      }
      
      // Wrap narrative in appropriate formatting tags
      let formattedNarrative = parsedResponse.narrative;
      
      // Default to cyan, but check content for potential negative outcomes
      const negativeKeywords = ["lesão", "machucado", "contundido", "lesionado", "dor", "perdeu", "falha"];
      const hasNegativeContext = negativeKeywords.some(keyword => formattedNarrative.toLowerCase().includes(keyword));
      
      if (outcomeType === "NEGATIVO" || hasNegativeContext) {
        formattedNarrative = `<yellow>${formattedNarrative}</yellow>`;
      } else if (outcomeType === "DECISIVO") {
        formattedNarrative = `<magenta>${formattedNarrative}</magenta>`;
      } else {
        formattedNarrative = `<cyan>${formattedNarrative}</cyan>`;
      }
      
      // Move to the next slot in the timeline
      if (currentSlot <= timeline.length) {
        timeline[currentSlot - 1] = {
          ...timeline[currentSlot - 1],
          choice: null,
          result: null
        };
      }
      
      // Extract match stats from narrative and outcome
      const matchStats = currentSlot >= 3 ? 
        extractMatchStats(formattedNarrative, parsedResponse.outcome) : 
        { goals: 0, assists: 0, rating: 0, keyDefenses: 0 };
      
      return {
        narrative: formattedNarrative,
        nextEvent: {
          labelA: parsedResponse.options.A,
          labelB: parsedResponse.options.B
        },
        outcome: {
          type: outcomeType as "POSITIVO" | "NEGATIVO" | "NEUTRO" | "DECISIVO" | "ESTRATÉGICO",
          message: parsedResponse.outcome?.message || "O jogo continua"
        },
        timeline: timeline,
        matchStats: matchStats
      };
      
    } catch (error) {
      console.error("Error calling DeepSeek AI:", error);
      
      // Fallback to a default response
      return {
        narrative: `<cyan>O treinador avalia seu desempenho e faz algumas anotações.</cyan>`,
        nextEvent: {
          labelA: "Focar no próximo treino",
          labelB: "Pedir feedback ao treinador"
        },
        outcome: {
          type: "NEUTRO" as const,
          message: "Treinamento em andamento"
        },
        timeline: generateDayTimeline(),
        matchStats: { rating: 0.5, keyDefenses: 0 }
      };
    }
  }
};

// Helper function to get nationality adjective
function getNationalityAdjective(code: string): string {
  const nationalities: Record<string, string> = {
    'BR': 'brasileiro',
    'US': 'americano',
    'FR': 'francês',
    'JP': 'japonês',
    'AR': 'argentino',
    'ES': 'espanhol',
    'DE': 'alemão',
    'IT': 'italiano',
    'UK': 'inglês',
    'PT': 'português'
  };
  
  return nationalities[code] || code;
}
