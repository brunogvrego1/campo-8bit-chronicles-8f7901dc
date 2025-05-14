
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
  
  // Helper function to colorize narrative text with improved styling for the new structure
  const formatNarrative = (text: string) => {
    if (!text) return '';
    
    // Format colored text
    let formattedText = text
      .replace(/<cyan>(.*?)<\/cyan>/g, '<span class="text-cyan-400">$1</span>')
      .replace(/<yellow>(.*?)<\/yellow>/g, '<span class="text-yellow-400">$1</span>')
      .replace(/<magenta>(.*?)<\/magenta>/g, '<span class="text-pink-500 font-semibold">$1</span>');
      
    // Add spacing between paragraphs for better readability
    formattedText = formattedText.replace(/\n\n/g, '<div class="my-2"></div>');
    
    // Make italic text actually italic
    formattedText = formattedText.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    return formattedText;
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
      
      // Update game state - we don't need to add the user input here since it's already in the response
      setCurrentNarrative(prev => `${prev}\n\n${response.narrative}`);
      
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
      {/* Narrative Section - Enhanced styling for better readability */}
      <div 
        ref={narrativeRef}
        className="max-h-[400px] overflow-y-auto border-2 border-cyan rounded-md p-4 mb-6 text-sm whitespace-pre-line bg-black/30 shadow-inner"
        dangerouslySetInnerHTML={{ __html: formatNarrative(currentNarrative) }}
      />
      
      {/* Chat input */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 mb-6">
        <Textarea
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="O que você quer dizer ou fazer..."
          className="min-h-[80px] text-cyan bg-transparent border-cyan resize-none"
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
        <div className="flex justify-center items-center my-4">
          <div className="h-8 w-8 border-4 border-cyan rounded-full border-t-transparent animate-spin"></div>
        </div>
      )}
      
      {/* Navigation buttons */}
      <div className="flex justify-between mt-6">
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
