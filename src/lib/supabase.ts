import { createClient } from '@supabase/supabase-js';
import { Team, Tournament } from '../types';

// Sanitize Supabase URL if it contains the "/rest/v1/" suffix
let supabaseUrl = ((import.meta as any).env?.VITE_SUPABASE_URL || '').trim();
if (supabaseUrl.endsWith('/rest/v1/')) {
  supabaseUrl = supabaseUrl.slice(0, -9);
} else if (supabaseUrl.endsWith('/rest/v1')) {
  supabaseUrl = supabaseUrl.slice(0, -8);
}

const supabaseKey = ((import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '').trim();

// Ensure the URL is valid HTTP/HTTPS before configuring and connecting
export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  (supabaseUrl.startsWith('http://') || supabaseUrl.startsWith('https://')) && 
  supabaseKey
);

let supabaseClient: any = null;
if (isSupabaseConfigured) {
  try {
    supabaseClient = createClient(supabaseUrl, supabaseKey);
  } catch (error) {
    console.error('Error creating Supabase client:', error);
  }
}

export const supabase = supabaseClient;

export interface SupabaseConfigStatus {
  connected: boolean;
  teamsTableExists: boolean;
  tournamentsTableExists: boolean;
  error?: string;
}

// Check database table availability
export async function checkSupabaseStatus(): Promise<SupabaseConfigStatus> {
  if (!supabase) {
    return { connected: false, teamsTableExists: false, tournamentsTableExists: false, error: 'Database credentials are not set.' };
  }

  try {
    // Attempt to select 0 rows from msc_teams
    const { error: teamsError } = await supabase
      .from('msc_teams')
      .select('id')
      .limit(0);

    const teamsTableExists = !teamsError || (teamsError.code !== '42P01'); // 42P01 is "relation does not exist"

    // Attempt to select 0 rows from msc_tournaments
    const { error: tourneyError } = await supabase
      .from('msc_tournaments')
      .select('id')
      .limit(0);

    const tournamentsTableExists = !tourneyError || (tourneyError.code !== '42P01');

    return {
      connected: true,
      teamsTableExists,
      tournamentsTableExists,
      error: (teamsError && teamsError.code === '42P01') || (tourneyError && tourneyError.code === '42P01') 
        ? 'As tabelas msc_teams ou msc_tournaments ainda não existem.'
        : undefined
    };
  } catch (err: any) {
    return {
      connected: false,
      teamsTableExists: false,
      tournamentsTableExists: false,
      error: err?.message || 'Falha ao conectar com o Supabase.'
    };
  }
}

// ----------------------------------------------------
// DB Operation Helpers for Teams
// ----------------------------------------------------

export async function fetchTeamsFromDb(): Promise<Team[]> {
  if (!supabase) return [];
  
  const { data, error } = await supabase
    .from('msc_teams')
    .select('*')
    .order('registered_at', { ascending: true });

  if (error) {
    console.error('Error fetching teams from Supabase:', error);
    throw error;
  }

  // Map DB column names to CamelCase React interface
  return (data || []).map(row => ({
    id: row.id,
    name: row.name,
    members: row.members || '',
    color: row.color || '#EF4444',
    registeredAt: row.registered_at
  }));
}

export async function upsertTeamToDb(team: Team): Promise<void> {
  if (!supabase) return;

  const { error } = await supabase
    .from('msc_teams')
    .upsert({
      id: team.id,
      name: team.name,
      members: team.members,
      color: team.color,
      registered_at: team.registeredAt
    });

  if (error) {
    console.error('Error upserting team to Supabase:', error);
    throw error;
  }
}

export async function deleteTeamFromDb(id: string): Promise<void> {
  if (!supabase) return;

  const { error } = await supabase
    .from('msc_teams')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting team from Supabase:', error);
    throw error;
  }
}

export async function saveAllTeamsToDb(teams: Team[]): Promise<void> {
  if (!supabase) return;

  // Perform bulk upsert
  const mapped = teams.map(t => ({
    id: t.id,
    name: t.name,
    members: t.members,
    color: t.color,
    registered_at: t.registeredAt
  }));

  const { error } = await supabase
    .from('msc_teams')
    .upsert(mapped);

  if (error) {
    console.error('Error saving all teams to Supabase:', error);
    throw error;
  }
}

export async function clearAllTeamsFromDb(): Promise<void> {
  if (!supabase) return;

  const { error } = await supabase
    .from('msc_teams')
    .delete()
    .neq('id', 'null_placeholder_to_match_all');

  if (error) {
    console.error('Error clearing teams from Supabase:', error);
    throw error;
  }
}

// ----------------------------------------------------
// DB Operation Helpers for Tournaments
// ----------------------------------------------------

export async function fetchTournamentFromDb(): Promise<Tournament | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('msc_tournaments')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error fetching active tournament from Supabase:', error);
    throw error;
  }

  if (!data) return null;

  // The 'details' jsonb column contains the complete tournament configurations
  return {
    id: data.id,
    status: data.status,
    championId: data.champion_id,
    createdAt: data.created_at,
    teams: data.details.teams || [],
    groupA_Teams: data.details.groupA_Teams || [],
    groupB_Teams: data.details.groupB_Teams || [],
    matchups: data.details.matchups || []
  };
}

export async function saveTournamentToDb(tournament: Tournament | null): Promise<void> {
  if (!supabase) return;

  if (!tournament) {
    // If tournament was reset, delete entries to match local behavior
    const { error } = await supabase
      .from('msc_tournaments')
      .delete()
      .neq('id', 'null_placeholder_to_match_all');

    if (error) {
      console.error('Error resetting tournament in Supabase:', error);
      throw error;
    }
    return;
  }

  // Update or insert tournament state
  const { error } = await supabase
    .from('msc_tournaments')
    .upsert({
      id: tournament.id,
      status: tournament.status,
      champion_id: tournament.championId,
      created_at: tournament.createdAt,
      details: {
        teams: tournament.teams,
        groupA_Teams: tournament.groupA_Teams,
        groupB_Teams: tournament.groupB_Teams,
        matchups: tournament.matchups
      }
    });

  if (error) {
    console.error('Error saving tournament to Supabase:', error);
    throw error;
  }
}
