
import { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { ArrowLeft, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const HistoryView = () => {
  const { playerProfile, choiceLog, setActiveScreen } = useGameStore();
  const { toast } = useToast();
  const [page, setPage] = useState(0);
  const [expandedChoice, setExpandedChoice] = useState<number | null>(null);
  const itemsPerPage = 5; // Reduced to show fewer items per page due to increased content
  
  // Calculate the total number of pages
  const totalPages = Math.ceil(choiceLog.length / itemsPerPage);
  
  // Get the choices for the current page
  const currentChoices = choiceLog.slice(
    page * itemsPerPage,
    (page + 1) * itemsPerPage
  );
  
  // Helper function to colorize narrative text
  const formatNarrative = (text: string) => {
    if (!text) return '';
    
    return text
      .replace(/<cyan>(.*?)<\/cyan>/g, '<span class="cyan-text">$1</span>')
      .replace(/<yellow>(.*?)<\/yellow>/g, '<span class="yellow-text">$1</span>')
      .replace(/<magenta>(.*?)<\/magenta>/g, '<span class="magenta-text">$1</span>');
  };
  
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
  
  // Generate background color based on event type or outcome type
  const getEventColor = (choice: Choice) => {
    if (choice.outcome) {
      switch (choice.outcome.type) {
        case 'POSITIVO': return 'bg-green-700 bg-opacity-20';
        case 'NEGATIVO': return 'bg-red-700 bg-opacity-20';
        case 'NEUTRO': return 'bg-gray-700 bg-opacity-20';
        case 'DECISIVO': return 'bg-yellow-700 bg-opacity-20';
        case 'ESTRATÉGICO': return 'bg-cyan-DEFAULT bg-opacity-20';
      }
    }
    
    if (choice.event === 'INTRO') return 'bg-cyan-DEFAULT bg-opacity-20';
    if (choice.event.includes('CHOICE')) return 'bg-magenta-DEFAULT bg-opacity-20';
    return '';
  };
  
  const getOutcomeIcon = (type: string) => {
    switch (type) {
      case 'POSITIVO': return '✅';
      case 'NEGATIVO': return '❌';
      case 'NEUTRO': return '➖';
      case 'DECISIVO': return '⭐';
      case 'ESTRATÉGICO': return '💡';
      default: return '';
    }
  };
  
  const toggleExpand = (id: number) => {
    if (expandedChoice === id) {
      setExpandedChoice(null);
    } else {
      setExpandedChoice(id);
    }
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
      
      <div className="space-y-4 mb-6">
        {currentChoices.map((choice, index) => (
          <div 
            key={choice.id} 
            className={`border border-gray-700 ${getEventColor(choice)}`}
          >
            <div 
              className="p-3 flex items-center cursor-pointer"
              onClick={() => toggleExpand(choice.id)}
            >
              <div className="w-8 h-8 flex items-center justify-center bg-gray-900 mr-3 flex-shrink-0">
                {page * itemsPerPage + index + 1}
              </div>
              <div className="text-sm flex-grow">
                {getChoiceText(choice.choice, choice.event)}
              </div>
              {choice.outcome && (
                <div className="text-lg ml-2" title={choice.outcome.message}>
                  {getOutcomeIcon(choice.outcome.type)}
                </div>
              )}
              <div className="ml-2">
                {expandedChoice === choice.id ? '▲' : '▼'}
              </div>
            </div>
            
            {expandedChoice === choice.id && (
              <div className="px-4 pb-4 pt-2 border-t border-gray-700">
                {choice.narrative && (
                  <div className="mb-3">
                    <h4 className="text-xs text-gray-400 mb-1">Narrativa:</h4>
                    <div 
                      className="text-xs"
                      dangerouslySetInnerHTML={{ __html: formatNarrative(choice.narrative) }}
                    />
                  </div>
                )}
                
                {choice.outcome && (
                  <div>
                    <h4 className="text-xs text-gray-400 mb-1">Efeito:</h4>
                    <div className="text-xs">{choice.outcome.message}</div>
                  </div>
                )}
              </div>
            )}
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
