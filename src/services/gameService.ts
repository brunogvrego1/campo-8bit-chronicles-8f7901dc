import { PlayerProfile, Choice, GameResponse } from '@/lib/types';

// Mock API service for now (will be replaced with real API calls later)
export const gameService = {
  startGame: async (playerProfile: PlayerProfile): Promise<GameResponse> => {
    console.log("Starting game with profile:", playerProfile);
    
    // In a real implementation, this would call the LLM API
    // For now, we'll simulate a response
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      narrative: `<cyan>TÉCNICO:</cyan> Bem-vindo, ${playerProfile.name}! Como ${playerProfile.position.toLowerCase()} ${getNationalityAdjective(playerProfile.nationality)} de ${playerProfile.age} anos, estamos animados para ter você no ${playerProfile.startClub}. Como se sente no seu primeiro treino profissional?`
    };
  },
  
  makeUserInput: async (playerProfile: PlayerProfile, choiceLog: Choice[], userInput: string): Promise<GameResponse> => {
    console.log("User input:", userInput);
    
    // For now, we'll simulate different responses based on user input
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simple responses based on keywords in user input
    const lowerInput = userInput.toLowerCase();
    
    // Check for common keywords and generate appropriate responses
    if (lowerInput.includes("nervoso") || lowerInput.includes("ansioso")) {
      return {
        narrative: `<cyan>TÉCNICO:</cyan> É normal sentir um pouco de nervosismo nos primeiros dias. Todos os grandes jogadores passaram por isso. Continue trabalhando duro e logo vai se sentir em casa.`
      };
    } else if (lowerInput.includes("confiante") || lowerInput.includes("pronto")) {
      return {
        narrative: `<cyan>TÉCNICO:</cyan> Essa confiança é boa! Mas lembre-se, o futebol profissional é muito diferente da base. Vamos ver o que você pode fazer no treino de hoje.`
      };
    } else if (lowerInput.includes("treino") || lowerInput.includes("treinamento")) {
      return {
        narrative: `<cyan>TÉCNICO:</cyan> Hoje vamos focar nos fundamentos e em algumas jogadas táticas. Quero ver como você se encaixa no nosso sistema. Mostre seu melhor.`
      };
    } else if (lowerInput.includes("jogar") || lowerInput.includes("titular")) {
      return {
        narrative: `<cyan>TÉCNICO:</cyan> Calma, tudo no seu tempo. Primeiro preciso ver como você se sai nos treinos. Se continuar progredindo, logo terá sua chance.`
      };
    } else {
      // Generate random responses for other inputs
      const responses = [
        `<cyan>TÉCNICO:</cyan> Interessante sua colocação. Vamos ver como você se desenvolve nas próximas semanas.`,
        `<cyan>TÉCNICO:</cyan> Entendo. Mostre isso em campo, é lá que realmente conta.`,
        `<cyan>ASSISTENTE TÉCNICO:</cyan> O técnico está impressionado com sua atitude. Continue assim.`,
        `<yellow>JOGADOR VETERANO:</yellow> Ei, novato! Gostei da sua disposição. Se precisar de ajuda, é só pedir.`,
        `<cyan>TÉCNICO:</cyan> Certo, vamos começar o treino então. Quero ver o que você pode fazer.`
      ];
      
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      return { narrative: randomResponse };
    }
  },
  
  makeChoice: async (playerProfile: PlayerProfile, choiceLog: Choice[], choice: string): Promise<GameResponse> => {
    // Keeping this for compatibility, but we'll be using makeUserInput instead
    console.log("Making choice:", choice);
    await new Promise(resolve => setTimeout(resolve, 1000));
    return {
      narrative: `<cyan>TÉCNICO:</cyan> Escolha antiga detectada. Use o chat para interagir.`,
      nextEvent: {
        labelA: "Ok",
        labelB: "Entendi"
      }
    };
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
