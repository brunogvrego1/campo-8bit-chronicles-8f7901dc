
import { PlayerProfile, Choice, GameResponse } from '@/lib/types';
import OpenAI from 'openai';
import { supabase } from "@/integrations/supabase/client";

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

// Call DeepSeek API through Supabase Edge Function
const callDeepSeekAI = async (messages: any[]) => {
  try {
    const { data, error } = await supabase.functions.invoke("deepseek-chat", {
      body: {
        messages,
      },
    });

    if (error) {
      console.error("DeepSeek API error:", error);
      throw new Error(`DeepSeek API error: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error("Error calling DeepSeek service:", error);
    throw error;
  }
};

export const gameService = {
  startGame: async (playerProfile: PlayerProfile): Promise<GameResponse> => {
    console.log("Starting game with profile:", playerProfile);
    
    try {
      // Use DeepSeek to generate the initial narrative
      const data = await callDeepSeekAI([
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
      console.error("Error calling DeepSeek AI:", error);
      
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
      
      // Use DeepSeek to generate the next part of the narrative
      const data = await callDeepSeekAI([
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
