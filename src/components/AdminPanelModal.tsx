import React, { useState } from 'react';
import { Team, Tournament, Matchup } from '../types';
import { X, Pencil, Sliders, Check, Trophy, Calendar, Users, Eye } from 'lucide-react';

interface AdminPanelModalProps {
  tournament: Tournament;
  teams: Team[];
  onUpdateTeam: (id: string, updatedData: Partial<Team>) => void;
  onSelectMatchup: (id: string) => void;
  onClose: () => void;
}

export default function AdminPanelModal({
  tournament,
  teams,
  onUpdateTeam,
  onSelectMatchup,
  onClose,
}: AdminPanelModalProps) {
  const [activeTab, setActiveTab] = useState<'teams' | 'matchups'>('teams');
  
  // State for team being edited in the modal
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editMembers, setEditMembers] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleStartEditTeam = (team: Team) => {
    setEditingTeamId(team.id);
    setEditName(team.name);
    setEditMembers(team.members);
    setErrorMsg('');
  };

  const handleSaveTeamEdit = (id: string) => {
    if (!editName.trim()) {
      setErrorMsg('O nome do time não pode ficar vazio.');
      return;
    }
    if (!editMembers.trim()) {
      setErrorMsg('Os membros não podem ficar vazios.');
      return;
    }
    onUpdateTeam(id, { name: editName.trim(), members: editMembers.trim() });
    setEditingTeamId(null);
  };

  const getTeamName = (id: string | null, placeholder: string): string => {
    if (!id) return placeholder;
    const found = teams.find(t => t.id === id);
    return found ? found.name : placeholder;
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl max-w-2xl w-full h-[620px] flex flex-col overflow-hidden relative animate-fade-in">
        {/* Top Accent line strip */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-[repeating-linear-gradient(45deg,#000,#0 black_10px,#ea580c_10px,#ea580c_20px)]" />

        {/* Header */}
        <div className="p-5 border-b border-neutral-800 flex justify-between items-center bg-neutral-950/40">
          <div className="flex items-center gap-2">
            <Sliders className="text-orange-500 h-5 w-5" />
            <div>
              <h3 className="font-bold text-white text-base">Painel de Administração do Torneio</h3>
              <p className="text-[10px] text-neutral-450 mt-0.5">Editores de alto privilégio para equipes e resultados de duelos</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="bg-neutral-950/80 p-2 border-b border-neutral-800 flex gap-2">
          <button
            onClick={() => setActiveTab('teams')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'teams'
                ? 'bg-orange-600/10 text-orange-400 border border-orange-500/30'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>Gerenciar Equipes ({teams.length})</span>
          </button>
          
          <button
            onClick={() => setActiveTab('matchups')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'matchups'
                ? 'bg-orange-600/10 text-orange-400 border border-orange-500/30'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
            }`}
          >
            <Trophy className="h-3.5 w-3.5" />
            <span>Editar Resultados ({tournament.matchups.length})</span>
          </button>
        </div>

        {/* Body content */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === 'teams' ? (
            <div className="space-y-4">
              <div className="bg-neutral-950/40 border border-neutral-800 p-3 rounded-lg">
                <p className="text-xs text-neutral-400 leading-relaxed">
                  💡 <strong>Mododo Executivo Ativo</strong>: Você pode editar o nome ou os participantes de qualquer equipe aqui. As alterações serão refletidas automaticamente e de forma instantânea nas chaves e nos confrontos atuais do torneio em tempo real, sem interromper ou zerar nenhuma partida do campeonato!
                </p>
                {errorMsg && (
                  <p className="text-red-400 text-xs mt-2 bg-red-950/30 border border-red-900 p-2 rounded">{errorMsg}</p>
                )}
              </div>

              <div className="space-y-2">
                {teams.map((team) => {
                  const isEditing = editingTeamId === team.id;
                  return (
                    <div
                      key={team.id}
                      className={`p-3 bg-neutral-950 rounded-lg border transition-colors ${
                        isEditing ? 'border-orange-500 bg-neutral-900/50' : 'border-neutral-800 hover:border-neutral-700'
                      }`}
                      style={{ borderLeftWidth: '4px', borderLeftColor: team.color }}
                    >
                      {isEditing ? (
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] uppercase text-neutral-500 mb-1 font-bold">Nome da Equipe</label>
                              <input
                                type="text"
                                className="w-full bg-neutral-900 border border-neutral-800 text-white rounded px-2.5 py-1.5 text-xs focus:border-orange-500 focus:outline-none"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] uppercase text-neutral-500 mb-1 font-bold">Membros da Equipe</label>
                              <input
                                type="text"
                                className="w-full bg-neutral-900 border border-neutral-800 text-white rounded px-2.5 py-1.5 text-xs focus:border-orange-500 focus:outline-none"
                                value={editMembers}
                                onChange={(e) => setEditMembers(e.target.value)}
                              />
                            </div>
                          </div>
                          <div className="flex gap-2 justify-end pt-1">
                            <button
                              onClick={() => setEditingTeamId(null)}
                              className="px-2.5 py-1 text-[11px] text-neutral-400 hover:text-white bg-neutral-800 rounded font-semibold transition-colors"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={() => handleSaveTeamEdit(team.id)}
                              className="px-3 py-1 text-[11px] text-white bg-orange-600 hover:bg-orange-500 rounded font-bold transition-colors flex items-center gap-1"
                            >
                              <Check className="h-3 w-3" /> Salvar Time
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-between items-center gap-3">
                          <div className="min-w-0 flex-1">
                            <h4 className="text-sm font-bold text-white truncate">{team.name}</h4>
                            <p className="text-xs text-neutral-400 mt-0.5 truncate">
                              👥 Membros: <strong className="text-neutral-200 font-medium">{team.members}</strong>
                            </p>
                          </div>
                          <button
                            onClick={() => handleStartEditTeam(team)}
                            className="p-2 text-neutral-400 hover:text-orange-400 bg-neutral-900 hover:bg-neutral-800 rounded transition-colors"
                            title="Editar Dados"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-neutral-950/40 border border-neutral-800 p-3 rounded-lg">
                <p className="text-xs text-neutral-400 leading-relaxed">
                  🎯 <strong>Controle de Disputas Ativo</strong>: Abaixo estão listados os confrontos gerados no torneio. Clique em qualquer um deles para abrir o modal de lançamento de resultados, permitindo reescrever placares das corridas individuais ou resetá-las para mudar quem avança na árvore.
                </p>
              </div>

              <div className="space-y-2">
                {tournament.matchups
                  .filter((m) => m.team1Id || m.team2Id || m.team1SourceMatchId || m.team2SourceMatchId)
                  .map((matchup) => {
                    const t1Name = getTeamName(matchup.team1Id, matchup.team1Placeholder);
                    const t2Name = getTeamName(matchup.team2Id, matchup.team2Placeholder);
                    const isReady = matchup.team1Id && matchup.team2Id;

                    return (
                      <div
                        key={matchup.id}
                        className="p-3 bg-neutral-950 rounded-lg border border-neutral-805 hover:border-neutral-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] uppercase font-bold tracking-widest px-1.5 py-0.5 bg-neutral-900 rounded text-neutral-400 border border-neutral-800/80">
                              {matchup.group === 'FINAL' ? 'Grande Final' : `LADO ${matchup.group} • R${matchup.round}`}
                            </span>
                            {matchup.isCompleted ? (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 bg-green-950/50 text-green-400 rounded border border-green-900/30">Concluído</span>
                            ) : (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 bg-neutral-900 text-neutral-500 rounded border border-neutral-800">Aguardando</span>
                            )}
                          </div>

                          <div className="mt-2 text-xs font-bold text-white flex items-center gap-2">
                            <span className={matchup.winnerId === matchup.team1Id ? 'text-green-400' : ''}>{t1Name}</span>
                            <span className="text-neutral-600 font-normal">vs</span>
                            <span className={matchup.winnerId === matchup.team2Id ? 'text-green-400' : ''}>{t2Name}</span>
                          </div>

                          {matchup.isCompleted && (
                            <p className="text-[11px] text-neutral-400 mt-1">
                              Placar: <strong className="text-white">{matchup.score1}</strong> x <strong className="text-white">{matchup.score2}</strong>
                            </p>
                          )}
                        </div>

                        {isReady ? (
                          <button
                            onClick={() => onSelectMatchup(matchup.id)}
                            className="sm:self-center bg-orange-600/15 hover:bg-orange-600 border border-orange-500/20 hover:border-orange-500 text-orange-400 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer shrink-0"
                          >
                            <Calendar className="h-3 w-3" />
                            <span>{matchup.isCompleted ? 'Editar Resultado' : 'Lançar Resultado'}</span>
                          </button>
                        ) : (
                          <button
                            disabled
                            className="sm:self-center text-neutral-600 border border-neutral-900 px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 flex items-center justify-center gap-1 cursor-not-allowed"
                          >
                            <Eye className="h-3 w-3" />
                            <span>Aguardando Times</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>

        {/* Footer info inside modal */}
        <div className="p-4 border-t border-neutral-800 bg-neutral-950 text-center text-[10px] text-neutral-550 flex justify-between items-center">
          <span>Maker Speed Challenge • Painel do Admin</span>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 font-bold rounded-lg border border-neutral-800 cursor-pointer text-xs"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
