
import { PlayerProfile, Choice, GameResponse } from '@/lib/types';

// Enhanced game service with better narrative structure
export const gameService = {
  startGame: async (playerProfile: PlayerProfile): Promise<GameResponse> => {
    console.log("Starting game with profile:", playerProfile);
    
    // In a real implementation, this would call the LLM API
    // For now, we'll provide a richer narrative structure
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      narrative: `<cyan>TÉCNICO:</cyan> Bem-vindo ao ${playerProfile.startClub}, ${playerProfile.name}! Como ${playerProfile.position.toLowerCase()} ${getNationalityAdjective(playerProfile.nationality)} de ${playerProfile.age} anos, você tem todo um futuro pela frente.

Os olheiros ficaram impressionados com seu desempenho na base. Este é seu primeiro dia de treino com o time principal. Os outros jogadores te observam com curiosidade enquanto você entra no vestiário.

<yellow>CAPITÃO DO TIME:</yellow> Ei, novato! Ansioso para mostrar seu talento? O técnico tem grandes expectativas sobre você.

*O vestiário está cheio, com jogadores veteranos e outros jovens observando você. A forma como você se apresenta agora pode definir sua reputação inicial no clube.*`
    };
  },
  
  makeUserInput: async (playerProfile: PlayerProfile, choiceLog: Choice[], userInput: string): Promise<GameResponse> => {
    console.log("User input:", userInput);
    
    // For now, we'll simulate different responses based on user input
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simple responses based on keywords in user input
    const lowerInput = userInput.toLowerCase();
    
    // Check for common keywords and generate appropriate responses with narrative-response-effect structure
    if (lowerInput.includes("nervoso") || lowerInput.includes("ansioso")) {
      return {
        narrative: `<cyan>VOCÊ:</cyan> Estou um pouco nervoso, mas pronto para dar o meu melhor.

<yellow>CAPITÃO DO TIME:</yellow> Todo mundo fica nervoso no começo. Eu vomitei antes da minha primeira partida como profissional! *Ele ri e dá um tapinha nas suas costas*

<magenta>EFEITO:</magenta> Sua honestidade causa uma boa impressão. Alguns veteranos trocam olhares aprovadores, apreciando sua humildade. O capitão parece disposto a te ajudar nos primeiros treinos.

*O técnico entra no vestiário e todos ficam em silêncio. Ele olha para o grupo e começa a explicar o treino de hoje.*

<cyan>TÉCNICO:</cyan> Hoje vamos focar em jogadas de transição rápida. ${playerProfile.name}, quero ver como você se adapta ao nosso ritmo.`
      };
    } else if (lowerInput.includes("confiante") || lowerInput.includes("pronto")) {
      return {
        narrative: `<cyan>VOCÊ:</cyan> Estou confiante e pronto para mostrar por que estou aqui. Não vim para ser só mais um.

<yellow>CAPITÃO DO TIME:</yellow> Gosto da sua atitude, garoto. Mas aqui você precisa provar seu valor todos os dias. *Ele cruza os braços, avaliando sua reação*

<magenta>EFEITO:</magenta> Alguns veteranos parecem impressionados com sua confiança, outros demonstram ceticismo. Você percebe que precisará mostrar seu talento no campo para ganhar o respeito completo.

*Um dos jogadores mais experientes se aproxima de você*

<yellow>JOGADOR VETERANO:</yellow> Se você for metade do que dizem, vamos nos dar bem. Mas lembre-se, aqui é outro nível. Esteja preparado.`
      };
    } else if (lowerInput.includes("treino") || lowerInput.includes("treinamento")) {
      return {
        narrative: `<cyan>VOCÊ:</cyan> Como serão os treinos? Estou ansioso para entender a metodologia do clube.

<cyan>TÉCNICO:</cyan> *se aproxima ao ouvir sua pergunta* Gosto de jogadores que pensam no processo. Nossos treinos são intensos. Começamos com fundamentos técnicos, passamos para situações táticas e terminamos com jogos reduzidos.

<magenta>EFEITO:</magenta> O técnico parece aprovar seu interesse nos métodos de trabalho. Ele faz algumas anotações em sua prancheta enquanto continua explicando.

<cyan>TÉCNICO:</cyan> Hoje você vai treinar com o grupo principal. Quero ver como se adapta às nossas jogadas ensaiadas. Fique atento ao ritmo e à movimentação dos companheiros.`
      };
    } else if (lowerInput.includes("jogar") || lowerInput.includes("titular")) {
      return {
        narrative: `<cyan>VOCÊ:</cyan> Quando poderei ter minha chance como titular? Estou pronto para jogar.

<cyan>TÉCNICO:</cyan> *franze a testa* Calma, garoto. Aqui ninguém ganha posição só por chegar. Você precisa mostrar consistência, entender nosso sistema e ganhar a confiança dos companheiros.

<magenta>EFEITO:</magenta> Sua pergunta direta causou uma impressão de ansiedade. Alguns jogadores veteranos trocam olhares, e você percebe que pode ter soado presunçoso.

<yellow>CAPITÃO DO TIME:</yellow> *se aproxima depois que o técnico se afasta* Olha, entendo seu entusiasmo, mas aqui é melhor observar primeiro, falar depois. Mostre seu valor no treino e as oportunidades virão naturalmente.`
      };
    } else {
      // Generate responses with the narrative-response-effect structure for generic inputs
      const responses = [
        `<cyan>VOCÊ:</cyan> ${userInput}

<cyan>TÉCNICO:</cyan> Interessante sua colocação. Vamos ver como você se desenvolve nas próximas semanas. O que importa é como você se comporta dentro de campo.

<magenta>EFEITO:</magenta> O técnico parece neutro em relação a sua resposta. Ele faz um gesto para todos se aproximarem para as instruções do treino.

*Os jogadores formam um círculo enquanto o técnico desenha algumas jogadas em seu quadro tático.*`,

        `<cyan>VOCÊ:</cyan> ${userInput}

<yellow>JOGADOR VETERANO:</yellow> Ei, novato! Gostei da sua disposição. Se precisar de ajuda para se adaptar, pode contar comigo.

<magenta>EFEITO:</magenta> Você acaba de ganhar um potencial aliado no elenco. Ter veteranos ao seu lado pode facilitar sua adaptação e abrir portas no clube.

*O preparador físico chama todos para o campo para iniciar o aquecimento.*`,

        `<cyan>VOCÊ:</cyan> ${userInput}

<yellow>CAPITÃO DO TIME:</yellow> *acena com a cabeça* Vamos ver o que você pode fazer em campo. No final, é isso que importa.

<magenta>EFEITO:</magenta> O capitão ainda está te avaliando. Seu desempenho no treino de hoje será crucial para formar uma primeira impressão.

<cyan>TÉCNICO:</cyan> Muito bem, rapazes! Vamos ao campo. ${playerProfile.name}, você começa no time reserva hoje, mas terá sua chance no coletivo.`
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
