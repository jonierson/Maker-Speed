import React, { useState } from 'react';
import { Team } from '../types';
import { Plus, Trash2, Trophy, Shuffle, Zap, Pencil, X, ShieldAlert } from 'lucide-react';

interface TeamRegisterProps {
  teams: Team[];
  onAddTeam: (team: Omit<Team, 'id' | 'registeredAt'>) => void;
  onRemoveTeam: (id: string) => void;
  onUpdateTeam: (id: string, updatedData: Partial<Team>) => void;
  onAddSampleTeams: () => void;
  onClearTeams: () => void;
  onStartTournament: (shuffle: boolean) => void;
  isAdmin?: boolean;
}

const RACING_COLORS = [
  '#EF4444', // Vermelho
  '#F97316', // Laranja
  '#EAB308', // Amarelo
  '#22C55E', // Verde
  '#06B6D4', // Ciano
  '#3B82F6', // Azul
  '#A855F7', // Roxo
  '#EC4899', // Rosa
  '#10B981', // Verde Esmeralda
  '#F43F5E', // Rosa Choque
];

export default function TeamRegister({
  teams,
  onAddTeam,
  onRemoveTeam,
  onUpdateTeam,
  onAddSampleTeams,
  onClearTeams,
  onStartTournament,
  isAdmin = false,
}: TeamRegisterProps) {
  const [name, setName] = useState('');
  const [members, setMembers] = useState('');
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) return setError('Nome da equipe é obrigatório!');
    if (!members.trim()) return setError('Nome dos membros da equipe é obrigatório!');

    if (editingTeamId) {
      if (teams.some(t => t.id !== editingTeamId && t.name.toLowerCase() === name.trim().toLowerCase())) {
        return setError('Já existe uma equipe de mesmo nome registrada.');
      }
      onUpdateTeam(editingTeamId, {
        name: name.trim(),
        members: members.trim(),
      });
      setEditingTeamId(null);
    } else {
      if (teams.length >= 64) {
        return setError('O torneio suporta no máximo 64 equipes.');
      }

      if (teams.some(t => t.name.toLowerCase() === name.trim().toLowerCase())) {
        return setError('Já existe uma equipe registrada com este nome.');
      }

      const randomColor = RACING_COLORS[Math.floor(Math.random() * RACING_COLORS.length)];

      onAddTeam({
        name: name.trim(),
        members: members.trim(),
        color: randomColor,
      });
    }

    setName('');
    setMembers('');
  };

  const handleStartEdit = (team: Team) => {
    setEditingTeamId(team.id);
    setName(team.name);
    setMembers(team.members);
  };

  const handleCancelEdit = () => {
    setEditingTeamId(null);
    setName('');
    setMembers('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
      {/* Registration / Edit Form Column (Only visible for Admin) */}
      {isAdmin ? (
        <div className="lg:col-span-1 bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-[repeating-linear-gradient(45deg,#000,#000_10px,#fff_10px,#fff_20px)] opacity-20" />
          
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Zap className="text-orange-500 h-5 w-5 fill-orange-500/20 animate-pulse" />
            {editingTeamId ? '🔧 Editar Cadastro' : 'Registrar Nova Equipe'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                Nome da Equipe
              </label>
              <input
                type="text"
                className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-lg px-3 py-2 text-sm focus:border-orange-500 focus:outline-none transition-colors placeholder:text-neutral-600"
                placeholder="Ex: Scuderia Ferrari, Drag Kings"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                Membros da Equipe
              </label>
              <input
                type="text"
                className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-lg px-3 py-2 text-sm focus:border-orange-500 focus:outline-none transition-colors placeholder:text-neutral-600"
                placeholder="Ex: Thiago Silva, Amanda, Roberto"
                value={members}
                onChange={(e) => setMembers(e.target.value)}
              />
              <span className="text-[10px] text-neutral-500 mt-1 block">Insira os nomes separados por vírgula.</span>
            </div>

            {error && (
              <p className="text-red-400 text-xs font-medium bg-red-950/40 border border-red-900/50 rounded-lg p-2 animate-shake">
                {error}
              </p>
            )}

            <div className="flex gap-2">
              {editingTeamId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="flex-1 bg-neutral-800 hover:bg-neutral-750 text-neutral-200 font-medium rounded-lg text-sm px-3 py-2.5 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" /> Cancelar
                </button>
              )}
              <button
                type="submit"
                className="flex-[2] bg-orange-600 hover:bg-orange-500 text-white font-medium rounded-lg text-sm px-4 py-2.5 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-orange-600/10 hover:shadow-orange-600/20"
              >
                {editingTeamId ? (
                  <>
                    <Pencil className="h-4 w-4" /> Salvar Alterações
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" /> Adicionar Equipe
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 pt-6 border-t border-neutral-800 space-y-2">
            <p className="text-xs text-neutral-400">
              Dica: Adicione entre 4 e 64 equipes. O sistema dividirá as equipes simetricamente para gerar o mata-mata perfeitamente. A cor da escuderia e identificador serão escolhidos automaticamente de forma randômica!
            </p>
            <button
              onClick={onAddSampleTeams}
              className="w-full bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 font-medium rounded-lg text-xs px-3 py-2 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              Preencher com Equipes de Exemplo
            </button>
          </div>
        </div>
      ) : (
        // Public notification banner (Optional visual space filling)
        <div className="lg:col-span-1 bg-neutral-900/40 border border-neutral-850/80 rounded-xl p-6 shadow-md flex flex-col justify-center items-center text-center space-y-4">
          <div className="p-3.5 bg-neutral-950 rounded-2xl border border-neutral-800 shadow-lg text-orange-500">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <div className="space-y-1.5">
            <h3 className="font-bold text-white text-base">Modo de Apenas Leitura</h3>
            <p className="text-xs text-neutral-450 leading-relaxed max-w-xs">
              Como espectador, você está acompanhando o diretório oficial de equipes em tempo real.
            </p>
          </div>
          <div className="bg-neutral-950 border border-neutral-805/85 px-3 py-2 rounded-lg text-[10px] text-neutral-500 font-medium">
            Por favor, peça ao administrador para cadastrar novas equipes ou iniciar a competição.
          </div>
        </div>
      )}

      {/* Grid listing and Bracket Actions Column */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-xl">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2 font-black">
                <Trophy className="text-yellow-500 h-5 w-5" />
                Equipes no Campeonato ({teams.length}/64)
              </h2>
              <p className="text-xs text-neutral-400 mt-1">
                {isAdmin 
                  ? 'Cadastre pelo menos 4 equipes para liberar o início do torneio de duelos do Maker Speed Challenge.' 
                  : 'Equipes já inscritas na corrida de carros estilo mata-mata.'}
              </p>
            </div>
            {isAdmin && teams.length > 0 && (
              <button
                onClick={onClearTeams}
                className="text-xs text-red-400 hover:text-red-305 border border-red-950 hover:bg-red-950/20 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                Limpar Equipes
              </button>
            )}
          </div>

          {teams.length === 0 ? (
            <div className="border border-dashed border-neutral-800 rounded-xl p-12 text-center flex flex-col items-center justify-center">
              <span className="text-4xl mb-3">🏁</span>
              <p className="text-neutral-400 text-sm font-medium">Aguardando o início do torneio.</p>
              <p className="text-neutral-500 text-xs mt-1 max-w-sm leading-relaxed">
                Nenhum veículo competitivo foi cadastrado na arena do campeonato ainda. Aguardando o administrador registrar as escuderias oficiais.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[440px] overflow-y-auto pr-1">
              {teams.map((team) => {
                const isThisEditing = editingTeamId === team.id;
                return (
                  <div
                    key={team.id}
                    className={`flex items-center justify-between p-3.5 bg-neutral-950 border rounded-lg transition-all shadow-sm animate-fade-in ${
                      isThisEditing ? 'border-orange-500 ring-1 ring-orange-500/30' : 'border-neutral-800/80 hover:border-neutral-700'
                    }`}
                    style={{ borderLeftWidth: '5px', borderLeftColor: team.color }}
                  >
                    <div className="flex-1 min-w-0 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm truncate">{team.name}</span>
                        {isThisEditing && (
                          <span className="text-[9px] bg-orange-900/40 text-orange-400 px-1.5 py-0.5 rounded uppercase font-bold animate-pulse">Editando</span>
                        )}
                      </div>
                      <div className="text-xs text-neutral-400 mt-1">
                        👥 Membros: <span className="font-medium text-neutral-200 block text-[11px] truncate whitespace-normal mt-0.5 leading-snug">{team.members}</span>
                      </div>
                    </div>
                    
                    {isAdmin && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleStartEdit(team)}
                          className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                            isThisEditing ? 'text-orange-400 bg-orange-950/25' : 'text-neutral-400 hover:text-orange-400 hover:bg-neutral-900'
                          }`}
                          title="Editar cadastro do time"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => onRemoveTeam(team.id)}
                          className="p-1.5 text-neutral-500 hover:text-red-400 rounded-md hover:bg-neutral-900 transition-colors cursor-pointer"
                          title="Excluir equipe"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Start Game Action Card (Only visible for Admin) */}
        {isAdmin && teams.length >= 4 && (
          <div className="bg-gradient-to-r from-orange-950/20 to-neutral-900 border border-orange-500/30 rounded-xl p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-1 text-center md:text-left">
              <h3 className="text-lg font-bold text-white flex items-center justify-center md:justify-start gap-1.5 leading-tight">
                🚦 Arena Pronta para Largada!
              </h3>
              <p className="text-xs text-neutral-300 max-w-md">
                O chaveamento será gerado dividindo as {teams.length} equipes simetricamente em Grupo A e Grupo B. O torneio será decidido em combates mata-mata melhor de 3.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <button
                onClick={() => onStartTournament(false)}
                className="bg-neutral-850 hover:bg-neutral-750 text-white font-semibold text-sm px-5 py-3 rounded-xl border border-neutral-700 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                title="Mantém a ordem em que as equipes foram cadastradas"
              >
                Chave Direta
              </button>
              
              <button
                onClick={() => onStartTournament(true)}
                className="bg-orange-600 hover:bg-orange-500 text-white font-bold text-sm px-6 py-3 rounded-xl shadow-lg hover:shadow-orange-700/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                title="Sorteia os grupos misturando todas as equipes cadastradas"
              >
                <Shuffle className="h-4 w-4" />
                Sortear &amp; Iniciar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
