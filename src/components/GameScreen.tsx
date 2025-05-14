
import { useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';
import { gameService } from '@/services/gameService';
import { ArrowRight, History } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
    setActiveScreen
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
  
  // Make a choice
  const handleChoice = async (choice: 'A' | 'B') => {
    if (!playerProfile || !nextOptions) return;
    
    try {
      setLoading(true);
      
      // Get the choice text
      const choiceText = choice === 'A' ? nextOptions.labelA : nextOptions.labelB;
      
      // Get next narrative based on choice
      const response = await gameService.makeChoice(playerProfile, [...choiceLog], choice);
      
      // Record choice in log with narrative and outcome
      const newChoice = {
        id: choiceLog.length,
        event: choiceLog.length === 0 ? 'INTRO' : `CHOICE_${choiceLog.length}`,
        choice,
        timestamp: new Date().toISOString(),
        narrative: currentNarrative, // Save current narrative (before the choice)
        nextEvent: nextOptions, // Save the options that were presented
        outcome: response.outcome // Save outcome of the choice
      };
      
      addChoice(newChoice);
      
      // Update game state
      setCurrentNarrative(response.narrative);
      setNextOptions(response.nextEvent);
      
      // Show toast with choice effect/outcome
      if (response.outcome) {
        const toastVariant = 
          response.outcome.type === 'POSITIVO' ? 'default' : 
          response.outcome.type === 'NEGATIVO' ? 'destructive' : 'default';
        
        toast({
          title: `Escolha: ${choiceText}`,
          description: response.outcome.message,
          variant: toastVariant,
          duration: 4000
        });
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
  
  return (
    <div className="w-full max-w-md mx-auto px-4 py-6">
      {/* Narrative Section */}
      <div 
        className="min-h-[120px] border-2 border-cyan p-4 mb-8 text-sm"
        dangerouslySetInnerHTML={{ __html: formatNarrative(currentNarrative) }}
      />
      
      {/* Choice Options */}
      {nextOptions && !isLoading && (
        <div className="grid grid-cols-1 gap-4 mb-8">
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
