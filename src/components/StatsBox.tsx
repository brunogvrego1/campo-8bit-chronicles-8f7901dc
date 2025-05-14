
import { Calendar, Award, Trophy, Shield, Flag, User } from 'lucide-react';
import { PlayerStats } from '@/lib/types';

interface StatsBoxProps {
  careerStats: PlayerStats;
}

const StatsBox = ({ careerStats }: StatsBoxProps) => {
  return (
    <div className="mb-4 p-3 border-2 border-cyan bg-gray-900/50 rounded pixel-borders">
      <h3 className="text-xs mb-2 cyan-text">ESTATÍSTICAS DE CARREIRA</h3>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="flex items-center">
          <Calendar className="w-3 h-3 mr-1 text-slate-300" />
          <span className="text-slate-300">{careerStats.age} anos</span>
        </div>
        <div className="flex items-center">
          <Award className="w-3 h-3 mr-1 text-yellow-400" />
          <span className="text-yellow-400">{careerStats.goals} gols</span>
        </div>
        <div className="flex items-center">
          <Trophy className="w-3 h-3 mr-1 text-amber-300" />
          <span className="text-amber-300">{careerStats.assists} assists</span>
        </div>
        <div className="flex items-center">
          <Shield className="w-3 h-3 mr-1 text-sky-300" />
          <span className="text-sky-300">{careerStats.keyDefenses} def</span>
        </div>
        <div className="flex items-center">
          <Flag className="w-3 h-3 mr-1 text-cyan-300" />
          <span className="text-cyan-300">{careerStats.matches} jogos</span>
        </div>
        <div className="flex items-center">
          <User className="w-3 h-3 mr-1 text-fuchsia-300" />
          <span className="text-fuchsia-300">{careerStats.followers.toLocaleString()} seg</span>
        </div>
      </div>
    </div>
  );
};

export default StatsBox;
