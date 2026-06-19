import React, { useState } from 'react';
import { Team, Tournament, Matchup } from '../types';
import { X, Pencil, Sliders, Check, Trophy, Calendar, Users, Eye, Database, Copy, RefreshCw } from 'lucide-react';

interface AdminPanelModalProps {
  tournament: Tournament;
  teams: Team[];
  onUpdateTeam: (id: string, updatedData: Partial<Team>) => void;
  onSelectMatchup: (id: string) => void;
  onClose: () => void;
  dbStatus: {
    connected: boolean;
    teamsTableExists: boolean;
    tournamentsTableExists: boolean;
    error?: string;
  } | null;
  onRefreshDbStatus: () => Promise<void>;
  isSupabaseConfigured: boolean;
}

const TABLE_SCHEMA_SQL = `-- 1. Tabela de Times (Armazena as equipes competidoras)
create table if not exists public.msc_teams (
  id text primary key,
  name text not null,
  members text,
  color text,
  registered_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Tabela de Torneio (Armazena as chaves de duelo e estados)
create table if not exists public.msc_tournaments (
  id text primary key,
  status text not null, -- 'SETUP' | 'ACTIVE' | 'FINISHED'
  champion_id text,
  details jsonb not null, -- Contém as chaves de emparelhamento completas
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Segurança Robusta: Ativar Políticas de Segurança RLS
-- Protege contra leitores anon que tentam apagar ou alterar sua banco de dados!
alter table msc_teams enable row level security;
alter table msc_tournaments enable row level security;

-- Drop de políticas legadas (caso existissem políticas públicas vulneráveis)
drop policy if exists "Permitir leitura pública de times" on msc_teams;
drop policy if exists "Permitir inserção pública de times" on msc_teams;
drop policy if exists "Permitir atualização pública de times" on msc_teams;
drop policy if exists "Permitir deleção pública de times" on msc_teams;

drop policy if exists "Permitir leitura pública de torneios" on msc_tournaments;
drop policy if exists "Permitir inserção pública de torneios" on msc_tournaments;
drop policy if exists "Permitir atualização pública de torneios" on msc_tournaments;
drop policy if exists "Permitir deleção pública de torneios" on msc_tournaments;

-- POLÍTICAS DE TIMES
-- Qualquer um pode ler os times (público)
create policy "Permitir leitura pública de times" 
on msc_teams for select using (true);

-- Apenas administradores autenticados podem inserir/editar/deletar
create policy "Permitir inserção de times por administradores" 
on msc_teams for insert to authenticated with check (true);

create policy "Permitir atualização de times por administradores" 
on msc_teams for update to authenticated using (true);

create policy "Permitir deleção de times por administradores" 
on msc_teams for delete to authenticated using (true);

-- POLÍTICAS DE TORNEIOS
-- Qualquer um pode ler o status do torneio e as chaves (público)
create policy "Permitir leitura pública de torneios" 
on msc_tournaments for select using (true);

-- Apenas administradores autenticados podem inserir/editar/deletar
create policy "Permitir inserção de torneios por administradores" 
on msc_tournaments for insert to authenticated with check (true);

create policy "Permitir atualização de torneios por administradores" 
on msc_tournaments for update to authenticated using (true);

create policy "Permitir deleção de torneios por administradores" 
on msc_tournaments for delete to authenticated using (true);`;

export default function AdminPanelModal({
  tournament,
  teams,
  onUpdateTeam,
  onSelectMatchup,
  onClose,
  dbStatus,
  onRefreshDbStatus,
  isSupabaseConfigured,
}: AdminPanelModalProps) {
  const [activeTab, setActiveTab] = useState<'teams' | 'matchups' | 'database'>('teams');
  
  // State for team being edited in the modal
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editMembers, setEditMembers] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [copiedSql, setCopiedSql] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  const handleCopySql = () => {
    navigator.clipboard.writeText(TABLE_SCHEMA_SQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  const handleRefreshStatus = async () => {
    setIsRefreshing(true);
    await onRefreshDbStatus();
    setIsRefreshing(false);
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
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer ${
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
            disabled={tournament.matchups.length === 0}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
              activeTab === 'matchups'
                ? 'bg-orange-600/10 text-orange-400 border border-orange-500/30'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
            }`}
          >
            <Trophy className="h-3.5 w-3.5" />
            <span>Editar Resultados ({tournament.matchups.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('database')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'database'
                ? 'bg-orange-600/10 text-orange-400 border border-orange-500/30'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
            }`}
          >
            <Database className="h-3.5 w-3.5" />
            <span>Banco Supabase</span>
          </button>
        </div>

        {/* Body content */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === 'teams' ? (
            <div className="space-y-4">
              <div className="bg-neutral-950/40 border border-neutral-800 p-3 rounded-lg">
                <p className="text-xs text-neutral-400 leading-relaxed">
                  💡 <strong>Modo Executivo Ativo</strong>: Você pode editar o nome ou os participantes de qualquer equipe aqui. As alterações serão refletidas automaticamente e de forma instantânea nas chaves e nos confrontos atuais do torneio em tempo real, sem interromper ou zerar nenhuma partida do campeonato!
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
          ) : activeTab === 'matchups' ? (
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
                              {matchup.group === 'FINAL' ? 'Grande Final' : `LADO {matchup.group} • R{matchup.round}`}
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
          ) : (
            <div className="space-y-4 font-sans text-neutral-300">
              {/* Connection Status Card */}
              <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 flex justify-between items-center gap-4">
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <Database className="h-4 w-4 text-orange-500" />
                    Status da Conexão Supabase
                  </h4>
                  <p className="text-[11px] text-neutral-450 leading-relaxed">
                    Endereço de Conexão: <code className="text-neutral-300">{(import.meta as any).env.VITE_SUPABASE_URL || 'Pendente'}</code>
                  </p>
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0">
                  {dbStatus?.connected ? (
                    <span className="px-2 py-1 bg-emerald-950/50 text-emerald-400 border border-emerald-800/40 rounded-lg text-xs font-bold select-none flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Status: Online
                    </span>
                  ) : (
                    <span className="px-2 py-1 bg-rose-950/50 text-rose-400 border border-rose-800/40 rounded-lg text-xs font-bold select-none flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                      Status: Pendente
                    </span>
                  )}
                  <button
                    onClick={handleRefreshStatus}
                    disabled={isRefreshing}
                    className="mt-1 text-[10px] text-neutral-400 hover:text-white bg-neutral-900 border border-neutral-800 px-2 py-1 rounded flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                    <span>Testar Conexão</span>
                  </button>
                </div>
              </div>

              {/* Database sync status checks */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-neutral-950 border border-neutral-800/80 rounded-lg flex flex-col justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-white">Tabela de Equipes (msc_teams)</p>
                    <p className="text-[10px] text-neutral-450">Guarda os carros e equipes registradas.</p>
                  </div>
                  <div className="mt-3">
                    {dbStatus?.teamsTableExists ? (
                      <span className="text-[10px] text-emerald-400 bg-emerald-950/20 px-1.5 py-0.5 rounded border border-emerald-900/40 font-mono">Pronta para uso</span>
                    ) : (
                      <span className="text-[10px] text-amber-400 bg-amber-950/20 px-1.5 py-0.5 rounded border border-amber-900/40 font-mono">Tabela Inexistente</span>
                    )}
                  </div>
                </div>

                <div className="p-3 bg-neutral-950 border border-neutral-800/80 rounded-lg flex flex-col justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-white">Tabela de Torneios (msc_tournaments)</p>
                    <p className="text-[10px] text-neutral-450">Guarda chaves, matches e estado do campeonato.</p>
                  </div>
                  <div className="mt-3">
                    {dbStatus?.tournamentsTableExists ? (
                      <span className="text-[10px] text-emerald-400 bg-emerald-950/20 px-1.5 py-0.5 rounded border border-emerald-900/40 font-mono">Pronta para uso</span>
                    ) : (
                      <span className="text-[10px] text-amber-400 bg-amber-950/20 px-1.5 py-0.5 rounded border border-amber-900/40 font-mono">Tabela Inexistente</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Table setup instructions */}
              {(!dbStatus?.teamsTableExists || !dbStatus?.tournamentsTableExists) && (
                <div className="bg-amber-950/20 border border-amber-500/25 p-3.5 rounded-lg text-xs space-y-1.5">
                  <p className="font-bold text-amber-400">⚡ Instrução de Configuração:</p>
                  <p className="text-neutral-400 leading-relaxed text-[11px]">
                    Sua URL e Chave Anon estão configuradas corretamente! No entanto, as tabelas não foram encontradas no seu banco de dados Supabase. Para criá-las instantaneamente, abra o console do Supabase, vá em <strong>SQL Editor</strong>, clique em <strong>New Query</strong>, cole o código abaixo e clique em <strong>RUN (Executar)</strong>:
                  </p>
                </div>
              )}

              {/* Copy SQL Section */}
              <div className="space-y-2">
                <div className="flex justify-between items-center bg-neutral-950 border-t border-r border-l border-neutral-800 px-3 py-2 rounded-t-lg">
                  <span className="text-xs text-neutral-400 font-mono">SQL Schema Setup</span>
                  <button
                    onClick={handleCopySql}
                    className="px-2.5 py-1 text-[11px] bg-orange-600 hover:bg-orange-500 text-white rounded font-bold cursor-pointer transition-all flex items-center gap-1 shrink-0"
                  >
                    {copiedSql ? (
                      <>
                        <Check className="h-3 w-3" />
                        <span>Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Copiar Código</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="bg-neutral-950 border border-neutral-800 rounded-b-lg p-3 text-[10px] font-mono text-neutral-400 overflow-x-auto max-h-48 whitespace-pre leading-relaxed">
                  {TABLE_SCHEMA_SQL}
                </div>
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
