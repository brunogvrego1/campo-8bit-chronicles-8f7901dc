
import { PlayerProfile, Choice, GameResponse } from '@/lib/types';

// Mock API service for now (will be replaced with real API calls later)
export const gameService = {
  startGame: async (playerProfile: PlayerProfile): Promise<GameResponse> => {
    console.log("Starting game with profile:", playerProfile);
    
    // In a real implementation, this would call the LLM API
    // For now, we'll simulate a response
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      narrative: `<cyan>Você, ${playerProfile.name}, ${playerProfile.position.toLowerCase()} ${getNationalityAdjective(playerProfile.nationality)} de ${playerProfile.age} anos, chega ao CT do ${playerProfile.startClub} para o primeiro treino profissional. O técnico lhe observa com atenção.</cyan>`,
      nextEvent: {
        labelA: "Treinar passe",
        labelB: "Treinar finalização"
      },
      outcome: null // No outcome for the first narrative
    };
  },
  
  makeChoice: async (playerProfile: PlayerProfile, choiceLog: Choice[], choice: string): Promise<GameResponse> => {
    console.log("Making choice:", choice);
    
    // For now, we'll simulate different responses based on choice
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Get the last chosen option
    const lastChoiceEvent = choiceLog.length > 0 ? choiceLog[choiceLog.length - 1].event : "";
    
    // Prepare a default outcome message with a properly typed outcome
    const outcome = {
      type: choice === "A" ? "POSITIVO" as const : (Math.random() > 0.5 ? "POSITIVO" as const : "NEUTRO" as const), 
      message: choice === "A" ? "Decisão bem recebida pela equipe" : "Resultado com efeito limitado"
    };
    
    // Simple branching narrative based on choices
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
