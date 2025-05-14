
import { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { NationalityOption, PositionOption, PlayerProfile } from '@/lib/types';
import { gameService } from '@/services/gameService';

const nationalities: NationalityOption[] = [
  { code: 'BR', name: 'Brasil', flag: '🇧🇷', startClub: 'Avaí', league: 'Série B' },
  { code: 'US', name: 'EUA', flag: '🇺🇸', startClub: 'LA Galaxy II', league: 'MLS Next Pro' },
  { code: 'FR', name: 'França', flag: '🇫🇷', startClub: 'Sochaux', league: 'Ligue 2' },
  { code: 'JP', name: 'Japão', flag: '🇯🇵', startClub: 'FC Ryukyu', league: 'J2' },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷', startClub: 'Aldosivi', league: 'Primera B' },
  { code: 'ES', name: 'Espanha', flag: '🇪🇸', startClub: 'Málaga', league: 'Segunda División' },
  { code: 'DE', name: 'Alemanha', flag: '🇩🇪', startClub: 'Dynamo Dresden', league: '3. Liga' },
  { code: 'IT', name: 'Itália', flag: '🇮🇹', startClub: 'Pescara', league: 'Serie C' },
];

const positions: PositionOption[] = [
  { code: 'GOL', name: 'Goleiro' },
  { code: 'ZAG', name: 'Zagueiro' },
  { code: 'LAT', name: 'Lateral' },
  { code: 'VOL', name: 'Volante' },
  { code: 'MEI', name: 'Meia' },
  { code: 'ATA', name: 'Atacante' }
];

const CreatePlayer = () => {
  const { creationStep, setCreationStep, setPlayerProfile, setCurrentNarrative, setNextOptions, startGame } = useGameStore();
  
  const [name, setName] = useState('');
  const [age, setAge] = useState<number | null>(null);
  const [nationality, setNationality] = useState<NationalityOption | null>(null);
  const [position, setPosition] = useState<PositionOption | null>(null);
  
  const handleNext = () => {
    setCreationStep(creationStep + 1);
  };
  
  const handleBack = () => {
    setCreationStep(creationStep - 1);
  };
  
  const handleStartGame = async () => {
    const selectedNation = nationality || nationalities[0];
    const selectedPos = position || positions[0];
    
    // Create player profile
    const profile: PlayerProfile = {
      name: name || 'Jogador',
      age: age || 18,
      nationality: selectedNation.code,
      position: selectedPos.code,
      startClub: selectedNation.startClub,
      createdAt: new Date().toISOString()
    };
    
    // Save profile to store
    setPlayerProfile(profile);
    
    try {
      // Call API to start game
      const response = await gameService.startGame(profile);
      
      // Update game state with response
      setCurrentNarrative(response.narrative);
      setNextOptions(response.nextEvent);
      
      // Start the game
      startGame();
    } catch (error) {
      console.error("Failed to start game:", error);
    }
  };
  
  const isNameValid = name.length >= 3 && name.length <= 15;
  
  // Render the current creation step
  const renderStep = () => {
    switch(creationStep) {
      case 0:
        return (
          <div className="flex flex-col items-center space-y-8">
            <h1 className="text-xl font-pixel cyan-text">CAMPO 8-BIT</h1>
            <p className="text-sm font-pixel mb-4">Choice Edition</p>
            <button 
              className="retro-button mt-8"
              onClick={handleNext}
            >
              CRIAR JOGADOR
            </button>
          </div>
        );
      
      case 1:
        return (
          <div className="flex flex-col items-center space-y-6">
            <h2 className="text-lg font-pixel cyan-text">Nome do Jogador</h2>
            <div className="w-full">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Digite seu nome artístico"
                className="w-full bg-gray-900 border-2 border-cyan p-2 font-pixel text-sm"
                maxLength={15}
              />
              <p className="text-xs mt-1 text-gray-400">
                {name.length}/15 caracteres
              </p>
            </div>
            
            <div className="flex w-full justify-between mt-8">
              <button 
                className="retro-button retro-button-secondary"
                onClick={handleBack}
              >
                VOLTAR
              </button>
              
              <button 
                className="retro-button"
                onClick={handleNext}
                disabled={!isNameValid}
                style={{ opacity: isNameValid ? 1 : 0.5 }}
              >
                PRÓXIMO
              </button>
            </div>
          </div>
        );
      
      case 2:
        return (
          <div className="flex flex-col items-center space-y-6">
            <h2 className="text-lg font-pixel cyan-text">Idade</h2>
            
            <div className="grid grid-cols-3 gap-4 w-full">
              {[16, 17, 18, 19, 20, 21].map((a) => (
                <button
                  key={a}
                  className={`retro-button ${age === a ? '' : 'retro-button-secondary'} w-full`}
                  onClick={() => setAge(a)}
                >
                  {a}
                </button>
              ))}
            </div>
            
            <div className="flex w-full justify-between mt-8">
              <button 
                className="retro-button retro-button-secondary"
                onClick={handleBack}
              >
                VOLTAR
              </button>
              
              <button 
                className="retro-button"
                onClick={handleNext}
                disabled={!age}
                style={{ opacity: age ? 1 : 0.5 }}
              >
                PRÓXIMO
              </button>
            </div>
          </div>
        );
      
      case 3:
        return (
          <div className="flex flex-col items-center space-y-6">
            <h2 className="text-lg font-pixel cyan-text">Nacionalidade</h2>
            
            <div className="grid grid-cols-4 gap-2 w-full">
              {nationalities.map((nat) => (
                <button
                  key={nat.code}
                  className={`p-2 flex flex-col items-center justify-center border-2 
                            ${nationality?.code === nat.code ? 'border-magenta' : 'border-cyan'}`}
                  onClick={() => setNationality(nat)}
                >
                  <span className="text-2xl">{nat.flag}</span>
                  <span className="text-xs mt-1">{nat.name}</span>
                </button>
              ))}
            </div>
            
            {nationality && (
              <div className="text-xs w-full text-center mt-2">
                <span className="cyan-text">{nationality.startClub}</span> - {nationality.league}
              </div>
            )}
            
            <div className="flex w-full justify-between mt-8">
              <button 
                className="retro-button retro-button-secondary"
                onClick={handleBack}
              >
                VOLTAR
              </button>
              
              <button 
                className="retro-button"
                onClick={handleNext}
                disabled={!nationality}
                style={{ opacity: nationality ? 1 : 0.5 }}
              >
                PRÓXIMO
              </button>
            </div>
          </div>
        );
      
      case 4:
        return (
          <div className="flex flex-col items-center space-y-6">
            <h2 className="text-lg font-pixel cyan-text">Posição</h2>
            
            <div className="grid grid-cols-3 gap-4 w-full">
              {positions.map((pos) => (
                <button
                  key={pos.code}
                  className={`retro-button ${position?.code === pos.code ? '' : 'retro-button-secondary'} w-full`}
                  onClick={() => setPosition(pos)}
                >
                  {pos.code}
                </button>
              ))}
            </div>
            
            {position && (
              <div className="text-xs mt-2">
                <span className="cyan-text">{position.name}</span>
              </div>
            )}
            
            <div className="flex w-full justify-between mt-8">
              <button 
                className="retro-button retro-button-secondary"
                onClick={handleBack}
              >
                VOLTAR
              </button>
              
              <button 
                className="retro-button"
                onClick={handleNext}
                disabled={!position}
                style={{ opacity: position ? 1 : 0.5 }}
              >
                PRÓXIMO
              </button>
            </div>
          </div>
        );
      
      case 5:
        return (
          <div className="flex flex-col items-center space-y-6">
            <h2 className="text-lg font-pixel cyan-text">Confirmar Jogador</h2>
            
            <div className="border-2 border-cyan p-4 w-full">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold">{name || 'Jogador'}</p>
                  <p className="text-xs mt-2">{age || 18} anos</p>
                  <p className="text-xs">{position?.name || 'Posição'}</p>
                  <p className="text-xs">{nationality?.name || 'País'} {nationality?.flag}</p>
                </div>
                
                <div className="w-16 h-16 bg-gray-800 flex items-center justify-center">
                  <span className="text-3xl">👤</span>
                </div>
              </div>
              
              <div className="mt-4 text-xs">
                <p className="cyan-text">Clube: {nationality?.startClub || 'Clube'}</p>
                <p>{nationality?.league || 'Liga'}</p>
              </div>
            </div>
            
            <div className="flex w-full justify-between mt-8">
              <button 
                className="retro-button retro-button-secondary"
                onClick={handleBack}
              >
                VOLTAR
              </button>
              
              <button 
                className="retro-button"
                onClick={handleStartGame}
              >
                COMEÇAR CARREIRA
              </button>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };
  
  return (
    <div className="w-full max-w-md mx-auto px-4 py-8">
      {renderStep()}
    </div>
  );
};

export default CreatePlayer;
