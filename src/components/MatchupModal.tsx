import { Matchup, Team } from '../types';
import { X, Check, Award, RefreshCw } from 'lucide-react';
import React, { useState } from 'react';

interface MatchupModalProps {
  matchup: Matchup;
  teams: Team[];
  onClose: () => void;
  onSaveScore: (matchupId: string, raceWinners: (string | null)[], scoreA: number, scoreB: number, winnerId: string | null) => void;
  readOnly?: boolean;
}

export default function MatchupModal({ matchup, teams, onClose, onSaveScore, readOnly = false }: MatchupModalProps) {
  const team1 = teams.find(t => t.id === matchup.team1Id);
  const team2 = teams.find(t => t.id === matchup.team2Id);

  // Initialize winners from matchup state
  const [raceWinners, setRaceWinners] = useState<(string | null)[]>([
    matchup.races[0].winnerId,
    matchup.races[1].winnerId,
    matchup.races[2].winnerId,
  ]);

  if (!team1 || !team2) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 max-w-sm w-full text-center">
          <X className="h-10 w-10 text-neutral-500 mx-auto mb-3" />
          <h3 className="font-bold text-white text-lg">Aguardando Equipes</h3>
          <p className="text-xs text-neutral-400 mt-1">
            Este duelo ainda não está pronto para ser jogado porque depende da definição dos vencedores dos confrontos anteriores.
          </p>
          <button
            onClick={onClose}
            className="mt-4 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold py-2 px-4 rounded-lg cursor-pointer transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    );
  }

  // Handle setting winner of a race
  const handleSelectRaceWinner = (raceIdx: number, winnerId: string | null) => {
    if (readOnly) return;
    const updated = [...raceWinners];
    
    // Toggle or set
    if (updated[raceIdx] === winnerId) {
      updated[raceIdx] = null;
    } else {
      updated[raceIdx] = winnerId;
    }

    // Now recalculate. If race 1 and 2 are won by same team, race 3 is automatically null / not needed
    if (raceIdx < 2) {
      const idx0 = updated[0];
      const idx1 = updated[1];
      if (idx0 && idx1 && idx0 === idx1) {
        updated[2] = null; // Clear race 3 if 2-0
      }
    }

    setRaceWinners(updated);
  };

  // Compute stats
  const w1Count = raceWinners.filter(id => id === team1.id).length;
  const w2Count = raceWinners.filter(id => id === team2.id).length;

  let duelWinnerId: string | null = null;
  let isReadyToSave = false;

  if (w1Count === 2) {
    duelWinnerId = team1.id;
    isReadyToSave = true;
  } else if (w2Count === 2) {
    duelWinnerId = team2.id;
    isReadyToSave = true;
  } else if (raceWinners[0] && raceWinners[1] && raceWinners[2]) {
    // If all three are filled, one must have 2 wins.
    if (w1Count > w2Count) {
      duelWinnerId = team1.id;
    } else if (w2Count > w1Count) {
      duelWinnerId = team2.id;
    }
    isReadyToSave = true;
  }

  const handleSave = () => {
    if (!isReadyToSave) return;
    onSaveScore(matchup.id, raceWinners, w1Count, w2Count, duelWinnerId);
    onClose();
  };

  const handleResetRaceWinners = () => {
    if (readOnly) return;
    setRaceWinners([null, null, null]);
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden relative">
        {/* Top styling band */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-[repeating-linear-gradient(45deg,#000,#000_10px,#dd6b20_10px,#dd6b20_20px)]" />

        {/* Header */}
        <div className="p-5 border-b border-neutral-800 flex justify-between items-center bg-neutral-950/40">
          <div>
            <span className="text-[10px] text-orange-500 font-bold uppercase tracking-widest bg-orange-950/40 px-2 py-0.5 rounded border border-orange-900/30">
              {matchup.group === 'FINAL' ? 'Grande Finalíssima' : `GRUPO ${matchup.group} • Rodada ${matchup.round}`}
            </span>
            <h3 className="font-bold text-white text-base mt-1">Sumário do Duelo (Melhor de 3)</h3>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Main Versus Card View */}
          <div className="grid grid-cols-7 items-center bg-neutral-950 rounded-xl p-4 border border-neutral-800/80">
            {/* Team 1 column */}
            <div className="col-span-3 text-center space-y-1">
              <div className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: team1.color }} />
              <p className="font-bold text-white text-sm truncate">{team1.name}</p>
              <p className="text-[11px] text-neutral-450 truncate">👥 {team1.members}</p>
              
              <div className="pt-2">
                <span className={`text-2xl font-black ${w1Count === 2 ? 'text-green-400' : 'text-neutral-400'}`}>
                  {w1Count}
                </span>
              </div>
            </div>

            {/* VS column */}
            <div className="col-span-1 text-center font-bold text-xs text-neutral-600">
              <span className="bg-neutral-900 border border-neutral-800 px-2 py-1 rounded-full text-[10px] tracking-wider font-semibold">
                VS
              </span>
            </div>

            {/* Team 2 column */}
            <div className="col-span-3 text-center space-y-1">
              <div className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: team2.color }} />
              <p className="font-bold text-white text-sm truncate">{team2.name}</p>
              <p className="text-[11px] text-neutral-450 truncate">👥 {team2.members}</p>
              
              <div className="pt-2">
                <span className={`text-2xl font-black ${w2Count === 2 ? 'text-green-400' : 'text-neutral-400'}`}>
                  {w2Count}
                </span>
              </div>
            </div>
          </div>

          {/* Duelo Winner Visual Flag */}
          {duelWinnerId && (
            <div className="bg-green-950/20 border border-green-500/30 rounded-lg p-3 text-center flex items-center justify-center gap-2">
              <Award className="h-5 w-5 text-green-400 animate-bounce" />
              <p className="text-xs text-green-300 font-semibold">
                Resultado Definido! Vencedor do Confronto:{' '}
                <span className="font-bold underline">
                  {duelWinnerId === team1.id ? team1.name : team2.name}
                </span>
              </p>
            </div>
          )}

          {/* Individual Races Rows */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Corridas Individuais</h4>
              {!readOnly && (
                <button
                  onClick={handleResetRaceWinners}
                  className="text-neutral-500 hover:text-neutral-300 text-[10px] flex items-center gap-1 transition-colors hover:underline cursor-pointer"
                >
                  <RefreshCw className="h-3 w-3" /> Reiniciar Placar
                </button>
              )}
            </div>

            {/* Race 1 */}
            <div className="bg-neutral-950/50 rounded-xl p-3 border border-neutral-800/60 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-neutral-300">Corrida 1</span>
                <span className="text-[10px] text-neutral-500 font-mono">
                  Raia 1: {team1.name} | Raia 2: {team2.name}
                </span>
              </div>
              <div className={`grid grid-cols-2 gap-2 ${readOnly ? 'pointer-events-none opacity-90' : ''}`}>
                <button
                  onClick={() => handleSelectRaceWinner(0, team1.id)}
                  className={`py-2 px-3 text-xs rounded-lg font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    raceWinners[0] === team1.id
                      ? 'bg-neutral-800 text-white border border-neutral-600 ring-1 ring-neutral-700 font-bold'
                      : 'bg-neutral-900 hover:bg-neutral-800/60 text-neutral-400 border border-neutral-800'
                  }`}
                  style={raceWinners[0] === team1.id ? { borderLeftWidth: '4px', borderLeftColor: team1.color } : {}}
                >
                  Vitória: {team1.name}
                </button>
                <button
                  onClick={() => handleSelectRaceWinner(0, team2.id)}
                  className={`py-2 px-3 text-xs rounded-lg font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    raceWinners[0] === team2.id
                      ? 'bg-neutral-800 text-white border border-neutral-600 ring-1 ring-neutral-700 font-bold'
                      : 'bg-neutral-900 hover:bg-neutral-800/60 text-neutral-400 border border-neutral-800'
                  }`}
                  style={raceWinners[0] === team2.id ? { borderLeftWidth: '4px', borderLeftColor: team2.color } : {}}
                >
                  Vitória: {team2.name}
                </button>
              </div>
            </div>

            {/* Race 2 (Inverted lanes) */}
            <div className="bg-neutral-950/50 rounded-xl p-3 border border-neutral-800/60 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-neutral-300">Corrida 2 (Raias Invertidas 🔄)</span>
                <span className="text-[10px] text-neutral-500 font-mono">
                  Raia 1: {team2.name} | Raia 2: {team1.name}
                </span>
              </div>
              <div className={`grid grid-cols-2 gap-2 ${readOnly ? 'pointer-events-none opacity-90' : ''}`}>
                <button
                  onClick={() => handleSelectRaceWinner(1, team1.id)}
                  className={`py-2 px-3 text-xs rounded-lg font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    raceWinners[1] === team1.id
                      ? 'bg-neutral-800 text-white border border-neutral-600 ring-1 ring-neutral-700 font-bold'
                      : 'bg-neutral-900 hover:bg-neutral-800/60 text-neutral-400 border border-neutral-800'
                  }`}
                  style={raceWinners[1] === team1.id ? { borderLeftWidth: '4px', borderLeftColor: team1.color } : {}}
                >
                  Vitória: {team1.name}
                </button>
                <button
                  onClick={() => handleSelectRaceWinner(1, team2.id)}
                  className={`py-2 px-3 text-xs rounded-lg font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    raceWinners[1] === team2.id
                      ? 'bg-neutral-800 text-white border border-neutral-600 ring-1 ring-neutral-700 font-bold'
                      : 'bg-neutral-900 hover:bg-neutral-800/60 text-neutral-400 border border-neutral-800'
                  }`}
                  style={raceWinners[1] === team2.id ? { borderLeftWidth: '4px', borderLeftColor: team2.color } : {}}
                >
                  Vitória: {team2.name}
                </button>
              </div>
            </div>

            {/* Race 3 (Tiebreaker - only visible/enabled if needed) */}
            {!(raceWinners[0] && raceWinners[1] && raceWinners[0] === raceWinners[1]) ? (
              <div className="bg-neutral-950/50 rounded-xl p-3 border border-neutral-800/60 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-neutral-300">Corrida 3 (Desempate - Se necessário)</span>
                  <span className="text-[10px] text-neutral-500 font-mono">
                    Raia 1: {team1.name} | Raia 2: {team2.name}
                  </span>
                </div>
                <div className={`grid grid-cols-2 gap-2 ${readOnly ? 'pointer-events-none opacity-90' : ''}`}>
                  <button
                    onClick={() => handleSelectRaceWinner(2, team1.id)}
                    className={`py-2 px-3 text-xs rounded-lg font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      raceWinners[2] === team1.id
                        ? 'bg-neutral-800 text-white border border-neutral-600 ring-1 ring-neutral-700 font-bold'
                        : 'bg-neutral-900 hover:bg-neutral-800/60 text-neutral-400 border border-neutral-800'
                    }`}
                    style={raceWinners[2] === team1.id ? { borderLeftWidth: '4px', borderLeftColor: team1.color } : {}}
                  >
                    Vitória: {team1.name}
                  </button>
                  <button
                    onClick={() => handleSelectRaceWinner(2, team2.id)}
                    className={`py-2 px-3 text-xs rounded-lg font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      raceWinners[2] === team2.id
                        ? 'bg-neutral-800 text-white border border-neutral-600 ring-1 ring-neutral-700 font-bold'
                        : 'bg-neutral-900 hover:bg-neutral-800/60 text-neutral-400 border border-neutral-800'
                    }`}
                    style={raceWinners[2] === team2.id ? { borderLeftWidth: '4px', borderLeftColor: team2.color } : {}}
                  >
                    Vitória: {team2.name}
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-neutral-950/30 border border-neutral-905 rounded-xl p-3 text-center border border-dashed border-neutral-800">
                <p className="text-xs text-neutral-500 italic">
                  Corrida 3 não é necessária. Confronto decidido em 2x0 para{' '}
                  <span className="font-semibold text-neutral-400">
                    {raceWinners[0] === team1.id ? team1.name : team2.name}
                  </span>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-neutral-800 bg-neutral-950/40 flex justify-end gap-3">
          {readOnly ? (
            <button
              onClick={onClose}
              className="px-6 py-2 text-xs font-bold text-white bg-orange-600 hover:bg-orange-500 rounded-lg cursor-pointer transition-colors shadow-lg shadow-orange-600/10"
            >
              Fechar Visualização
            </button>
          ) : (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-lg cursor-pointer transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={!isReadyToSave}
                className={`px-5 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                  isReadyToSave
                    ? 'bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-600/10'
                    : 'bg-neutral-800 text-neutral-500 border border-neutral-850 cursor-not-allowed'
                }`}
              >
                <Check className="h-4 w-4" />
                Registrar Duelo
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
