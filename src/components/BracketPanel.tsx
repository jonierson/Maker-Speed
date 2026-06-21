import { Matchup, Team } from '../types';
import { Play, Check, Lock, ShieldAlert, Award, Sparkles } from 'lucide-react';
import React from 'react';

interface BracketPanelProps {
  matchups: Matchup[];
  teams: Team[];
  onSelectMatchup: (matchupId: string) => void;
  championTeam: Team | null;
  onResetTournament: () => void;
}

export default function BracketPanel({
  matchups,
  teams,
  onSelectMatchup,
  championTeam,
  onResetTournament,
}: BracketPanelProps) {
  // Find Grand Final
  const grandFinal = matchups.find(m => m.id === 'match_final');
  if (!grandFinal) return <p className="text-white">Erro ao carregar o chaveamento.</p>;

  const roundsCount = grandFinal.round - 1; // Number of rounds in Group A and Group B
  
  // Build rounds list for left and right columns
  const roundsList = Array.from({ length: roundsCount }, (_, i) => i + 1);

  // Helper to render a team row in the Matchup Card
  const renderTeamRow = (teamId: string | null, placeholder: string, score: number, isWinner: boolean, isOpponentBye: boolean) => {
    if (isOpponentBye && teamId) {
      const team = teams.find(t => t.id === teamId);
      return (
        <div className="flex items-center justify-between p-2.5 bg-green-950/20 rounded-md border border-green-900/40">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: team?.color || '#22C55E' }} />
            <div className="text-xs font-bold text-white truncate team-name">{team?.name}</div>
          </div>
          <div className="text-[10px] font-bold text-green-400 bg-green-950 px-1.5 py-0.5 rounded border border-green-900/60 uppercase">
            Passagem Automática (BYE)
          </div>
        </div>
      );
    }

    if (!teamId) {
      return (
        <div className="flex items-center justify-between p-2.5 bg-neutral-950/40 rounded-md border border-neutral-900 border-dashed">
          <span className="text-xs text-neutral-500 italic truncate font-medium">{placeholder}</span>
          <span className="text-xs font-mono text-neutral-600 font-bold">-</span>
        </div>
      );
    }

    const team = teams.find(t => t.id === teamId);
    if (!team) return null;

    return (
      <div 
        className={`flex items-center justify-between p-2.5 rounded-md transition-colors ${
          isWinner 
            ? 'bg-neutral-800 border-l-[3px] border-l-[#22C55E] text-white font-bold' 
            : 'bg-neutral-950 text-neutral-400 border-l-[3px]'
        }`}
        style={{ borderLeftColor: isWinner ? undefined : team.color }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-2.5 w-2.5 rounded-full shadow-sm" style={{ backgroundColor: team.color }} />
          <div className="text-xs truncate flex flex-col justify-center">
            <span className={`font-bold block team-name ${isWinner ? 'team-winner-text' : 'team-loser-text'}`}>{team.name}</span>
            <span className="block text-[9px] text-neutral-500 font-normal truncate">
              👥 {team.members}
            </span>
          </div>
        </div>
        <span className={`text-xs font-semibold font-mono px-1.5 rounded ${
          isWinner 
            ? 'text-green-400 bg-green-950/50 team-winner-score' 
            : 'text-neutral-500 team-loser-score'
        }`}>
          {score}
        </span>
      </div>
    );
  };

  // Helper to render a Matchup Card
  const renderMatchupCard = (matchup: Matchup) => {
    const isReady = matchup.team1Id !== null && matchup.team2Id !== null;
    const isCompleted = matchup.isCompleted;
    
    // Check if it was solved by a BYE
    const isByeA = matchup.team1Id !== null && matchup.team2Id === null && matchup.round === 1;
    const isByeB = matchup.team1Id === null && matchup.team2Id !== null && matchup.round === 1;
    const isBye = isByeA || isByeB;

    let borderClass = 'border-neutral-800';
    let bgClass = 'bg-neutral-900/90';
    if (isCompleted) {
      borderClass = 'border-neutral-800/60 opacity-80';
    } else if (isReady) {
      borderClass = 'border-orange-500/50 shadow-lg shadow-orange-500/5';
      bgClass = 'bg-neutral-900';
    }

    return (
      <div 
        key={matchup.id} 
        className={`border ${borderClass} ${bgClass} rounded-xl p-3 space-y-2.5 transition-all w-[240px] shadow-md`}
      >
        {/* Card Header Info */}
        <div className="flex justify-between items-center bg-neutral-950/50 p-1.5 rounded-md text-[10px]">
          <span className="font-bold text-neutral-400 font-mono tracking-wider">
            {matchup.group === 'FINAL' ? '🏆 FINALISSIMA' : `📊 DUELO ${matchup.round}.${matchup.nodeIndex + 1}`}
          </span>
          
          <div className="flex items-center gap-1">
            {isCompleted ? (
              <span className="text-green-400 flex items-center gap-0.5 font-bold">
                <Check className="h-3 w-3" /> Encerrado
              </span>
            ) : isReady ? (
              <span className="text-orange-400 flex items-center gap-0.5 font-semibold animate-pulse">
                🔴 Pronto p/ Corrida
              </span>
            ) : (
              <span className="text-neutral-500 flex items-center gap-0.5">
                <Lock className="h-2.5 w-2.5" /> Bloqueado
              </span>
            )}
          </div>
        </div>

        {/* Competitor Rows */}
        <div className="space-y-1.5">
          {renderTeamRow(
            matchup.team1Id, 
            matchup.team1Placeholder, 
            matchup.score1, 
            matchup.winnerId === matchup.team1Id,
            isByeA
          )}
          {renderTeamRow(
            matchup.team2Id, 
            matchup.team2Placeholder, 
            matchup.score2, 
            matchup.winnerId === matchup.team2Id,
            isByeB
          )}
        </div>

        {/* Launch Duel / View scoreboard */}
        {!isBye && (
          <div className="pt-1">
            {isReady ? (
              <button
                onClick={() => onSelectMatchup(matchup.id)}
                className={`w-full py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  isCompleted 
                    ? 'bg-neutral-800 text-neutral-300 hover:bg-neutral-750 btn-editar-resultado' 
                    : 'bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white shadow-md'
                }`}
              >
                {isCompleted ? 'Editar Resultado' : <><Play className="h-3.5 w-3.5 fill-current" /> Registrar Placar M3</>}
              </button>
            ) : (
              <div className="text-[10px] text-center text-neutral-500 bg-neutral-950/30 border border-neutral-950 py-1.5 rounded-lg flex items-center justify-center gap-1">
                <Lock className="h-2.5 w-2.5" /> Aguardando Classificação
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Champion Podium Row */}
      {championTeam && (
        <div className="bg-gradient-to-b from-yellow-950/20 to-neutral-950 border border-yellow-500/30 rounded-2xl p-6 shadow-2xl text-center relative overflow-hidden animate-fade-in">
          {/* Sparkle effects */}
          <div className="absolute top-4 left-4 text-yellow-500/20 animate-spin" style={{ animationDuration: '8s' }}><Sparkles className="h-10 w-10" /></div>
          <div className="absolute bottom-4 right-4 text-yellow-500/20 animate-spin" style={{ animationDuration: '12s' }}><Sparkles className="h-12 w-12" /></div>

          <div className="max-w-md mx-auto space-y-4">
            <div className="inline-flex p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-full text-yellow-500 animate-bounce shadow-inner">
              <Award className="h-12 w-12" />
            </div>

            <div>
              <span className="text-xs font-bold text-yellow-500 uppercase tracking-widest block">CAMPEÃO DO TORNEIO</span>
              <h2 className="text-3xl font-black text-white mt-1 uppercase tracking-tight">{championTeam.name}</h2>
              <div className="mt-1 flex items-center justify-center gap-2 text-sm text-neutral-300">
                <span>Membros da Equipe: <strong className="text-orange-400">{championTeam.members}</strong></span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={onResetTournament}
                className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 hover:text-white px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer inline-flex items-center gap-2"
              >
                🏁 Reiniciar Novo Torneio
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Duel Bracket Scroll Board */}
      <div className="bg-neutral-950/30 border border-neutral-900 rounded-2xl p-6 overflow-x-auto shadow-inner">
        {/* Horizontal Bracket Layout wrapping Group A, Grand Final, and Group B */}
        <div className="min-w-[1100px] flex justify-between items-center gap-4 py-4">
          
          {/* LADO ESQUERDO: GRUPO A (Flow Left to Right) */}
          <div className="flex gap-10 items-center">
            {roundsList.map((round) => {
              const roundMatches = matchups.filter(m => m.group === 'A' && m.round === round);
              return (
                <div key={`group-a-r${round}`} className="space-y-8 flex flex-col justify-around h-[500px]">
                  {/* Round Header Column */}
                  <div className="text-center pb-2 border-b border-neutral-900">
                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Grupo A</p>
                    <p className="text-xs font-bold text-white mt-0.5">Rodada {round}</p>
                  </div>
                  
                  {roundMatches.map(m => renderMatchupCard(m))}
                </div>
              );
            })}
          </div>

          {/* CENTRO: FINALÍSSIMA (The Peak) */}
          <div className="flex flex-col items-center justify-center px-4">
            <div className="text-center mb-6">
              <span className="text-lg">🏎️</span>
              <h4 className="text-base font-black text-white uppercase tracking-wider mt-1">Confronto de Campeões</h4>
              <p className="text-[10px] text-neutral-500">Decisão Suprema • Melhor de 3</p>
            </div>

            {/* Vertical connector helper lines */}
            <div className="relative py-4 flex flex-col items-center">
              {renderMatchupCard(grandFinal)}
              
              {/* Champion Visual Pedestal */}
              {championTeam && (
                <div className="mt-8 flex flex-col items-center space-y-2 animate-pulse">
                  <div className="h-6 w-0.5 bg-yellow-500/50" />
                  <div className="bg-yellow-500 text-neutral-950 px-4 py-1.5 rounded-full font-black text-xs tracking-wider uppercase flex items-center gap-1 shadow-md">
                    👑 {championTeam.name}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* LADO DIREITO: GRUPO B (Flow Right to Left - render columns from Round N down to Round 1) */}
          <div className="flex gap-10 items-center">
            {/* Reverse rounds list so Round 1 is on far right, Round N converges to Center */}
            {[...roundsList].reverse().map((round) => {
              const roundMatches = matchups.filter(m => m.group === 'B' && m.round === round);
              return (
                <div key={`group-b-r${round}`} className="space-y-8 flex flex-col justify-around h-[500px]">
                  {/* Round Header Column */}
                  <div className="text-center pb-2 border-b border-neutral-900">
                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Grupo B</p>
                    <p className="text-xs font-bold text-white mt-0.5">Rodada {round}</p>
                  </div>

                  {roundMatches.map(m => renderMatchupCard(m))}
                </div>
              );
            })}
          </div>

        </div>
      </div>

      {/* Bracket Explanatory Quick Specs Info Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="bg-neutral-900/40 border border-neutral-800/80 rounded-xl p-4 flex gap-3">
          <span className="text-xl">🏆</span>
          <div>
            <h5 className="font-bold text-white mb-0.5">Mata-Mata Cruzado Simples</h5>
            <p className="text-neutral-400 text-[11px] leading-relaxed">
              Equipes lutam dentro de seus próprios grupos (A e B). O vencedor final de cada grupo se encontra na emblemática finalíssima para disputar o título.
            </p>
          </div>
        </div>

        <div className="bg-neutral-900/40 border border-neutral-800/80 rounded-xl p-4 flex gap-3">
          <span className="text-xl">🔁</span>
          <div>
            <h5 className="font-bold text-white mb-0.5">Raias Alternadas no Duelo</h5>
            <p className="text-neutral-400 text-[11px] leading-relaxed">
              Os duelos são disputados um veículo por raia. Na Corrida 1 as raias originais se mantêm; na Corrida 2 os veículos alternam as raias para assegurar justiça esportiva.
            </p>
          </div>
        </div>

        <div className="bg-neutral-900/40 border border-neutral-800/80 rounded-xl p-4 flex gap-3">
          <span className="text-xl">⭐</span>
          <div>
            <h5 className="font-bold text-white mb-0.5">Melhor de 3 Corridas</h5>
            <p className="text-neutral-400 text-[11px] leading-relaxed">
              A equipe que garantir 2 vitórias individuais primeiro vence o duelo. O placar 2x0 elimina a necessidade da corrida de desempate de forma inteligente.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
