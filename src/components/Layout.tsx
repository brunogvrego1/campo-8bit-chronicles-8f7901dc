
import { useGameStore } from '@/store/gameStore';
import CreatePlayer from './CreatePlayer';
import GameScreen from './GameScreen';
import HistoryView from './HistoryView';
import ApiKeyInput from './ApiKeyInput';
import { useEffect } from 'react';
import { initializeOpenAI } from '@/services/gameService';

const Layout = () => {
  const { activeScreen } = useGameStore();
  
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
        <ApiKeyInput />
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
