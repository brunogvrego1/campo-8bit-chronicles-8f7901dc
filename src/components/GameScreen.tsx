import { useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';
import { gameService } from '@/services/gameService';
import { ArrowRight, History, Award } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { PlayerProfile } from '@/lib/types';
import StatsBox from './StatsBox';

const GameScreen = () => {
  const { 
    playerProfile, 
    choiceLog, 
    currentNarrative, 
    nextOptions, 
    isLoading, 
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
    updateCareerStats
  } = useGameStore();
  
  const { toast } = useToast();
  
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
      
      // Get next narrative based on choice
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
          variant: toastVariant,
          duration: 4000
        });
      }
      
      // Add XP to the pool
      if (xpGain > 0) {
        addXp(xpGain);
        
        toast({
          title: `Experiência Adquirida`,
          description: `+${xpGain} XP${responseFocus ? ` (Foco: ${getAttributeDisplayName(responseFocus)})` : ''}`,
          variant: "default",
          duration: 3000
        });
      }
      
      // Update career stats for match performance
      const currentSlot = choiceLog.length % 4;
      if (currentSlot >= 2 && response.matchStats) { // Slots 3-4: Match day events
        const statsUpdate = {
          matches: currentSlot === 2 ? 1 : 0, // Only count once per match (on first match action)
          goals: response.matchStats?.goals || 0,
          assists: response.matchStats?.assists || 0,
          keyDefenses: response.matchStats?.keyDefenses || 0
        };
        
        updateCareerStats(statsUpdate);
      } else if (currentSlot === 1) { // Slot 2: Social media events
        // Check if it's a social media event
        const isLive = response.timeline?.[1]?.type === "LIVE_REDES";
        
        // Update followers based on charisma and random factor for social media events
        if (isLive && playerProfile) {
          const charismaBoost = playerProfile.attributes.charisma * 10;
          const randomFactor = Math.floor(Math.random() * 50); // Random 0-50
          updateCareerStats({ followers: charismaBoost + randomFactor });
          
          // Notify the user
          toast({
            title: "Redes Sociais",
            description: `+${charismaBoost + randomFactor} seguidores`,
            duration: 3000
          });
        }
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
  
  // Function to convert attribute keys to display names
  const getAttributeDisplayName = (attr: keyof PlayerProfile['attributes']): string => {
    const displayNames: Record<keyof PlayerProfile['attributes'], string> = {
      speed: "Velocidade",
      physical: "Físico",
      shooting: "Chute",
      heading: "Cabeceio",
      charisma: "Carisma",
      passing: "Passe",
      defense: "Defesa"
    };
    return displayNames[attr] || attr;
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
            style={{ width: `${percentage}%` }}
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
      
      {/* Choice Options */}
      {nextOptions && !isLoading && (
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
      
      {/* Navigation buttons */}
      <div className="flex justify-between mt-8">
        <button 
          className="retro-button retro-button-secondary flex items-center"
          onClick={() => setActiveScreen('history')}
        >
          <History className="w-4 h-4 mr-2" /> Histórico
        </button>
        
        {isLoading && (
          <button 
            className="retro-button flex items-center opacity-50"
            disabled
          >
            Próximo <ArrowRight className="w-4 h-4 ml-2" />
          </button>
        )}
      </div>
    </div>
  );
};

export default GameScreen;
