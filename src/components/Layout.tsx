
import { useGameStore } from '@/store/gameStore';
import CreatePlayer from './CreatePlayer';
import GameScreen from './GameScreen';
import HistoryView from './HistoryView';

const Layout = () => {
  const { activeScreen } = useGameStore();
  
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
