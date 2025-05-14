
import { useGameStore } from '@/store/gameStore';
import CreatePlayer from './CreatePlayer';
import GameScreen from './GameScreen';
import HistoryView from './HistoryView';
import { useEffect } from 'react';
import { initializeOpenAI } from '@/services/gameService';
import { History } from 'lucide-react';

const Layout = () => {
  const { activeScreen, gameStarted, setActiveScreen } = useGameStore();
  
  useEffect(() => {
    // Try to initialize OpenAI with saved API key on component mount
    const savedApiKey = localStorage.getItem('openai_api_key');
    if (savedApiKey) {
      initializeOpenAI(savedApiKey);
    }
  }, []);
  
  // Render the active screen
  const renderScreen = () => {
    switch (activeScreen) {
      case 'creation':
        return <CreatePlayer />;
      case 'game':
        return <GameScreen />;
      case 'history':
        return <HistoryView />;
      default:
        return <CreatePlayer />;
    }
  };
  
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md border-4 border-cyan p-2 bg-black">
        <div className="mb-4 flex justify-center space-x-2 text-sm">
          <button 
            className={`px-2 py-1 ${activeScreen === 'creation' ? 'bg-cyan-700 text-white' : 'bg-gray-600'} rounded`}
            onClick={() => useGameStore.setState({ activeScreen: 'creation' })}
          >
            Game
          </button>
          
          {gameStarted && (
            <button 
              className={`px-2 py-1 ${activeScreen === 'history' ? 'bg-cyan-700 text-white' : 'bg-gray-600'} rounded flex items-center`}
              onClick={() => setActiveScreen('history')}
            >
              <History className="w-3 h-3 mr-1" /> Histórico
            </button>
          )}
        </div>
        {renderScreen()}
      </div>
      
      {/* Footer */}
      <div className="mt-4 text-xs text-gray-400 text-center">
        <p>CAMPO 8-BIT • CHOICE EDITION</p>
      </div>
    </div>
  );
};

export default Layout;
