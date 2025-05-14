
import { useEffect, useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { gameService } from '@/services/gameService';
import { ArrowRight, History, Award, Trophy, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PlayerProfile, GameResponse } from '@/lib/types';
import StatsBox from './StatsBox';

const GameScreen = () => {
  const { 
    playerProfile, 
    choiceLog, 
    currentNarrative, 
    nextOptions, 
    isLoading, 
    gameEnded,
    setLoading,
    addChoice, 
    setCurrentNarrative, 
    setNextOptions,
    setActiveScreen,
    xpPool,
    attributeFocus,
    addXp,
    setAttributeFocus,
    careerStats,
    updateCareerStats,
    endGame
  } = useGameStore();
  
  const { toast } = useToast();
  
  const [weekEvents, setWeekEvents] = useState<GameResponse[]>([]);
  const [currentEventIndex, setCurrentEventIndex] = useState(0);
  const [isNewWeek, setIsNewWeek] = useState(false);
  
  // Check if the game should end after 3 choices
  useEffect(() => {
    if (choiceLog.length >= 3 && !gameEnded && !isNewWeek) {
      // Generate post-game summary
      generatePostGameSummary();
    }
  }, [choiceLog.length, gameEnded, isNewWeek]);

  // Handle week events progression
  useEffect(() => {
    if (isNewWeek && weekEvents.length > 0 && currentEventIndex < weekEvents.length) {
      const currentEvent = weekEvents[currentEventIndex];
      setCurrentNarrative(currentEvent.narrative);
      setNextOptions(currentEvent.nextEvent);
      
      // If there are match stats, update career stats
      if (currentEvent.matchStats) {
        updateCareerStats({
          matches: 1,
          goals: currentEvent.matchStats.goals,
          assists: currentEvent.matchStats.assists,
          keyDefenses: currentEvent.matchStats.keyDefenses
        });
        
        // Show toast for match performance
        toast({
          title: "Desempenho na partida",
          description: `${currentEvent.matchStats.goals} gols, ${currentEvent.matchStats.assists} assistências`,
          variant: "default"
        });
      }
      
      // If there is XP gain, add it
      if (currentEvent.xpGain && currentEvent.xpGain > 0) {
        addXp(currentEvent.xpGain);
        
        toast({
          title: "Experiência Adquirida",
          description: `+${currentEvent.xpGain} XP`,
          variant: "default"
        });
      }
      
      // Record the event in choice log with proper typing
      const newChoice = {
        id: choiceLog.length,
        event: `WEEK_EVENT_${currentEventIndex + 1}`,
        choice: 'A' as 'A' | 'B', // Fix the type by explicitly casting
        timestamp: new Date().toISOString(),
        narrative: currentEvent.narrative,
        nextEvent: currentEvent.nextEvent,
        outcome: currentEvent.outcome,
        timeline: currentEvent.timeline,
        xpGain: currentEvent.xpGain,
        attributeFocus: currentEvent.attributeFocus,
        matchStats: currentEvent.matchStats,
        attributeImproved: currentEvent.attributeImproved
      };
      
      addChoice(newChoice);
    }
  }, [isNewWeek, weekEvents, currentEventIndex]);
  
  // Generate a summary for the post-game
  const generatePostGameSummary = async () => {
    if (!playerProfile) return;
    
    try {
      setLoading(true);
      
      // End the game
      endGame();
      
      // Create a summary of the player's journey
      const lastChoice = choiceLog[choiceLog.length - 1];
      
      // Calculate some stats from the choices
      let positiveOutcomes = 0;
      let negativeOutcomes = 0;
      
      choiceLog.forEach(choice => {
        if (choice.outcome?.type === "POSITIVO" || choice.outcome?.type === "DECISIVO") {
          positiveOutcomes++;
        } else if (choice.outcome?.type === "NEGATIVO") {
          negativeOutcomes++;
        }
      });
      
      // Generate a dynamic post-game narrative
      let postGameNarrative = '';
      
      if (positiveOutcomes >= 2) {
        postGameNarrative = `<magenta>A primeira semana de ${playerProfile.name} no ${playerProfile.startClub} foi um sucesso! A comissão técnica ficou bastante impressionada com seu desempenho e os torcedores já começam a falar o seu nome. As expectativas para a temporada aumentaram!</magenta>`;
      } else if (negativeOutcomes >= 2) {
        postGameNarrative = `<yellow>A primeira semana de ${playerProfile.name} no ${playerProfile.startClub} foi desafiadora. Alguns erros marcaram esta estreia, mas há tempo para recuperação. A comissão técnica acredita que o nervosismo inicial logo passará.</yellow>`;
      } else {
        postGameNarrative = `<cyan>A primeira semana de ${playerProfile.name} no ${playerProfile.startClub} chegou ao fim com um desempenho consistente. Nem brilhante, nem decepcionante, você mostrou que tem potencial para crescer no clube.</cyan>`;
      }
      
      // Add information about attribute focus and improvement
      const mostFocusedAttribute = getMostFocusedAttribute();
      
      if (mostFocusedAttribute) {
        postGameNarrative += `\n\n<cyan>Seu foco principal nesta semana foi melhorar ${getAttributeDisplayName(mostFocusedAttribute)}. Continue treinando este aspecto para evoluir rapidamente.</cyan>`;
      }
      
      // Add summary about the career progress
      const positiveOutcomesText = String(positiveOutcomes);
      const negativeOutcomesText = String(negativeOutcomes);
      const neutralOutcomes = String(choiceLog.length - positiveOutcomes - negativeOutcomes);
      
      postGameNarrative += `\n\n<cyan>Primeira semana concluída: ${positiveOutcomesText} momentos positivos, ${negativeOutcomesText} desafios, ${neutralOutcomes} situações neutras.</cyan>`;
      
      // Update the narrative with the post-game summary
      setCurrentNarrative(postGameNarrative);
      
    } catch (error) {
      console.error("Failed to generate post-game summary:", error);
      setCurrentNarrative("<yellow>Sua primeira semana chegou ao fim. Continue treinando para melhorar suas habilidades.</yellow>");
    } finally {
      setLoading(false);
    }
  };
  
  // Get the most focused attribute during the game
  const getMostFocusedAttribute = (): keyof PlayerProfile['attributes'] | null => {
    const attributeCounts: Record<string, number> = {};
    
    choiceLog.forEach(choice => {
      if (choice.attributeFocus) {
        attributeCounts[choice.attributeFocus] = (attributeCounts[choice.attributeFocus] || 0) + 1;
      }
    });
    
    if (Object.keys(attributeCounts).length === 0) return null;
    
    return Object.entries(attributeCounts)
      .sort((a, b) => b[1] - a[1])[0][0] as keyof PlayerProfile['attributes'];
  };
  
  // Helper function to colorize narrative text
  const formatNarrative = (text: string) => {
    if (!text) return '';
    
    return text
      .replace(/<cyan>(.*?)<\/cyan>/g, '<span class="cyan-text">$1</span>')
      .replace(/<yellow>(.*?)<\/yellow>/g, '<span class="yellow-text">$1</span>')
      .replace(/<magenta>(.*?)<\/magenta>/g, '<span class="magenta-text">$1</span>');
  };
  
  // Get attribute description based on value
  const getAttributeDescription = (value: number): string => {
    if (value >= 18) return "Excepcional";
    if (value >= 15) return "Excelente";
    if (value >= 12) return "Bom";
    if (value >= 8) return "Médio";
    if (value >= 5) return "Regular";
    return "Fraco";
  };
  
  // Get CSS color class for attribute value
  const getAttributeColorClass = (value: number): string => {
    if (value >= 18) return "text-purple-400";
    if (value >= 15) return "text-green-400";
    if (value >= 12) return "text-blue-400";
    if (value >= 8) return "text-white";
    if (value >= 5) return "text-yellow-400";
    return "text-red-400";
  };
  
  // Function to convert attribute keys to display names
  const getAttributeDisplayName = (attr: keyof PlayerProfile['attributes']): string => {
    const displayNames: Record<keyof PlayerProfile['attributes'], string> = {
      speed: "Velocidade",
      physical: "Físico",
      shooting: "Chute",
      heading: "Cabeceio",
      charisma: "Carisma",
      passing: "Passe",
      defense: "Defesa",
      // Add the following properties for backward compatibility
      pace: "Ritmo",
      dribbling: "Drible",
      defending: "Defesa"
    };
    return displayNames[attr] || attr;
  };

  // Make a choice
  const handleChoice = async (choice: 'A' | 'B') => {
    if (!playerProfile || !nextOptions) return;
    
    try {
      setLoading(true);
      
      // Get the choice text
      const choiceText = choice === 'A' ? nextOptions.labelA : nextOptions.labelB;
      
      // Determine which attribute the choice is focused on
      const focus = chooseAttributeFocus(choiceText);
      setAttributeFocus(focus);
      
      // If we're in week mode, handle differently
      if (isNewWeek && weekEvents.length > 0) {
        // Move to the next event in the week
        if (currentEventIndex < weekEvents.length - 1) {
          setCurrentEventIndex(currentEventIndex + 1);
        } else {
          // End of week reached
          setIsNewWeek(false);
          setWeekEvents([]);
          setCurrentEventIndex(0);
          
          // Show week summary
          setCurrentNarrative("<cyan>Fim da semana! Você passou por diversos eventos e jogos. Sua carreira continua evoluindo.</cyan>");
          setNextOptions({
            labelA: "Iniciar Nova Semana",
            labelB: "Ver Estatísticas"
          });
        }
        setLoading(false);
        return;
      }
      
      // For normal flow or starting new week
      if (gameEnded && choiceText === "Iniciar Nova Semana") {
        // Start a new week
        startNewWeek();
        setLoading(false);
        return;
      }
      
      // Normal choice flow
      const response = await gameService.makeChoice(playerProfile, [...choiceLog], choice, careerStats);
      
      // Calculate XP gain based on response
      let xpGain = response.xpGain || 0;
      
      // Use the attribute focus from the response if available
      const responseFocus = response.attributeFocus || focus;
      if (responseFocus) {
        setAttributeFocus(responseFocus);
      }
      
      // Record choice in log with narrative, outcome, and XP
      const newChoice = {
        id: choiceLog.length,
        event: choiceLog.length === 0 ? 'INTRO' : `CHOICE_${choiceLog.length}`,
        choice,
        timestamp: new Date().toISOString(),
        narrative: currentNarrative, // Save current narrative (before the choice)
        nextEvent: nextOptions, // Save the options that were presented
        outcome: response.outcome, // Save outcome of the choice
        timeline: response.timeline, // Save the timeline
        xpGain, // Save the XP gained from this choice
        attributeFocus: responseFocus, // Save the attribute focus
        matchStats: response.matchStats, // Save match stats if any
        attributeImproved: response.attributeImproved // Save attribute improvement if any
      };
      
      addChoice(newChoice);
      
      // Update game state
      setCurrentNarrative(response.narrative);
      setNextOptions(response.nextEvent);
      
      // Show toast with choice effect/outcome
      if (response.outcome) {
        const toastVariant = 
          response.outcome.type === 'POSITIVO' ? 'default' : 
          response.outcome.type === 'NEGATIVO' ? 'destructive' : 
          response.outcome.type === 'DECISIVO' ? 'default' : 'default';
        
        toast({
          title: `Escolha: ${choiceText}`,
          description: response.outcome.message,
          variant: toastVariant
        });
      }
      
      // Add XP to the pool
      if (xpGain > 0) {
        addXp(xpGain);
        
        toast({
          title: `Experiência Adquirida`,
          description: `+${xpGain} XP${responseFocus ? ` (Foco: ${getAttributeDisplayName(responseFocus)})` : ''}`,
          variant: "default"
        });
      }
      
      // Update career stats for match performance
      if (response.matchStats) {
        const statsUpdate = {
          matches: 1,
          goals: response.matchStats?.goals || 0,
          assists: response.matchStats?.assists || 0,
          keyDefenses: response.matchStats?.keyDefenses || 0
        };
        
        updateCareerStats(statsUpdate);
      }
      
      // Check if this is the final choice (3rd choice)
      if (choiceLog.length >= 2 && !isNewWeek) { // Already made 2, this is the 3rd
        setTimeout(() => {
          generatePostGameSummary();
        }, 1000);
      }
      
    } catch (error) {
      console.error("Failed to process choice:", error);
      toast({
        title: "Erro",
        description: "Não foi possível processar sua escolha.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  // New function to start a new week
  const startNewWeek = async () => {
    if (!playerProfile) return;
    
    try {
      setLoading(true);
      
      // Reset game ended state
      endGame();
      
      // Generate a week's worth of events
      const initialTimeline = choiceLog.length > 0 && choiceLog[choiceLog.length - 1].timeline 
        ? choiceLog[choiceLog.length - 1].timeline 
        : generateInitialTimeline();
      
      const events = await gameService.startNewWeek(playerProfile, initialTimeline);
      
      // Store the events to play through them
      setWeekEvents(events);
      setCurrentEventIndex(0);
      setIsNewWeek(true);
      
      toast({
        title: "Nova Semana",
        description: "Uma nova semana começa na sua carreira!",
        variant: "default"
      });
      
    } catch (error) {
      console.error("Failed to start new week:", error);
      toast({
        title: "Erro",
        description: "Não foi possível iniciar nova semana.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Function to initialize a new timeline if needed
  const generateInitialTimeline = () => {
    return Array.from({ length: 52 }, (_, i) => ({
      slot: i + 1,
      type: 'WEEK',
      choice: null,
      result: null,
    }));
  };
  
  // Choose a related training attribute based on choice
  const chooseAttributeFocus = (choice: string): keyof PlayerProfile['attributes'] | null => {
    // Common training keywords and associated attributes
    const keywords: Record<string, keyof PlayerProfile['attributes']> = {
      'finalização': 'shooting',
      'finalizacao': 'shooting',
      'chute': 'shooting',
      'chutar': 'shooting',
      'gol': 'shooting',
      'passe': 'passing',
      'passes': 'passing',
      'velocidade': 'speed',
      'correr': 'speed',
      'velocidad': 'speed',
      'físic': 'physical',
      'força': 'physical',
      'força física': 'physical',
      'muscular': 'physical',
      'cabeça': 'heading',
      'cabeceio': 'heading',
      'cabeçada': 'heading',
      'cabecear': 'heading',
      'defesa': 'defense',
      'defender': 'defense',
      'marcação': 'defense',
      'marcar': 'defense',
      'carisma': 'charisma',
      'interview': 'charisma',
      'imprensa': 'charisma',
      'entrevista': 'charisma'
    };
    
    // Convert choice to lowercase for case-insensitive matching
    const lowerChoice = choice.toLowerCase();
    
    // Find a matching keyword
    for (const [keyword, attribute] of Object.entries(keywords)) {
      if (lowerChoice.includes(keyword)) {
        return attribute;
      }
    }
    
    // Default to a random attribute if no match found
    const attributes: Array<keyof PlayerProfile['attributes']> = [
      'speed', 'physical', 'shooting', 'heading', 'charisma', 'passing', 'defense'
    ];
    return attributes[Math.floor(Math.random() * attributes.length)];
  };
  
  // Render XP progress bar
  const renderXpProgressBar = () => {
    // Calculate cost for next attribute point
    const getNextAttributeCost = () => {
      if (!playerProfile || !attributeFocus) return 30; // Default max value
      
      const currentValue = playerProfile.attributes[attributeFocus];
      return 5 * (currentValue - 2);
    };
    
    const maxXp = getNextAttributeCost();
    const percentage = Math.min(100, (xpPool / maxXp) * 100);
    
    return (
      <div className="mt-6 mb-4">
        {attributeFocus && (
          <div className="flex justify-between items-center mb-1 text-xs">
            <span>XP: {xpPool}/{maxXp}</span>
            <span className="cyan-text">Foco: {getAttributeDisplayName(attributeFocus)} ({playerProfile?.attributes[attributeFocus]})</span>
          </div>
        )}
        
        <div className="w-full h-3 bg-gray-700 border border-gray-600 pixel-borders">
          <div 
            className="h-full bg-cyan" 
            style={{ width: `${percentage.toString()}%` }}
          ></div>
        </div>
      </div>
    );
  };
  
  // Render attribute improvements since last week
  const renderAttributeImprovements = () => {
    if (choiceLog.length === 0) return null;
    
    const lastChoice = choiceLog[choiceLog.length - 1];
    if (!lastChoice.attributeImproved) return null;
    
    const { name, oldValue, newValue } = lastChoice.attributeImproved;
    
    return (
      <div className="mt-2 py-2 border-t border-cyan text-sm">
        <p className="yellow-text">
          Melhoria de atributo: {getAttributeDisplayName(name)} {oldValue} → {newValue}
        </p>
      </div>
    );
  };

  // Render "Start New Week" button (shown after game ends)
  const renderStartNewWeekButton = () => {
    if (!gameEnded) return null;

    return (
      <div className="mt-8 text-center">
        <button
          className="retro-button retro-button-primary w-full px-4 py-2 flex items-center justify-center"
          onClick={startNewWeek}
        >
          <Trophy className="w-5 h-5 mr-2" /> Iniciar Nova Semana
        </button>
      </div>
    );
  };
  
  return (
    <div className="w-full max-w-md mx-auto px-4 py-6">
      {/* Stats Box */}
      {playerProfile && <StatsBox careerStats={careerStats} />}
      
      {/* XP Progress Bar */}
      {playerProfile && renderXpProgressBar()}
      
      {/* Narrative Section */}
      <div 
        className="min-h-[120px] border-2 border-cyan p-4 mb-4 text-sm"
        dangerouslySetInnerHTML={{ __html: formatNarrative(currentNarrative) }}
      />
      
      {/* Attribute Improvements */}
      {renderAttributeImprovements()}
      
      {/* Choice Options - only show if game not ended or we're in new week mode */}
      {nextOptions && !isLoading && (!gameEnded || isNewWeek) && (
        <div className="grid grid-cols-1 gap-4 mb-8 mt-4">
          <button 
            className="retro-button w-full text-left flex items-center"
            onClick={() => handleChoice('A')}
            disabled={isLoading}
          >
            <span className="mr-2">①</span> {nextOptions.labelA}
          </button>
          
          <button 
            className="retro-button w-full text-left flex items-center"
            onClick={() => handleChoice('B')}
            disabled={isLoading}
          >
            <span className="mr-2">②</span> {nextOptions.labelB}
          </button>
        </div>
      )}
      
      {/* Loading indicator */}
      {isLoading && (
        <div className="flex justify-center items-center my-6">
          <div className="h-8 w-8 border-4 border-cyan rounded-full border-t-transparent animate-spin"></div>
        </div>
      )}
      
      {/* Start New Week Button (only shows after game ends) */}
      {renderStartNewWeekButton()}
      
      {/* Navigation buttons */}
      <div className="flex justify-between mt-8">
        <button 
          className="retro-button retro-button-secondary flex items-center"
          onClick={() => setActiveScreen('history')}
        >
          <History className="w-4 h-4 mr-2" /> Histórico
        </button>
      </div>
    </div>
  );
};

export default GameScreen;
