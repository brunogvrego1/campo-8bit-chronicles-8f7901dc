
import { PlayerProfile, Choice, GameResponse } from '@/lib/types';
import OpenAI from 'openai';

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

export const gameService = {
  startGame: async (playerProfile: PlayerProfile): Promise<GameResponse> => {
    console.log("Starting game with profile:", playerProfile);
    
    // If OpenAI is not initialized, use mock service
    if (!openai) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return {
        narrative: `<cyan>Você, ${playerProfile.name}, ${playerProfile.position.toLowerCase()} ${getNationalityAdjective(playerProfile.nationality)} de ${playerProfile.age} anos, chega ao CT do ${playerProfile.startClub} para o primeiro treino profissional. O técnico lhe observa com atenção.</cyan>`,
        nextEvent: {
          labelA: "Treinar passe",
          labelB: "Treinar finalização"
        },
        outcome: null // No outcome for the first narrative
      };
    }
    
    try {
      // Use OpenAI to generate the initial narrative
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system", 
            content: `You are a football career simulator game. Create engaging narratives for a player's journey. 
                     You should output ONLY in Portuguese. Format your responses like this:
                     {
                       "narrative": "Story text here",
                       "options": {
                         "A": "Option A text",
                         "B": "Option B text"
                       }
                     }`
          },
          {
            role: "user", 
            content: `Generate the introduction for a football player career. Player details:
                     Name: ${playerProfile.name}
                     Age: ${playerProfile.age}
                     Position: ${playerProfile.position}
                     Nationality: ${getNationalityAdjective(playerProfile.nationality)}
                     Starting Club: ${playerProfile.startClub}`
          }
        ],
      });
      
      // Parse the response
      const responseText = completion.choices[0].message.content || '';
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
          outcome: null
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
        outcome: null
      };
      
    } catch (error) {
      console.error("Error calling OpenAI:", error);
      
      // Fallback to default response
      return {
        narrative: `<cyan>Você, ${playerProfile.name}, ${playerProfile.position.toLowerCase()} ${getNationalityAdjective(playerProfile.nationality)} de ${playerProfile.age} anos, chega ao CT do ${playerProfile.startClub} para o primeiro treino profissional. O técnico lhe observa com atenção.</cyan>`,
        nextEvent: {
          labelA: "Treinar passe",
          labelB: "Treinar finalização"
        },
        outcome: null
      };
    }
  },
  
  makeChoice: async (playerProfile: PlayerProfile, choiceLog: Choice[], choice: string): Promise<GameResponse> => {
    console.log("Making choice:", choice);
    
    // If OpenAI is not initialized or we're offline, use mock service
    if (!openai) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const lastChoiceEvent = choiceLog.length > 0 ? choiceLog[choiceLog.length - 1].event : "";
      
      // Prepare a default outcome message with a properly typed outcome
      const outcome = {
        type: choice === "A" ? "POSITIVO" as const : (Math.random() > 0.5 ? "POSITIVO" as const : "NEUTRO" as const), 
        message: choice === "A" ? "Decisão bem recebida pela equipe" : "Resultado com efeito limitado"
      };
      
      // Use mock service logic
      if (lastChoiceEvent === "INTRO") {
        if (choice === "A") {
          return {
            narrative: `<cyan>Você decide aprimorar a precisão dos seus passes. O técnico fica impressionado com sua visão de jogo e capacidade de distribuição.</cyan>`,
            nextEvent: {
              labelA: "Participar do coletivo",
              labelB: "Fazer trabalho físico extra"
            },
            outcome: {
              type: "POSITIVO" as const,
              message: "Treinador impressionado com sua visão de jogo"
            }
          };
        } else {
          return {
            narrative: `<cyan>Você foca nos chutes a gol. Após uma série de finalizações precisas, o técnico anota algo em sua prancheta com um sorriso discreto.</cyan>`,
            nextEvent: {
              labelA: "Mostrar habilidades de drible",
              labelB: "Praticar bolas paradas"
            },
            outcome: {
              type: "POSITIVO" as const,
              message: "Finalizações precisas chamaram atenção"
            }
          };
        }
      } else {
        // Generate a random scenario for subsequent choices
        const scenarios = [
          {
            narrative: `<cyan>O técnico anuncia que você foi selecionado para o time titular no próximo jogo. Seus companheiros olham para você com respeito.</cyan>`,
            nextEvent: {
              labelA: "Agradecer a confiança",
              labelB: "Prometer marcar gols"
            },
            outcome: {
              type: "POSITIVO" as const,
              message: "Selecionado para o time titular!"
            }
          },
          {
            narrative: `<yellow>Durante o treino, um companheiro faz uma entrada dura em você. Seus tornozelos doem, mas não parece grave.</yellow>`,
            nextEvent: {
              labelA: "Confrontar o jogador",
              labelB: "Ignorar e seguir treinando"
            },
            outcome: {
              type: "NEGATIVO" as const,
              message: "Sofrido entrada dura no treino"
            }
          },
          {
            narrative: `<cyan>Um jornalista esportivo se aproxima após o treino e pede uma entrevista exclusiva sobre sua carreira.</cyan>`,
            nextEvent: {
              labelA: "Conceder entrevista",
              labelB: "Pedir para falar outro dia"
            },
            outcome: {
              type: "NEUTRO" as const,
              message: "Jornalista se interessou pela sua história"
            }
          },
          {
            narrative: `<cyan>Minuto 72, placar empatado em 1-1. Você recebe a bola na entrada da área em posição perigosa.</cyan>`,
            nextEvent: {
              labelA: "Chutar a gol",
              labelB: "Tocar para o companheiro"
            },
            outcome: choice === "A" ? {
              type: "DECISIVO" as const,
              message: "Momento crucial no jogo empatado"
            } : {
              type: "ESTRATÉGICO" as const,
              message: "Decisão importante em momento de pressão"
            }
          }
        ];
        
        const randomScenario = scenarios[Math.floor(Math.random() * scenarios.length)];
        return randomScenario;
      }
    }
    
    try {
      // Get the last chosen option and its text
      const lastChoice = choiceLog.length > 0 ? choiceLog[choiceLog.length - 1] : null;
      const lastChoiceText = lastChoice ? (lastChoice.choice === 'A' ? lastChoice.nextEvent?.labelA : lastChoice.nextEvent?.labelB) : "Initial choice";
      const lastNarrative = lastChoice ? lastChoice.narrative : "Game start";
      
      // Prepare history summary
      const historyText = choiceLog.map(log => {
        const choiceText = log.choice === 'A' ? log.nextEvent?.labelA : log.nextEvent?.labelB;
        return `Player chose: ${choiceText}. Outcome: ${log.outcome?.type || 'NONE'} - ${log.outcome?.message || 'No outcome'}`;
      }).join("\n");
      
      // Use OpenAI to generate the next part of the narrative
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system", 
            content: `You are a football career simulator game. Create engaging narratives based on player choices.
                     Output ONLY in Portuguese. Format responses like this:
                     {
                       "narrative": "Story text based on the choice",
                       "options": {
                         "A": "Next option A",
                         "B": "Next option B"
                       },
                       "outcome": {
                         "type": "OUTCOME_TYPE",
                         "message": "Brief outcome message"
                       }
                     }
                     
                     OUTCOME_TYPE must be one of: "POSITIVO", "NEGATIVO", "NEUTRO", "DECISIVO", or "ESTRATÉGICO".
                     Make the outcome appropriate for the choice made.`
          },
          {
            role: "user", 
            content: `Player Profile:
                     Name: ${playerProfile.name}
                     Age: ${playerProfile.age}
                     Position: ${playerProfile.position}
                     Nationality: ${getNationalityAdjective(playerProfile.nationality)}
                     Club: ${playerProfile.startClub}
                     
                     Previous game history:
                     ${historyText}
                     
                     Current narrative:
                     ${lastNarrative}
                     
                     Player chose: ${choice === 'A' ? 'Option A' : 'Option B'} - "${choice === 'A' ? lastChoice?.nextEvent?.labelA : lastChoice?.nextEvent?.labelB}"
                     
                     Generate the next part of the narrative, options, and outcome.`
          }
        ],
      });
      
      // Parse the response
      const responseText = completion.choices[0].message.content || '';
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
          }
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
      
      return {
        narrative: formattedNarrative,
        nextEvent: {
          labelA: parsedResponse.options.A,
          labelB: parsedResponse.options.B
        },
        outcome: {
          type: outcomeType as "POSITIVO" | "NEGATIVO" | "NEUTRO" | "DECISIVO" | "ESTRATÉGICO",
          message: parsedResponse.outcome?.message || "O jogo continua"
        }
      };
      
    } catch (error) {
      console.error("Error calling OpenAI:", error);
      
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
        }
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
