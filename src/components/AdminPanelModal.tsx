import React, { useState, useRef } from 'react';
import { Team, Tournament, Matchup } from '../types';
import { X, Pencil, Sliders, Check, Trophy, Calendar, Users, Eye, Database, Download, Upload, ShieldCheck, FileJson } from 'lucide-react';

interface AdminPanelModalProps {
  tournament: Tournament | null;
  teams: Team[];
  onUpdateTeam: (id: string, updatedData: Partial<Team>) => void;
  onSelectMatchup: (id: string) => void;
  onImportBackup?: (data: { teams: Team[]; activeTournament: Tournament | null }) => void;
  onClose: () => void;
}

export default function AdminPanelModal({
  tournament,
  teams,
  onUpdateTeam,
  onSelectMatchup,
  onImportBackup,
  onClose,
}: AdminPanelModalProps) {
  const [activeTab, setActiveTab] = useState<'teams' | 'matchups' | 'backup'>('teams');
  
  // State for team being edited in the modal
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editMembers, setEditMembers] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleStartEditTeam = (team: Team) => {
    setEditingTeamId(team.id);
    setEditName(team.name);
    setEditMembers(team.members);
    setErrorMsg('');
    setSuccessMsg('');
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

  const handleExportBackup = () => {
    try {
      const backupObj = {
        teams,
        activeTournament: tournament,
        exportedAt: new Date().toISOString(),
        system: 'Maker Speed Challenge'
      };
      const blob = new Blob([JSON.stringify(backupObj, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `msc-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setSuccessMsg('✓ Backup exportado com sucesso! O arquivo JSON foi baixado localmente.');
      setErrorMsg('');
    } catch (err: any) {
      setErrorMsg('Falha ao exportar os dados do campeonato.');
      setSuccessMsg('');
    }
  };

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setErrorMsg('');
    setSuccessMsg('');

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const resultText = event.target?.result as string;
        const parsed = JSON.parse(resultText);
        
        if (!parsed || typeof parsed !== 'object') {
          throw new Error('O arquivo selecionado não contém um formato JSON válido.');
        }
        if (!Array.isArray(parsed.teams)) {
          throw new Error('A estrutura do backup está corrompida ou incompleta.');
        }
        
        if (onImportBackup) {
          onImportBackup({
            teams: parsed.teams,
            activeTournament: parsed.activeTournament !== undefined ? parsed.activeTournament : null
          });
          setSuccessMsg('✓ Recuperação Concluída! Todos os times e disputas foram recarregados com sucesso na memória do app.');
          setErrorMsg('');
        }
      } catch (err: any) {
        setErrorMsg(`Erro de Importação: ${err?.message || 'Arquivo inválido.'}`);
        setSuccessMsg('');
      }
    };
    reader.readAsText(file);
    
    if (e.target) {
      e.target.value = '';
    }
  };

  const getLocalStorageSize = () => {
    try {
      const dataStr = JSON.stringify(teams) + JSON.stringify(tournament);
      const sizeBytes = new Blob([dataStr]).size;
      return (sizeBytes / 1024).toFixed(2) + ' KB';
    } catch {
      return '0.5 KB';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl max-w-2xl w-full h-[620px] flex flex-col overflow-hidden relative animate-fade-in">
        {/* Top Accent line strip */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-[repeating-linear-gradient(45deg,#000,#000_10px,#ea580c_10px,#ea580c_20px)]" />

        {/* Header */}
        <div className="p-5 border-b border-neutral-800 flex justify-between items-center bg-neutral-950/40">
          <div className="flex items-center gap-2">
            <Sliders className="text-orange-500 h-5 w-5" />
            <div>
              <h3 className="font-bold text-white text-base">Painel de Administração do Torneio</h3>
              <p className="text-[10px] text-neutral-450 mt-0.5">Controles de alto nível para equipes, duelos e armazenamento offline</p>
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
            onClick={() => { setActiveTab('teams'); setErrorMsg(''); setSuccessMsg(''); }}
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
            onClick={() => { setActiveTab('matchups'); setErrorMsg(''); setSuccessMsg(''); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'matchups'
                ? 'bg-orange-600/10 text-orange-400 border border-orange-500/30'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
            }`}
          >
            <Trophy className="h-3.5 w-3.5" />
            <span>Editar Resultados ({tournament ? tournament.matchups.length : 0})</span>
          </button>

          <button
            onClick={() => { setActiveTab('backup'); setErrorMsg(''); setSuccessMsg(''); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'backup'
                ? 'bg-orange-600/10 text-orange-400 border border-orange-500/30'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
            }`}
          >
            <Database className="h-3.5 w-3.5" />
            <span>Banco Local &amp; Backup</span>
          </button>
        </div>

        {/* Body content */}
        <div className="flex-1 overflow-y-auto p-5">
          {errorMsg && (
            <p className="text-red-400 text-xs mb-4 bg-red-950/40 border border-red-900/50 p-2.5 rounded-lg animate-shake">
              {errorMsg}
            </p>
          )}

          {successMsg && (
            <p className="text-green-400 text-xs mb-4 bg-green-950/40 border border-green-900/40 p-2.5 rounded-lg">
              {successMsg}
            </p>
          )}

          {activeTab === 'teams' ? (
            <div className="space-y-4">
              <div className="bg-neutral-950/40 border border-neutral-800 p-3 rounded-lg">
                <p className="text-xs text-neutral-400 leading-relaxed">
                  💡 <strong>Modo Executivo Ativo</strong>: Você pode editar o nome ou os participantes de qualquer equipe aqui. As alterações serão refletidas automaticamente e de forma instantânea nas chaves e nos confrontos atuais do torneio em tempo real, sem interromper ou zerar nenhuma partida do campeonato!
                </p>
              </div>

              <div className="space-y-2">
                {teams.length === 0 ? (
                  <div className="p-6 text-center text-xs text-neutral-500 font-mono">Nenhuma equipe cadastrada no momento.</div>
                ) : (
                  teams.map((team) => {
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
                  })
                )}
              </div>
            </div>
          ) : activeTab === 'matchups' ? (
            <div className="space-y-4">
              <div className="bg-neutral-950/40 border border-neutral-800 p-3 rounded-lg">
                <p className="text-xs text-neutral-400 leading-relaxed">
                  🎯 <strong>Controle de Disputas Ativo</strong>: Abaixo estão listados os confrontos gerados no torneio. Clique em qualquer um deles para abrir o modal de lançamento de resultados, permitindo reescrever placares das corridas individuais ou resetá-las para mudar quem avança na árvore.
                </p>
              </div>

              <div className="space-y-2">
                {!tournament ? (
                  <div className="border border-dashed border-neutral-800 rounded-xl p-12 text-center flex flex-col items-center justify-center">
                    <span className="text-3xl mb-3">🏁</span>
                    <p className="text-neutral-400 text-xs font-semibold uppercase tracking-wider text-orange-500">Nenhum Campeonato Ativo</p>
                    <p className="text-neutral-500 text-[11px] mt-1.5 max-w-sm leading-relaxed text-center">
                      Ainda não há chaves geradas para este torneio. Adicione as equipes na página principal e clique em "Sortear &amp; Iniciar" para liberar o painel de duelos.
                    </p>
                  </div>
                ) : (
                  tournament.matchups
                    .filter((m) => m.team1Id || m.team2Id || m.team1SourceMatchId || m.team2SourceMatchId)
                    .map((matchup) => {
                      const t1Name = getTeamName(matchup.team1Id, matchup.team1Placeholder);
                      const t2Name = getTeamName(matchup.team2Id, matchup.team2Placeholder);
                      const isReady = matchup.team1Id && matchup.team2Id;

                      return (
                        <div
                          key={matchup.id}
                          className="p-3 bg-neutral-950 rounded-lg border border-neutral-800 hover:border-neutral-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
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
                              onClick={() => {
                                onSelectMatchup(matchup.id);
                              }}
                              className="sm:self-center bg-orange-600/15 hover:bg-orange-600 border border-orange-500/20 hover:border-orange-500 text-orange-400 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer shrink-0"
                            >
                              <Calendar className="h-3 w-3" />
                              <span>{matchup.isCompleted ? 'Editar Resultado' : 'Lançar Resultado'}</span>
                            </button>
                          ) : (
                            <button
                              disabled
                              className="sm:self-center text-neutral-605 border border-neutral-900 px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 flex items-center justify-center gap-1 cursor-not-allowed"
                            >
                              <Eye className="h-3 w-3" />
                              <span>Aguardando Times</span>
                            </button>
                          )}
                        </div>
                      );
                    })
                )}
              </div>
            </div>
          ) : (
            /* Backup/Local DB Tab content */
            <div className="space-y-5">
              <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 space-y-2.5">
                <div className="flex items-center gap-2 text-green-400 font-bold text-xs">
                  <ShieldCheck className="h-4.5 w-4.5 animate-pulse text-green-400 shrink-0" />
                  <span>SISTEMA DE ARMAZENAMENTO TOTALMENTE INTERNO ATIVO</span>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Para máxima segurança, integridade e privacidade, todas as equipes cadastradas e os resultados de disputas são gravados em tempo real na memória física interna do aplicativo (<strong>LocalStorage</strong>).
                </p>
                <p className="text-[11px] text-neutral-500 leading-relaxed italic border-t border-neutral-800/65 pt-2">
                  ✓ Sem conexões externas: O campeonato funcionará de forma robusta e persistente mesmo sem internet! Se o navegador for fechado, as equipes e as fases das disputas continuam de pé no dispositivo de controle.
                </p>
              </div>

              {/* Memory statistics cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-neutral-950 rounded-lg border border-neutral-800/80 text-center">
                  <span className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider block">Equipes Gravadas</span>
                  <span className="text-lg font-black text-white mt-1 block">{teams.length}</span>
                </div>
                <div className="p-3 bg-neutral-950 rounded-lg border border-neutral-800/80 text-center">
                  <span className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider block">Disputas Salvas</span>
                  <span className="text-lg font-black text-white mt-1 block">
                    {tournament ? tournament.matchups.filter(m => m.isCompleted).length : 0}
                  </span>
                </div>
                <div className="p-3 bg-neutral-950 rounded-lg border border-neutral-800/80 text-center">
                  <span className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider block font-mono">Consumo Estimado</span>
                  <span className="text-lg font-black text-white mt-1 block font-mono">{getLocalStorageSize()}</span>
                </div>
              </div>

              {/* Maintenance & Backup action buttons */}
              <div className="bg-neutral-950 p-5 rounded-xl border border-neutral-800 space-y-4">
                <h4 className="text-xs uppercase font-bold tracking-widest text-white flex items-center gap-1.5">
                  <FileJson className="h-4 w-4 text-orange-400 shrink-0" />
                  Salvaguarda &amp; Importação de Dados
                </h4>
                
                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  Gere arquivos de backup para transpor as equipes de um computador para o outro, ou faça cópias de segurança ao final do dia para garantir que nenhum dado seja perdido.
                </p>

                <div className="flex flex-col sm:flex-row gap-3 pt-1">
                  {/* Export Button */}
                  <button
                    onClick={handleExportBackup}
                    className="flex-1 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-700 rounded-lg text-xs py-2.5 font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm hover:shadow-md"
                  >
                    <Download className="h-4 w-4 text-orange-500 shrink-0" />
                    <span>Exportar Backup (.json)</span>
                  </button>

                  {/* Import Button */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs py-2.5 font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-orange-600/10 hover:shadow-orange-600/20"
                  >
                    <Upload className="h-4 w-4 shrink-0" />
                    <span>Importar Backup (.json)</span>
                  </button>
                  
                  {/* Hidden inputs */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImportFileChange}
                    accept=".json"
                    className="hidden"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer info inside modal */}
        <div className="p-4 border-t border-neutral-800 bg-neutral-950 text-center text-[10px] text-neutral-500 flex justify-between items-center">
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
            Maker Speed Challenge • Banco Local Ativo
          </span>
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
