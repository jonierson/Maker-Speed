export interface Team {
  id: string;
  name: string;
  members: string; // Names of the team members
  color: string; // Hex color generated randomly
  registeredAt: string;
}

export interface Race {
  raceNumber: 1 | 2 | 3;
  lane1TeamId: string | null; // ID of team in Lane 1
  lane2TeamId: string | null; // ID of team in Lane 2
  winnerId: string | null;    // ID of the winning team for this race
}

export interface Matchup {
  id: string;
  group: 'A' | 'B' | 'FINAL'; // Group A (Lado Esquerdo), Group B (Lado Direito), Finalíssima
  round: number;              // 1 (QF or SF), 2 (SF or Final of group), etc.
  nodeIndex: number;          // Vertical index for the round tree
  team1Id: string | null;     // Team 1 reference (can be null if waiting for previous winner)
  team2Id: string | null;     // Team 2 reference (can be null if waiting for previous winner)
  team1SourceMatchId: string | null; // ID of the match that decides Team 1
  team2SourceMatchId: string | null; // ID of the match that decides Team 2
  team1Placeholder: string;   // e.g., "Vencedor do Duelo 1"
  team2Placeholder: string;   // e.g., "Vencedor do Duelo 2"
  races: [Race, Race, Race];  // Best of 3 races
  winnerId: string | null;    // Overall matchup winner
  score1: number;             // Number of race wins for Team 1 (0, 1, 2)
  score2: number;             // Number of race wins for Team 2 (0, 1, 2)
  isCompleted: boolean;
}

export interface Tournament {
  id: string;
  status: 'SETUP' | 'ACTIVE' | 'FINISHED';
  teams: Team[];
  groupA_Teams: Team[];
  groupB_Teams: Team[];
  matchups: Matchup[];
  championId: string | null;
  createdAt: string;
}
