
import { useState, useEffect } from 'react';
import { initializeOpenAI, isOpenAIInitialized } from '@/services/gameService';
import { useToast } from '@/hooks/use-toast';

const ApiKeyInput = () => {
  const [apiKey, setApiKey] = useState('');
  const [isInitialized, setIsInitialized] = useState(isOpenAIInitialized());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  
  useEffect(() => {
    // Check if OpenAI is already initialized
    setIsInitialized(isOpenAIInitialized());
  }, []);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!apiKey.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, insira uma chave de API válida",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const success = initializeOpenAI(apiKey);
      
      if (success) {
        setIsInitialized(true);
        toast({
          title: "Sucesso",
          description: "API OpenAI conectada com sucesso!",
        });
        
        // Save API key in localStorage (not secure, but for demo purposes)
        localStorage.setItem('openai_api_key', apiKey);
      } else {
        toast({
          title: "Erro",
          description: "Falha ao conectar com a API OpenAI",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error initializing OpenAI:", error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao conectar com a API OpenAI",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (isInitialized) {
    return (
      <div className="text-center text-sm text-cyan p-2">
        OpenAI conectado ✓
      </div>
    );
  }
  
  return (
    <div className="p-4 border-2 border-cyan my-4">
      <h3 className="font-pixel text-cyan mb-4">Conectar OpenAI</h3>
      <p className="text-xs mb-4">
        Conecte sua chave de API OpenAI para habilitar narrativas personalizadas e dinâmicas no jogo.
      </p>
      
      <form onSubmit={handleSubmit}>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="sk-..."
          className="w-full bg-black text-white border border-gray-700 p-2 mb-4"
          disabled={isSubmitting}
        />
        
        <button
          type="submit"
          className="retro-button w-full"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Conectando...' : 'Conectar OpenAI'}
        </button>
        
        <p className="text-xs text-gray-400 mt-2">
          Sua chave API será armazenada apenas localmente no seu navegador.
        </p>
      </form>
    </div>
  );
};

export default ApiKeyInput;
