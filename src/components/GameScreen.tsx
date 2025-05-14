
import { useState, useEffect, useRef } from 'react';
import { useGameStore } from '@/store/gameStore';
import { gameService } from '@/services/gameService';
import { ArrowRight, History, Send } from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { toast } from './ui/use-toast';

const GameScreen = () => {
  const { 
    playerProfile, 
    choiceLog, 
    currentNarrative, 
    isLoading, 
    setLoading,
    addChoice, 
    setCurrentNarrative, 
    setActiveScreen
  } = useGameStore();
  
  const [userInput, setUserInput] = useState('');
  const narrativeRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    // Auto-scroll to the bottom of narrative when it updates
    if (narrativeRef.current) {
      narrativeRef.current.scrollTop = narrativeRef.current.scrollHeight;
    }
  }, [currentNarrative]);
  
  // Helper function to colorize narrative text
  const formatNarrative = (text: string) => {
    if (!text) return '';
    
    return text
      .replace(/<cyan>(.*?)<\/cyan>/g, '<span class="cyan-text">$1</span>')
      .replace(/<yellow>(.*?)<\/yellow>/g, '<span class="yellow-text">$1</span>')
      .replace(/<magenta>(.*?)<\/magenta>/g, '<span class="magenta-text">$1</span>');
  };
  
  // Handle chat submission
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!playerProfile || !userInput.trim()) return;
    
    try {
      setLoading(true);
      
      // Record choice in log
      const newChoice = {
        id: choiceLog.length,
        event: choiceLog.length === 0 ? 'INTRO' : `CHOICE_${choiceLog.length}`,
        choice: userInput,
        timestamp: new Date().toISOString()
      };
      
      addChoice(newChoice);
      
      // Get next narrative based on user input
      const response = await gameService.makeUserInput(playerProfile, [...choiceLog, newChoice], userInput);
      
      // Update game state
      setCurrentNarrative(prev => `${prev}\n\n<cyan>Você:</cyan> ${userInput}\n\n${response.narrative}`);
      
      // Clear input
      setUserInput('');
    } catch (error) {
      console.error("Failed to process input:", error);
      toast({
        title: "Erro",
        description: "Houve um erro ao processar sua mensagem",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="w-full max-w-md mx-auto px-4 py-6">
      {/* Narrative Section - Now a chat log */}
      <div 
        ref={narrativeRef}
        className="max-h-[300px] overflow-y-auto border-2 border-cyan p-4 mb-8 text-sm whitespace-pre-line"
        dangerouslySetInnerHTML={{ __html: formatNarrative(currentNarrative) }}
      />
      
      {/* Chat input */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 mb-8">
        <Textarea
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="Digite sua resposta..."
          className="min-h-[80px] text-cyan bg-transparent border-cyan"
          disabled={isLoading}
        />
        
        <div className="flex justify-end">
          <Button 
            type="submit"
            className="retro-button flex items-center"
            disabled={isLoading || !userInput.trim()}
          >
            Enviar <Send className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </form>
      
      {/* Loading indicator */}
      {isLoading && (
        <div className="flex justify-center items-center my-6">
          <div className="h-8 w-8 border-4 border-cyan rounded-full border-t-transparent animate-spin"></div>
        </div>
      )}
      
      {/* Navigation buttons */}
      <div className="flex justify-between mt-8">
        <Button 
          className="retro-button retro-button-secondary flex items-center"
          onClick={() => setActiveScreen('history')}
        >
          <History className="w-4 h-4 mr-2" /> Histórico
        </Button>
      </div>
    </div>
  );
};

export default GameScreen;
