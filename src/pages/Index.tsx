
import { useEffect } from 'react';
import Layout from '@/components/Layout';
import { supabase } from '@/integrations/supabase/client';

const Index = () => {
  // Preload team data to ensure it's cached
  useEffect(() => {
    const preloadTeams = async () => {
      try {
        await supabase.from('teams').select('name, country_code').limit(1);
        console.log('Team data preloaded');
      } catch (error) {
        console.error('Failed to preload team data:', error);
      }
    };
    
    preloadTeams();
  }, []);

  return <Layout />;
};

export default Index;
