
import { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { ArrowLeft, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const HistoryView = () => {
  const { playerProfile, choiceLog, setActiveScreen } = useGameStore();
  const { toast } = useToast();
  const [page, setPage] = useState(0);
  const itemsPerPage = 10;
  
  // Calculate the total number of pages
  const totalPages = Math.ceil(choiceLog.length / itemsPerPage);
  
  // Get the choices for the current page
  const currentChoices = choiceLog.slice(
    page * itemsPerPage,
    (page + 1) * itemsPerPage
  );
  
  // Generate choice display text
  const getChoiceText = (choice: string | null, event: string) => {
    if (choice === null) {
      return 'Criou jogador';
    }
    
    if (event === 'INTRO') {
      return choice === 'A' ? 'Treinar passe' : 'Treinar finalização';
    }
    
    return `Escolheu ${choice === 'A' ? '①' : '②'}`;
  };
  
  // Generate background color based on event type
  const getEventColor = (event: string) => {
    if (event === 'INTRO') return 'bg-cyan-DEFAULT bg-opacity-20';
    if (event.includes('CHOICE')) return 'bg-magenta-DEFAULT bg-opacity-20';
    return '';
  };
  
  const copyHistoryUrl = () => {
    // In a real implementation, this would generate a shareable URL
    // For now, we'll just copy the current URL + a fake hash
    const url = `${window.location.href}#history-${playerProfile?.name.toLowerCase().replace(' ', '-')}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "URL copiado!",
      description: "Link do seu histórico copiado para a área de transferência."
    });
  };
  
  return (
    <div className="w-full max-w-md mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-pixel cyan-text">Histórico</h2>
        <button 
          className="retro-button retro-button-secondary flex items-center"
          onClick={() => setActiveScreen('game')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
        </button>
      </div>
      
      {playerProfile && (
        <div className="border-2 border-cyan p-4 mb-6">
          <p className="font-pixel text-sm">{playerProfile.name}</p>
          <p className="text-xs mt-2">{playerProfile.position} • {playerProfile.age} anos</p>
          <p className="text-xs">{playerProfile.startClub}</p>
        </div>
      )}
      
      <div className="space-y-2 mb-6">
        {currentChoices.map((choice, index) => (
          <div 
            key={choice.id} 
            className={`p-3 border border-gray-700 flex items-center ${getEventColor(choice.event)}`}
          >
            <div className="w-8 h-8 flex items-center justify-center bg-gray-900 mr-3 flex-shrink-0">
              {page * itemsPerPage + index + 1}
            </div>
            <div className="text-sm">
              {getChoiceText(choice.choice, choice.event)}
            </div>
          </div>
        ))}
        
        {choiceLog.length === 0 && (
          <div className="text-center text-gray-400 py-8">
            Nenhum histórico disponível.
          </div>
        )}
      </div>
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center space-x-2 mb-6">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              className={`w-8 h-8 flex items-center justify-center border
                        ${page === i ? 'border-cyan-DEFAULT' : 'border-gray-700'}`}
              onClick={() => setPage(i)}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
      
      {/* Share button */}
      <div className="flex justify-center mt-6">
        <button 
          className="retro-button flex items-center"
          onClick={copyHistoryUrl}
        >
          <Copy className="w-4 h-4 mr-2" /> Copiar URL do meu histórico
        </button>
      </div>
    </div>
  );
};

export default HistoryView;
