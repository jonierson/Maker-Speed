import React, { useState, useEffect } from 'react';
import { Team, Matchup, Tournament } from './types';
import TeamRegister from './components/TeamRegister';
import BracketPanel from './components/BracketPanel';
import MatchupModal from './components/MatchupModal';
import AdminPanelModal from './components/AdminPanelModal';
import { generateTournament, propagateWinners } from './utils/bracketGenerator';
import { Trophy, RefreshCcw, Activity, Sliders, Lock, Unlock, LogIn, LogOut, Sun, Moon } from 'lucide-react';
import {
  isSupabaseConfigured,
  checkSupabaseStatus,
  fetchTeamsFromDb,
  upsertTeamToDb,
  deleteTeamFromDb,
  saveAllTeamsToDb,
  clearAllTeamsFromDb,
  fetchTournamentFromDb,
  saveTournamentToDb,
  SupabaseConfigStatus,
  supabase
} from './lib/supabase';

const LOCAL_STORAGE_TEAMS_KEY = 'torneio_carros_teams';
const LOCAL_STORAGE_TOURNAMENT_KEY = 'torneio_carros_active';

export default function App() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [activeTournament, setActiveTournament] = useState<Tournament | null>(null);
  const [selectedMatchupId, setSelectedMatchupId] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    return sessionStorage.getItem('maker_speed_isAdmin') === 'true';
  });
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string>('');
  
  // Theme Switching
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('torneio_carros_theme');
    return (saved === 'light' || saved === 'dark') ? saved : 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('torneio_carros_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };
  
  // Supabase Status
  const [dbStatus, setDbStatus] = useState<SupabaseConfigStatus | null>(null);
  const [isLoadingDb, setIsLoadingDb] = useState(false);

  const handleVerifyDbStatus = async () => {
    if (isSupabaseConfigured) {
      try {
        const status = await checkSupabaseStatus();
        setDbStatus(status);
      } catch (err) {
        console.error('Failed to verify Supabase status:', err);
      }
    }
  };

  // Load from local or Supabase on init
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoadingDb(true);

      // Instant interactive load from cache (localStorage)
      const savedTeams = localStorage.getItem(LOCAL_STORAGE_TEAMS_KEY);
      if (savedTeams) {
        try {
          setTeams(JSON.parse(savedTeams));
        } catch (e) {
          console.error('Error parsing teams from storage', e);
        }
      }

      const savedTournament = localStorage.getItem(LOCAL_STORAGE_TOURNAMENT_KEY);
      if (savedTournament) {
        try {
          setActiveTournament(JSON.parse(savedTournament));
        } catch (e) {
          console.error('Error parsing tournament from storage', e);
        }
      }

      // Sync fresh online records if online & configured
      if (isSupabaseConfigured) {
        try {
          const status = await checkSupabaseStatus();
          setDbStatus(status);

          if (status.connected && status.teamsTableExists) {
            const dbTeams = await fetchTeamsFromDb();
            setTeams(dbTeams);
            localStorage.setItem(LOCAL_STORAGE_TEAMS_KEY, JSON.stringify(dbTeams));
          }

          if (status.connected && status.tournamentsTableExists) {
            const dbTourney = await fetchTournamentFromDb();
            setActiveTournament(dbTourney);
            if (dbTourney) {
              localStorage.setItem(LOCAL_STORAGE_TOURNAMENT_KEY, JSON.stringify(dbTourney));
            } else {
              localStorage.removeItem(LOCAL_STORAGE_TOURNAMENT_KEY);
            }
          }
        } catch (err) {
          console.error('Error fetching data from Supabase on startup:', err);
        }
      }
      setIsLoadingDb(false);
    };

    loadInitialData();
  }, []);

  // Save state helpers
  const saveTeamsLocalOnly = (newTeams: Team[]) => {
    setTeams(newTeams);
    localStorage.setItem(LOCAL_STORAGE_TEAMS_KEY, JSON.stringify(newTeams));
  };

  const saveTournament = async (tournament: Tournament | null) => {
    setActiveTournament(tournament);
    if (tournament) {
      localStorage.setItem(LOCAL_STORAGE_TOURNAMENT_KEY, JSON.stringify(tournament));
    } else {
      localStorage.removeItem(LOCAL_STORAGE_TOURNAMENT_KEY);
    }

    if (isSupabaseConfigured && dbStatus?.tournamentsTableExists) {
      try {
        await saveTournamentToDb(tournament);
      } catch (err) {
        console.error('Error saving tournament to Supabase:', err);
      }
    }
  };

  // Add, remove, update team handlers
  const handleAddTeam = async (teamData: Omit<Team, 'id' | 'registeredAt'>) => {
    const newTeam: Team = {
      ...teamData,
      id: `team_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      registeredAt: new Date().toISOString(),
    };
    const updated = [...teams, newTeam];
    saveTeamsLocalOnly(updated);

    if (isSupabaseConfigured && dbStatus?.teamsTableExists) {
      try {
        await upsertTeamToDb(newTeam);
      } catch (err) {
        console.error('Failed to sync team to Supabase:', err);
      }
    }
  };

  const handleRemoveTeam = async (id: string) => {
    const remaining = teams.filter(t => t.id !== id);
    saveTeamsLocalOnly(remaining);

    if (isSupabaseConfigured && dbStatus?.teamsTableExists) {
      try {
        await deleteTeamFromDb(id);
      } catch (err) {
        console.error('Failed to delete team from Supabase:', err);
      }
    }
  };

  const handleUpdateTeam = async (id: string, updatedData: Partial<Team>) => {
    const updatedTeamList = teams.map(t => t.id === id ? { ...t, ...updatedData } : t);
    saveTeamsLocalOnly(updatedTeamList);

    const updatedTeam = updatedTeamList.find(t => t.id === id);
    if (updatedTeam && isSupabaseConfigured && dbStatus?.teamsTableExists) {
      try {
        await upsertTeamToDb(updatedTeam);
      } catch (err) {
        console.error('Failed to update team in Supabase:', err);
      }
    }
    
    if (activeTournament) {
      const updatedTourneyTeams = activeTournament.teams.map(t => t.id === id ? { ...t, ...updatedData } : t);
      const updatedMatchups = activeTournament.matchups.map(m => {
        let t1Placeholder = m.team1Placeholder;
        let t2Placeholder = m.team2Placeholder;
        if (m.team1Id === id) {
          t1Placeholder = updatedData.name || m.team1Placeholder;
        }
        if (m.team2Id === id) {
          t2Placeholder = updatedData.name || m.team2Placeholder;
        }
        return {
          ...m,
          team1Placeholder: t1Placeholder,
          team2Placeholder: t2Placeholder
        };
      });
      await saveTournament({
        ...activeTournament,
        teams: updatedTourneyTeams,
        matchups: updatedMatchups
      });
    }
  };

  const handleAddSampleTeams = async () => {
    // Generate a list of 16 highly styled sample teams for testing up to 64!
    const names = [
      'Scuderia Carbono 🇧🇷', 'Viper Drift 🇯🇵', 'Gama Turbo 🇩🇪', 'Apex Predator 🇺🇸',
      'Speed Ghost 🇮🇹', 'Thunder Nitro 🇬🇧', 'Octane Blaze 🇫🇷', 'Neon Samurai 🇰🇷',
      'Apex Storm 🇨🇦', 'Alpha Phoenix 🇦🇺', 'Quantum Gear 🇨🇭', 'Volt Spark ⚡',
      'Wild Torrent ⛰️', 'Vortex Fusion 🌀', 'Gravity Shock 🌌', 'Cyber Matrix 💻'
    ];
    const memberTemplates = [
      'Thiago Silva, Amanda Costa, Roberto Dias',
      'Kenji Sato, Takashi Mifune, Yuki Tanaka',
      'Hans Müller, Dieter Bohlen, Sarah Connor',
      'Jack Carter, Sarah Connor, John Connor',
      'Clara Ross, Matteo Rossi, Giulia Bianchi',
      'Lewis Drake, James Smith, Emily Watson',
      'Pierre Dubois, Jean Dupont, Marie Curie',
      'Min-ho Park, Sook-ja Kim, Ji-woo Lee',
      'Robert Taylor, Helen Miller, Marc Spector',
      'Bruce Wayne, Clark Kent, Diana Prince',
      'Peter Parker, Tony Stark, Stephen Strange',
      'Wanda Maximoff, Vision, Carol Danvers',
      'Jean Grey, Scott Summers, Logan Howlett',
      'Barry Allen, Iris West, Cisco Ramon',
      'Oliver Queen, Felicity Smoak, John Diggle',
      'Hal Jordan, John Stewart, Guy Gardner'
    ];
    const colors = ['#EF4444', '#F97316', '#EAB308', '#22C55E', '#06B6D4', '#3B82F6', '#A855F7', '#EC4899', '#10B981', '#F43F5E', '#06B6D4', '#EAB308', '#EF4444', '#A855F7', '#3B82F6', '#22C55E'];

    const newSamples: Team[] = names.map((name, idx) => ({
      id: `team_sample_${idx}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name,
      members: memberTemplates[idx],
      color: colors[idx % colors.length],
      registeredAt: new Date().toISOString(),
    }));

    // Append up to 64 limit
    const merged = [...teams];
    const onlyNewSamples: Team[] = [];
    newSamples.forEach(sample => {
      if (merged.length < 64 && !merged.some(t => t.name.toLowerCase() === sample.name.toLowerCase())) {
        merged.push(sample);
        onlyNewSamples.push(sample);
      }
    });

    saveTeamsLocalOnly(merged);

    if (isSupabaseConfigured && dbStatus?.teamsTableExists && onlyNewSamples.length > 0) {
      try {
        await saveAllTeamsToDb(onlyNewSamples);
      } catch (err) {
        console.error('Failed to bulk sync sample teams to Supabase:', err);
      }
    }
  };

  const handleClearTeams = async () => {
    saveTeamsLocalOnly([]);
    if (isSupabaseConfigured && dbStatus?.teamsTableExists) {
      try {
        await clearAllTeamsFromDb();
      } catch (err) {
        console.error('Failed to clear teams in Supabase:', err);
      }
    }
  };

  // Start tournament handler
  const handleStartTournament = async (shuffle: boolean) => {
    if (teams.length < 4) return;
    const tournament = generateTournament(teams, shuffle);
    await saveTournament(tournament);
  };

  // Score saver
  const handleSaveMatchupScore = async (
    matchupId: string,
    raceWinners: (string | null)[],
    w1Count: number,
    w2Count: number,
    winnerId: string | null
  ) => {
    if (!activeTournament) return;

    // Mutate tournament copy
    const updatedMatchups = activeTournament.matchups.map((m) => {
      if (m.id === matchupId) {
        // Build new races array
        const updatedRaces = m.races.map((race, idx) => ({
          ...race,
          winnerId: raceWinners[idx],
        })) as [any, any, any];

        return {
          ...m,
          races: updatedRaces,
          score1: w1Count,
          score2: w2Count,
          winnerId,
          isCompleted: true,
        };
      }
      return m;
    });

    // Propagate winners downstream to feed connected tournaments
    propagateWinners(updatedMatchups);

    // Look if Champion is defined (Winner of Grand Final)
    const grandFinal = updatedMatchups.find(m => m.id === 'match_final');
    let champId = activeTournament.championId;
    let newStatus = activeTournament.status;

    if (grandFinal && grandFinal.isCompleted && grandFinal.winnerId) {
      champId = grandFinal.winnerId;
      newStatus = 'FINISHED';
    }

    const updatedTournament: Tournament = {
      ...activeTournament,
      matchups: updatedMatchups,
      championId: champId,
      status: newStatus,
    };

    await saveTournament(updatedTournament);
  };

  // Reset current tournament and return to team dashboard (show modal first)
  const handleResetTournament = () => {
    setShowResetConfirm(true);
  };

  const confirmResetTournament = async () => {
    await saveTournament(null);
    setSelectedMatchupId(null);
    setShowResetConfirm(false);
  };

  // Setup refs
  const selectedMatchup = activeTournament?.matchups.find(m => m.id === selectedMatchupId) || null;
  const championTeam = activeTournament?.championId ? teams.find(t => t.id === activeTournament.championId) || null : null;

  // Compute completed matching statistics
  const completedMatchesCount = activeTournament ? activeTournament.matchups.filter(m => m.isCompleted).length : 0;
  const totalMatchesCount = activeTournament ? activeTournament.matchups.length : 0;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-orange-600/30">
      
      {/* Decorative Grid Racing Header */}
      <header className="relative bg-neutral-900 overflow-hidden border-b border-neutral-800">
        {/* Repeating checkered header strip */}
        <div className="h-2 bg-[repeating-linear-gradient(45deg,#000,#000_12px,#fff_12px,#fff_24px)]" />
        
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl p-1.5 bg-neutral-950 rounded-xl border border-neutral-800 shadow-md">⚡</span>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                Maker Speed Challenge <span className="text-orange-500 font-normal text-xs sm:text-sm bg-orange-950/40 border border-orange-900/40 px-2 py-0.5 rounded uppercase tracking-wider">IFMAKER-ARAGUAÍNA</span>
              </h1>
              <p className="text-xs text-neutral-400 mt-0.5">Competição de veículos movidos exclusivamente pela força da gravidade.</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto sm:justify-end flex-wrap">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="bg-neutral-950/60 hover:bg-neutral-950 border border-neutral-800 text-neutral-300 hover:text-white p-2 rounded-lg cursor-pointer transition-all flex items-center justify-center gap-2 text-xs font-semibold hover:scale-102 active:scale-98 shadow-sm"
              title={theme === 'dark' ? 'Mudar para Tema Claro' : 'Mudar para Tema Escuro'}
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="h-4 w-4 text-amber-500" />
                  <span className="sm:hidden lg:inline text-neutral-300 font-medium">Tema Claro</span>
                </>
              ) : (
                <>
                  <Moon className="h-4 w-4 text-violet-400" />
                  <span className="sm:hidden lg:inline text-neutral-300 font-medium">Tema Escuro</span>
                </>
              )}
            </button>

            {/* Mode Indicator Pill */}
            {isAdmin ? (
              <div className="bg-orange-950/40 border border-orange-500/30 px-3 py-1.5 rounded-lg flex items-center justify-center gap-2 text-xs text-orange-400 font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse" />
                <span>👑 Administrador</span>
              </div>
            ) : (
              <div className="bg-cyan-950/30 border border-cyan-800/20 px-3 py-1.5 rounded-lg flex items-center justify-center gap-2 text-xs text-cyan-400 font-medium font-mono">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" style={{ animationDuration: '3s' }} />
                <span>📺 Painel do Espectador</span>
              </div>
            )}

            {activeTournament && (
              <div className="sm:text-right px-2 hidden sm:block">
                <p className="text-[9px] uppercase font-bold tracking-wider text-neutral-400 flex items-center sm:justify-end gap-1">
                  <Activity className="h-3 w-3 text-orange-500" /> Progresso
                </p>
                <p className="text-xs font-semibold text-white mt-0.5">
                  {completedMatchesCount}/{totalMatchesCount} Duelos ({Math.round((completedMatchesCount / (totalMatchesCount || 1)) * 100)}%)
                </p>
              </div>
            )}

            {isAdmin && (
              <>
                <button
                  onClick={() => setShowAdminModal(true)}
                  className="bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-lg text-xs px-3.5 py-2 flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-md shadow-orange-600/10 hover:shadow-orange-600/25 shrink-0"
                  title="Painel Administrativo"
                >
                  <Sliders className="h-3.5 w-3.5" />
                  <span>Painel do Admin</span>
                </button>

                {activeTournament && (
                  <button
                    onClick={handleResetTournament}
                    className="bg-neutral-800 hover:bg-neutral-750 text-neutral-200 border border-neutral-700 font-semibold rounded-lg text-xs px-3  py-2 flex items-center justify-center gap-1.5 cursor-pointer transition-colors shrink-0"
                    title="Reiniciar Torneio"
                  >
                    <RefreshCcw className="h-3.5 w-3.5" />
                    <span>Reiniciar</span>
                  </button>
                )}
              </>
            )}

            {/* Login / Logout Button */}
            {isAdmin ? (
              <button
                onClick={() => {
                  setIsAdmin(false);
                  sessionStorage.removeItem('maker_speed_isAdmin');
                  if (supabase) {
                    supabase.auth.signOut().catch(err => console.warn('Erro ao deslogar do Supabase:', err));
                  }
                }}
                className="bg-neutral-800 hover:bg-neutral-750 text-neutral-300 border border-neutral-700 font-bold rounded-lg text-xs px-3.5 py-2 flex items-center justify-center gap-1.5 cursor-pointer transition-colors shrink-0"
                title="Sair da área administrativa"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sair</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  setLoginError('');
                  setShowLoginModal(true);
                }}
                className="bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-lg text-xs px-4 py-2 flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-md shadow-orange-600/10 hover:shadow-orange-600/25 shrink-0"
                title="Fazer Login como Administrador"
              >
                <LogIn className="h-3.5 w-3.5" />
                <span>Painel Admin</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {!activeTournament ? (
          // STEP 1: Registration dashboard
          <div className="space-y-6">
            {/* Quick Rules Banner info */}
            <div className="bg-orange-950/10 border border-orange-900/30 p-4 rounded-xl flex gap-3 text-sm">
              <span className="text-xl">🚦</span>
              <div>
                <h4 className="font-bold text-white mb-0.5">Maker Speed Challenge - Regras de Duelos</h4>
                <p className="text-neutral-450 text-xs leading-relaxed">
                  Insira até <strong>64 equipes</strong> com seus respectivos membros. O sistema dividirá as equipes simetricamente em chaves eliminatórias (Lado A e Lado B). Os duelos ocorrem em melhor de 3 rodadas, com preenchimento intuitivo dos resultados. O campeão de cada lado avança para a grande finalíssima!
                </p>
              </div>
            </div>

            <TeamRegister
              teams={teams}
              onAddTeam={handleAddTeam}
              onRemoveTeam={handleRemoveTeam}
              onUpdateTeam={handleUpdateTeam}
              onAddSampleTeams={handleAddSampleTeams}
              onClearTeams={handleClearTeams}
              onStartTournament={handleStartTournament}
              isAdmin={isAdmin}
            />
          </div>
        ) : (
          // STEP 2: Live Elimination Tree Board
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-neutral-900 border border-neutral-800 p-4 rounded-xl">
              <div>
                <span className="text-[10px] bg-red-950/40 border border-red-900/50 text-red-400 font-bold px-2 py-0.5 rounded tracking-wide uppercase font-mono">
                  Eliminatórias Ativas
                </span>
                <h3 className="text-base font-bold text-white mt-1">Quadro Geral de Chaves</h3>
              </div>
              <div className="flex items-center gap-3">
                {isAdmin ? (
                  <>
                    <p className="text-xs text-neutral-450 hidden md:block">Clique nas partidas para registrar e editar resultados de cada duelo.</p>
                    <button
                      onClick={() => setShowAdminModal(true)}
                      className="bg-neutral-800 hover:bg-neutral-750 text-orange-400 text-xs font-bold px-3 py-1.5 rounded-lg border border-neutral-700 cursor-pointer flex items-center gap-1 transition-colors"
                    >
                      <Sliders className="h-3.5 w-3.5" /> Editar Chaves/Times
                    </button>
                  </>
                ) : (
                  <p className="text-xs text-neutral-450 font-medium">Clique nas partidas para visualizar os placares e detalhes do duelo.</p>
                )}
              </div>
            </div>

            <BracketPanel
              matchups={activeTournament.matchups}
              teams={teams}
              onSelectMatchup={(id) => setSelectedMatchupId(id)}
              championTeam={championTeam}
              onResetTournament={handleResetTournament}
            />
          </div>
        )}
      </main>

      {/* Active Modal Score Manager */}
      {selectedMatchupId && activeTournament && (
        <MatchupModal
          matchup={selectedMatchup!}
          teams={teams}
          onClose={() => setSelectedMatchupId(null)}
          onSaveScore={handleSaveMatchupScore}
          readOnly={!isAdmin}
        />
      )}

      {/* Primary Admin Control Panel Modal */}
      {showAdminModal && (
        <AdminPanelModal
          tournament={activeTournament || {
            id: 'dummy',
            status: 'SETUP',
            teams: teams,
            groupA_Teams: [],
            groupB_Teams: [],
            matchups: [],
            championId: null,
            createdAt: new Date().toISOString()
          }}
          teams={teams}
          onUpdateTeam={handleUpdateTeam}
          onSelectMatchup={(matchId) => {
            setShowAdminModal(false);
            setSelectedMatchupId(matchId);
          }}
          onClose={() => setShowAdminModal(false)}
          dbStatus={dbStatus}
          onRefreshDbStatus={handleVerifyDbStatus}
          isSupabaseConfigured={isSupabaseConfigured}
        />
      )}

      {/* Custom Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden relative animate-fade-in">
            <div className="absolute top-0 left-0 right-0 h-1 bg-[repeating-linear-gradient(45deg,#000,#000_10px,#ea580c_10px,#ea580c_20px)]" />
            <div className="p-6 text-center space-y-4">
              <span className="text-4xl animate-bounce">⚠️</span>
              <div>
                <h3 className="text-lg font-bold text-white uppercase tracking-tight">Reiniciar Torneio?</h3>
                <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
                  Deseja realmente abandonar o progresso atual do campeonato? O progresso de todos os duelos e placares nesta edição será **completamente perdido**, mas as equipes cadastradas permanecerão de pé para disputar novamente.
                </p>
              </div>
              <div className="flex gap-3 justify-center pt-2">
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="px-4 py-2 text-xs font-semibold text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-750 rounded-lg cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmResetTournament}
                  className="px-4 py-2 text-xs font-bold text-white bg-orange-600 hover:bg-orange-500 rounded-lg cursor-pointer transition-colors flex items-center gap-1 shadow-md shadow-orange-600/10"
                >
                  Confirmar e Reiniciar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden relative animate-fade-in">
            {/* Top checkered accent line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-[repeating-linear-gradient(45deg,#000,#000_10px,#ea580c_10px,#ea580c_20px)]" />
            
            <div className="p-6 space-y-5">
              <div className="text-center space-y-2">
                <div className="inline-flex p-3 bg-neutral-950 border border-neutral-800 rounded-2xl text-orange-500 shadow-md">
                  <Lock className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-black text-white uppercase tracking-tight">Área do Administrador</h3>
                <p className="text-xs text-neutral-400">
                  Insira as credenciais para gerenciar times, reiniciar campeonatos e salvar placares.
                </p>
              </div>

              <form onSubmit={async (e) => {
                e.preventDefault();
                const target = e.currentTarget as any;
                const user = target.username.value;
                const password = target.password.value;
                if (user === 'admin' && password === 'MSC2026@ifmaker') {
                  setIsAdmin(true);
                  sessionStorage.setItem('maker_speed_isAdmin', 'true');
                  setShowLoginModal(false);
                  setLoginError('');

                  // Se Supabase estiver disponível, autentica o usuário em background no Supabase Auth.
                  // Isso garante que o cabeçalho JWT seja anexado às chamadas do cliente, satisfazendo as políticas RLS seguras.
                  if (supabase) {
                    try {
                      // Tentamos fazer login com um email padrão administrativo e senha
                      const { error } = await supabase.auth.signInWithPassword({
                        email: 'admin@ifmaker.com',
                        password: password
                      });
                      if (error) {
                        console.warn(
                          'Supabase Auth: Erro ao realizar login administrativo remoto (RLS seguro inativo, mas login local OK):',
                          error.message,
                          '\nIsso é normal se você ainda não criou o usuário admin@ifmaker.com no painel Authentication do Supabase.'
                        );
                      } else {
                        console.log('Supabase Auth: Administrador autenticado com sucesso! RLS com restrição rígida ativo no banco.');
                      }
                    } catch (err) {
                      console.warn('Erro ao conectar ao serviço de Auth do Supabase:', err);
                    }
                  }
                } else {
                  setLoginError('Credenciais incorretas!');
                }
              }} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">Usuário</label>
                  <input
                    type="text"
                    name="username"
                    required
                    className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-lg px-3.5 py-2 text-sm focus:border-orange-500 focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">Senha</label>
                  <input
                    type="password"
                    name="password"
                    required
                    className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-lg px-3.5 py-2 text-sm focus:border-orange-500 focus:outline-none transition-colors"
                    placeholder="••••••••"
                  />
                </div>

                {loginError && (
                  <p className="text-red-400 text-xs font-bold bg-red-950/40 border border-red-900/50 rounded-lg p-2.5 text-center">
                    ❌ {loginError}
                  </p>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowLoginModal(false);
                      setLoginError('');
                    }}
                    className="flex-1 px-4 py-2 text-xs font-semibold text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-750 rounded-lg cursor-pointer transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 text-xs font-bold text-white bg-orange-600 hover:bg-orange-500 rounded-lg cursor-pointer transition-colors shadow-lg shadow-orange-600/10"
                  >
                    Entrar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-neutral-950 py-6 text-center text-xs text-neutral-650 border-t border-neutral-900 mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-3">
          <p>🏁 Maker Speed Challenge • Painel Avançado de Torneios Eliminatórios</p>
          <div className="flex items-center gap-1">
            <span>Duelo Automatizado</span>
            <span>•</span>
            <span>Melhor de 3 Rodadas/Sub-etapas</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
