
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

// Generate club context based on player's club
const getClubContext = (clubName: string): string => {
  // Map of club contexts
  const clubContexts: Record<string, {tradition: string, fans: string, rivals: string, league: string}> = {
    "São Paulo FC": {
      tradition: "um dos mais tradicionais do Brasil, tricampeão da Libertadores e Mundial",
      fans: "torcida exigente e conhecida como 'soberana'",
      rivals: "Corinthians, Palmeiras e Santos",
      league: "Série A do Campeonato Brasileiro"
    },
    "Flamengo": {
      tradition: "clube de maior torcida do Brasil, bicampeão da Libertadores",
      fans: "torcida apaixonada conhecida como 'Nação'",
      rivals: "Fluminense, Vasco e Botafogo",
      league: "Série A do Campeonato Brasileiro"
    },
    "Manchester United": {
      tradition: "um dos maiores clubes ingleses, multicampeão da Champions League",
      fans: "torcida global e exigente",
      rivals: "Manchester City, Liverpool e Arsenal",
      league: "Premier League inglesa"
    },
    "Real Madrid": {
      tradition: "maior campeão europeu, conhecido como 'Los Blancos'",
      fans: "torcida conhecida como 'Madridistas'",
      rivals: "Barcelona e Atlético de Madrid",
      league: "La Liga espanhola"
    },
    "FC Barcelona": {
      tradition: "clube catalão com filosofia 'Més que un club'",
      fans: "torcida conhecida como 'Culés'",
      rivals: "Real Madrid e Espanyol",
      league: "La Liga espanhola"
    },
    "Bayern Munich": {
      tradition: "maior clube alemão, dominante na Bundesliga",
      fans: "torcida organizada e orgulhosa",
      rivals: "Borussia Dortmund e Schalke 04",
      league: "Bundesliga alemã"
    },
    "Paris Saint-Germain": {
      tradition: "clube em ascensão europeia após investimentos qatari",
      fans: "torcida parisiense empolgada",
      rivals: "Olympique de Marseille e Lyon",
      league: "Ligue 1 francesa"
    },
    "Manchester City": {
      tradition: "clube tradicional transformado após investimentos árabes",
      fans: "torcida crescente global",
      rivals: "Manchester United e Liverpool",
      league: "Premier League inglesa"
    },
    "Liverpool": {
      tradition: "clube histórico inglês com tradição europeia",
      fans: "torcida apaixonada que canta 'You'll Never Walk Alone'",
      rivals: "Manchester United e Everton",
      league: "Premier League inglesa"
    },
    "Juventus": {
      tradition: "maior campeão italiano, conhecido como 'A Velha Senhora'",
      fans: "torcida conhecida como 'tifosi bianconeri'",
      rivals: "Inter de Milão e Milan",
      league: "Serie A italiana"
    }
  };
  
  // Return the club context or generic context if not found
  const club = clubContexts[clubName] || {
    tradition: "clube com suas próprias tradições",
    fans: "torcida apaixonada",
    rivals: "rivais tradicionais",
    league: "liga local"
  };
  
  return `Clube: ${clubName}, ${club.tradition}. Torcida: ${club.fans}. Principais rivais: ${club.rivals}. Competição: ${club.league}.`;
};

// Check if a narrative is too similar to previous ones
const isNarrativeTooSimilar = (narrative: string, previousNarratives: string[]): boolean => {
  if (!previousNarratives.length) return false;
  
  // Simple similarity check - counts matching words/phrases
  const narrativeWords = narrative.toLowerCase().split(/\s+/);
  
  for (const prevNarrative of previousNarratives) {
    const prevWords = prevNarrative.toLowerCase().split(/\s+/);
    
    // Count matching words
    let matchCount = 0;
    for (const word of narrativeWords) {
      if (prevWords.includes(word) && word.length > 4) { // Only count significant words
        matchCount++;
      }
    }
    
    // If more than 40% match, consider too similar
    const matchPercentage = matchCount / narrativeWords.length;
    if (matchPercentage > 0.4) {
      return true;
    }
  }
  
  return false;
};

// Generate emotional context based on recent outcomes
const getEmotionalContext = (choices: Choice[]): string => {
  if (!choices.length) return "Estado emocional: Ansioso para provar seu valor.";
  
  // Analyze last 3 choices for emotional trend
  const recentOutcomes = choices.slice(-3).map(choice => choice.outcome?.type || "NEUTRO");
  
  // Count outcome types
  const counts = {
    "POSITIVO": 0,
    "NEGATIVO": 0,
    "NEUTRO": 0,
    "DECISIVO": 0,
    "ESTRATÉGICO": 0
  };
  
  recentOutcomes.forEach(outcome => {
    counts[outcome as keyof typeof counts]++;
  });
  
  // Determine emotional state
  if (counts.DECISIVO >= 1) {
    return "Estado emocional: Confiante após momentos decisivos recentes.";
  } else if (counts.NEGATIVO >= 2) {
    return "Estado emocional: Pressionado após performances abaixo do esperado.";
  } else if (counts.POSITIVO >= 2) {
    return "Estado emocional: Motivado após boas atuações recentes.";
  } else if (counts.ESTRATÉGICO >= 2) {
    return "Estado emocional: Focado em executar o plano tático.";
  } else {
    return "Estado emocional: Equilibrado, mas determinado a melhorar.";
  }
};

export const gameService = {
  startGame: async (playerProfile: PlayerProfile): Promise<GameResponse> => {
    console.log("Starting game with profile:", playerProfile);
    
    try {
      // Generate initial timeline for the day
      const timeline = generateDayTimeline();
      
      // Format the timeline for the prompt
      const timelinePrompt = formatTimelineForPrompt(timeline, []);
      
      // Get club context
      const clubContext = getClubContext(playerProfile.startClub || "");
      
      // Use DeepSeek to generate the initial narrative
      const data = await getDeepSeekChatCompletion([
        {
          role: "system", 
          content: `Você é um narrador de um simulador de carreira de futebol brasileiro, escrevendo narrativas imersivas, dramáticas e variadas.

IMPORTANTE: Sua resposta DEVE ser em formato JSON VÁLIDO com esta estrutura exata:
{
  "narrative": "Texto da narrativa aqui, envolvente e único",
  "options": {
    "A": "Texto da opção A",
    "B": "Texto da opção B"
  }
}

INSTRUÇÕES ESPECIAIS:
1. Evite repetições e frases clichê. Cada narrativa deve ser única.
2. Use linguagem dinâmica, colorida e específica do futebol brasileiro.
3. Incorpore sempre detalhes do perfil do jogador, clube e contexto emocional.
4. Crie opções A e B distintas que representem escolhas realmente diferentes.
5. Use vocabulário variado e evite estruturas de frases repetitivas.
6. Coloque o jogador em situações emocionalmente impactantes, não apenas técnicas.
7. NÃO USE códigos de formatação como markdown ou ```json. Retorne apenas JSON puro.`
        },
        {
          role: "user", 
          content: `MICRO_PRE
###
${timelinePrompt}
Perfil
Nome: ${playerProfile.name} • ${playerProfile.age} anos • ${playerProfile.nationality} • ${playerProfile.position} • ${playerProfile.startClub}
${formatPlayerAttributes(playerProfile.attributes)}
${clubContext}
Estado emocional: Ansioso pelo primeiro treino profissional.
###
Tarefa
Como narrador, crie uma narrativa imersiva do primeiro treino técnico do jogador no clube.
Apresente o ambiente, os outros jogadores e o técnico observando o novato.
Ofereça 2 opções contrastantes: "Focar em impressionar com habilidades individuais" ou "Mostrar espírito coletivo".
Retorne apenas JSON { "narrative": "...", "options": { "A": "...", "B": "..." } }.
Faça a narrativa envolvente, dramática e única, evitando clichês.`
        }
      ], { temperature: 0.85 });
      
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
          promptTask = `Como narrador, crie uma narrativa imersiva do treino técnico
e ofereça 2 opções contrastantes relacionadas a diferentes aspectos do treino.
Evite focar apenas em "treinar X" vs "treinar Y", explore aspectos psicológicos e relacionais também.`;
          break;
        case 2:
          eventType = timeline[1].type;
          if (eventType === "COLETIVA_IMPRENSA") {
            promptTask = `Como narrador, crie uma cena vívida da coletiva de imprensa
e ofereça 2 opções contrastantes de como o jogador pode se expressar e lidar com perguntas difíceis.
Inclua repórteres específicos, perguntas desafiadoras e a pressão do momento.`;
          } else {
            promptTask = `Como narrador, crie uma cena envolvente da live nas redes sociais
e ofereça 2 opções contrastantes de abordagem e interação com os seguidores.
Explore temas como autenticidade vs imagem pública, interação pessoal vs profissional.`;
          }
          break;
        case 3:
          eventType = "TALK_LOCKERROOM";
          promptTask = `Como narrador, crie uma cena tensa e emocional no vestiário antes do jogo
e ofereça 2 opções contrastantes de como o jogador pode se comportar neste momento crucial.
Integre relacionamentos com companheiros específicos, a pressão e nervosismo pré-jogo.`;
          break;
        case 4:
          eventType = "MICRO";
          promptTask = `Como narrador, crie uma cena dramática do primeiro lance importante do jogo
e ofereça 2 opções contrastantes de decisões táticas em uma fração de segundo.
Descreva o clima do estádio, adversários específicos e a dinâmica de jogo.`;
          break;
        default:
          eventType = "POS_JOGO";
          promptTask = `Como narrador, crie uma cena emocional do pós-jogo, incluindo a reação da torcida
e ofereça 2 opções contrastantes de como o jogador pode lidar com o resultado.
Inclua interações com imprensa, colegas específicos e seu impacto na carreira.`;
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
      
      // Get club context
      const clubContext = getClubContext(playerProfile.startClub || "");
      
      // Get emotional context
      const emotionalContext = getEmotionalContext(choiceLog);
      
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
      
      // Extract previous narratives for similarity checking
      const previousNarratives = choiceLog
        .filter(log => log.narrative)
        .map(log => log.narrative || "")
        .slice(-5); // Only consider last 5 narratives
      
      // Create an array of previously used options to avoid repetition
      const previousOptions = choiceLog.flatMap(log => [
        log.nextEvent?.labelA, 
        log.nextEvent?.labelB
      ]).filter(Boolean) as string[];
      
      // Use DeepSeek to generate the next part of the narrative
      const data = await getDeepSeekChatCompletion([
        {
          role: "system", 
          content: `Você é um narrador de um simulador de carreira de futebol brasileiro, criando narrativas imersivas, dramáticas e variadas.

IMPORTANTE: Sua resposta DEVE ser em formato JSON VÁLIDO com esta estrutura exata:
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

INSTRUÇÕES ESPECIAIS:
1. Cada narrativa deve ser ÚNICA - não repita frases ou estruturas de narrativas anteriores.
2. Utilize linguagem vívida, dinâmica e específica do futebol brasileiro.
3. Incorpore SEMPRE detalhes do perfil do jogador, clube, relacionamentos e contexto emocional.
4. Crie opções A e B verdadeiramente contrastantes, nunca similares.
5. Evite estas opções usadas anteriormente: ${previousOptions.slice(-8).join(", ")}
6. Coloque o jogador em situações emocionalmente impactantes, não apenas técnicas.
7. Reflita a personalidade do jogador baseada em seus atributos e histórico.
8. Varie o tom narrativo entre momentos (tenso, leve, dramático, inspirador).
9. Use NOMES ESPECÍFICOS para técnicos, companheiros e adversários.
10. NÃO USE códigos de formatação como markdown ou ```json. Retorne apenas JSON puro.

EXEMPLOS DE BOAS NARRATIVAS:
- "O sol castiga o gramado do CT quando Tuca Menezes, o técnico linha-dura do São Paulo, aponta para você. 'Quero ver o que sabe fazer, garoto. Mostre seu valor.' Júnior, o capitão, cruza os braços observando cada movimento seu. A pressão é palpável."
- "A coletiva ferve com perguntas sobre a derrota no clássico. Um repórter provocador do Estadão dispara: 'Como justifica seu erro no lance do gol?' As câmeras focam seu rosto, enquanto o assessor de imprensa tenta intervir. O silêncio é ensurdecedor."
- "O vestiário vibra com a energia pré-derby. Ronaldo, o veterano zagueiro, reúne o time em círculo. 'É hoje que fazemos história!' Os olhos de todos se voltam para você quando ele pergunta se alguém tem algo a dizer. O nervosismo aperta seu peito."

EXEMPLO DE RESULTADO JSON:
{
  "narrative": "O coordenador técnico Leonardo Araújo observa sua decisão com interesse, anotando algo em sua prancheta. O treino progride para exercícios táticos e você percebe que seu posicionamento está sendo especialmente avaliado. Mauro, o volante experiente, te dá dicas discretamente: 'Mantenha a linha, garoto.'", 
  "options": {
    "A": "Seguir rigorosamente as instruções táticas do treinador",
    "B": "Improvisar para mostrar sua criatividade em campo"
  },
  "outcome": {
    "type": "POSITIVO",
    "message": "Sua dedicação foi notada pela comissão técnica"
  }
}`
        },
        {
          role: "user", 
          content: `MICRO_PRE
###
${timelinePrompt}
Perfil
Nome: ${playerProfile.name} • ${playerProfile.age} anos • ${getNationalityAdjective(playerProfile.nationality)} • ${playerProfile.position} • ${playerProfile.startClub}
${formatPlayerAttributes(playerProfile.attributes)}${statsContext}${careerContext}
${clubContext}
${emotionalContext}
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
Retorne apenas JSON { "narrative": "...", "options": { "A": "...", "B": "..." }, "outcome": { "type": "...", "message": "..." } }`
        }
      ], { temperature: 0.9 }); // Higher temperature for more variety
      
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
      
      // Check if the new narrative is too similar to previous ones
      if (isNarrativeTooSimilar(parsedResponse.narrative, previousNarratives)) {
        console.log("Narrative too similar to previous ones, regenerating...");
        
        // Try once more with higher temperature
        const retryData = await getDeepSeekChatCompletion([
          {
            role: "system", 
            content: `Você é um narrador de um simulador de carreira de futebol brasileiro. Crie narrativas COMPLETAMENTE DIFERENTES das anteriores.
            
IMPORTANTE: Sua narrativa anterior foi rejeitada por ser muito similar às anteriores.
VOCÊ DEVE criar uma narrativa totalmente nova, com cenários, personagens e situações diferentes.
Evite padrões e estruturas de frases similares. Use vocabulário e estilo diferentes.
Responda APENAS em JSON como: { "narrative": "...", "options": { "A": "...", "B": "..." }, "outcome": { "type": "...", "message": "..." } }`
          },
          {
            role: "user", 
            content: `Precisamos de uma narrativa COMPLETAMENTE NOVA para esta situação:
${promptTask}

Escolha atual: ${choice === 'A' ? 'Opção A' : 'Opção B'} - "${choice === 'A' ? lastChoice?.nextEvent?.labelA : lastChoice?.nextEvent?.labelB}"

Perfil do jogador: ${playerProfile.name}, ${playerProfile.position}, ${playerProfile.attributes.speed} velocidade, ${playerProfile.attributes.shooting} finalização, ${playerProfile.attributes.charisma} carisma.

Crie uma cena completamente diferente, com outros personagens, ambiente e situação.`
          }
        ], { temperature: 1.0 });
        
        try {
          const retryResponse = JSON.parse(retryData.content || '');
          parsedResponse = retryResponse; // Use the retry response
        } catch (e) {
          console.error("Failed to parse retry response:", e);
          // We'll use the original response if retry fails
        }
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
