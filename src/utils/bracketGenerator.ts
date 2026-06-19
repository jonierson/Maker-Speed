import { Team, Matchup, Race, Tournament } from '../types';

// Helper to shuffle array
export function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Initial default blank races generator
function createBlankRaces(t1: string | null, t2: string | null): [Race, Race, Race] {
  return [
    {
      raceNumber: 1,
      lane1TeamId: t1,
      lane2TeamId: t2,
      winnerId: null,
    },
    {
      raceNumber: 2,
      lane1TeamId: t2,
      lane2TeamId: t1,
      winnerId: null,
    },
    {
      raceNumber: 3,
      lane1TeamId: t1,
      lane2TeamId: t2,
      winnerId: null,
    }
  ];
}

export function generateTournament(teams: Team[], shuffle: boolean = true): Tournament {
  const processedTeams = shuffle ? shuffleArray(teams) : [...teams];

  // Divide teams into Group A and Group B
  // We split the list in half. If odd, Group A takes the extra team
  const half = Math.ceil(processedTeams.length / 2);
  const groupA_Teams = processedTeams.slice(0, half);
  const groupB_Teams = processedTeams.slice(half);

  // Determine standard bracket size for each side
  // Max size is 8 teams on each side (total 16).
  // Bracket sizes for a group can be: 2, 4, or 8 slots.
  const getBracketSize = (count: number): number => {
    if (count <= 2) return 2;
    if (count <= 4) return 4;
    if (count <= 8) return 8;
    if (count <= 16) return 16;
    return 32; // fits up to 32 teams on each side (64 total)
  };

  const sizeA = getBracketSize(groupA_Teams.length);
  const sizeB = getBracketSize(groupB_Teams.length);
  
  // Symmetrical size determined by the larger of both sides to keep the panel perfectly aligned!
  const bracketSize = Math.max(sizeA, sizeB); 
  const roundsPerGroup = Math.log2(bracketSize); // 1, 2, or 3 rounds

  // Pad team arrays to bracketSize with nulls (BYEs)
  const padTeams = (teamList: Team[], size: number): (Team | null)[] => {
    const list: (Team | null)[] = [...teamList];
    while (list.length < size) {
      list.push(null);
    }
    return list;
  };

  const paddedA = padTeams(groupA_Teams, bracketSize);
  const paddedB = padTeams(groupB_Teams, bracketSize);

  const matchups: Matchup[] = [];

  // Helper to get Match ID
  // e.g., match_A_r1_idx0
  const getMatchId = (group: 'A' | 'B' | 'FINAL', round: number, index: number) => {
    return `match_${group.toLowerCase()}_r${round}_idx${index}`;
  };

  // 1. Generate matchups for Group A and Group B
  const generateGroupMatches = (group: 'A' | 'B', paddedList: (Team | null)[]) => {
    // Round 1 matches
    const r1MatchCount = bracketSize / 2;
    for (let idx = 0; idx < r1MatchCount; idx++) {
      const t1 = paddedList[idx * 2];
      const t2 = paddedList[idx * 2 + 1];

      const matchId = getMatchId(group, 1, idx);
      
      const matchup: Matchup = {
        id: matchId,
        group,
        round: 1,
        nodeIndex: idx,
        team1Id: t1?.id || null,
        team2Id: t2?.id || null,
        team1SourceMatchId: null,
        team2SourceMatchId: null,
        team1Placeholder: t1 ? t1.name : "ISENTO (BYE)",
        team2Placeholder: t2 ? t2.name : "ISENTO (BYE)",
        races: createBlankRaces(t1?.id || null, t2?.id || null),
        winnerId: null,
        score1: 0,
        score2: 0,
        isCompleted: false,
      };

      // Resolve BYEs automatically
      if (!t1 && !t2) {
        // Both are null - shouldn't happen, but complete as empty
        matchup.isCompleted = true;
      } else if (t1 && !t2) {
        // Team 1 wins by walkover (BYE)
        matchup.winnerId = t1.id;
        matchup.score1 = 2;
        matchup.isCompleted = true;
      } else if (!t1 && t2) {
        // Team 2 wins by walkover (BYE)
        matchup.winnerId = t2.id;
        matchup.score2 = 2;
        matchup.isCompleted = true;
      }

      matchups.push(matchup);
    }

    // Subsequent rounds (Round 2 upwards)
    for (let r = 2; r <= roundsPerGroup; r++) {
      const parentMatchCount = bracketSize / Math.pow(2, r); // Matches in this round
      for (let idx = 0; idx < parentMatchCount; idx++) {
        const sourceIdx1 = idx * 2;
        const sourceIdx2 = idx * 2 + 1;
        const sourceId1 = getMatchId(group, r - 1, sourceIdx1);
        const sourceId2 = getMatchId(group, r - 1, sourceIdx2);

        const matchId = getMatchId(group, r, idx);

        const matchup: Matchup = {
          id: matchId,
          group,
          round: r,
          nodeIndex: idx,
          team1Id: null,
          team2Id: null,
          team1SourceMatchId: sourceId1,
          team2SourceMatchId: sourceId2,
          team1Placeholder: `Vencedor do Duelo ${r - 1}.${sourceIdx1 + 1}`,
          team2Placeholder: `Vencedor do Duelo ${r - 1}.${sourceIdx2 + 1}`,
          races: createBlankRaces(null, null),
          winnerId: null,
          score1: 0,
          score2: 0,
          isCompleted: false,
        };

        matchups.push(matchup);
      }
    }
  };

  generateGroupMatches('A', paddedA);
  generateGroupMatches('B', paddedB);

  // 2. Generate the Grand Final
  // It takes the winner of Group A Final and Group B Final
  const groupAFinalId = getMatchId('A', roundsPerGroup, 0);
  const groupBFinalId = getMatchId('B', roundsPerGroup, 0);
  const grandFinalRound = roundsPerGroup + 1;

  const grandFinal: Matchup = {
    id: 'match_final',
    group: 'FINAL',
    round: grandFinalRound,
    nodeIndex: 0,
    team1Id: null,
    team2Id: null,
    team1SourceMatchId: groupAFinalId,
    team2SourceMatchId: groupBFinalId,
    team1Placeholder: "Campeão do Grupo A",
    team2Placeholder: "Campeão do Grupo B",
    races: createBlankRaces(null, null),
    winnerId: null,
    score1: 0,
    score2: 0,
    isCompleted: false,
  };

  matchups.push(grandFinal);

  // 3. Propagate completed Round 1 matches (BYEs) to Round 2
  propagateWinners(matchups);

  return {
    id: `torneio_${Date.now()}`,
    status: 'ACTIVE',
    teams,
    groupA_Teams,
    groupB_Teams,
    matchups,
    championId: null,
    createdAt: new Date().toISOString(),
  };
}

// Helper to propagate winners to next rounds (reusable after any match is saved)
export function propagateWinners(matchups: Matchup[]): void {
  // We repeat this enough times to ensure full propagation up to the final
  let changed = true;
  while (changed) {
    changed = false;
    for (const match of matchups) {
      if (match.isCompleted && match.winnerId) {
        // Find which downstream matchup expects this match's winner
        const targetMatchForTeam1 = matchups.find(m => m.team1SourceMatchId === match.id);
        if (targetMatchForTeam1 && targetMatchForTeam1.team1Id !== match.winnerId) {
          targetMatchForTeam1.team1Id = match.winnerId;
          // Refresh races lane setups when team is set
          targetMatchForTeam1.races = createBlankRaces(targetMatchForTeam1.team1Id, targetMatchForTeam1.team2Id);
          changed = true;
        }

        const targetMatchForTeam2 = matchups.find(m => m.team2SourceMatchId === match.id);
        if (targetMatchForTeam2 && targetMatchForTeam2.team2Id !== match.winnerId) {
          targetMatchForTeam2.team2Id = match.winnerId;
          // Refresh races lane setups when team is set
          targetMatchForTeam2.races = createBlankRaces(targetMatchForTeam1 ? targetMatchForTeam1.team1Id : targetMatchForTeam2.team1Id, targetMatchForTeam2.team2Id);
          // Wait, let's make sure both are accurately fetched
          targetMatchForTeam2.races = createBlankRaces(targetMatchForTeam2.team1Id, targetMatchForTeam2.team2Id);
          changed = true;
        }
      }

      // If a match is waiting for a team, but is already populated with actual IDs,
      // it might also check if it has a BYE downstream or if we cleared results.
      // If team1 or team2 has been reset, reset downstream matches as well!
      if (!match.winnerId && match.isCompleted) {
        // This is a safety reset
        match.isCompleted = false;
        match.score1 = 0;
        match.score2 = 0;
        match.races = createBlankRaces(match.team1Id, match.team2Id);
        changed = true;
      }
      
      // If a team is reset to null upstream, we must force-reset the downstream matchup details and recursively invalidate them!
      const source1DeletedVal = match.team1SourceMatchId ? matchups.find(m => m.id === match.team1SourceMatchId) : null;
      if (source1DeletedVal && (!source1DeletedVal.winnerId || !source1DeletedVal.isCompleted)) {
        if (match.team1Id !== null) {
          match.team1Id = null;
          match.winnerId = null;
          match.isCompleted = false;
          match.score1 = 0;
          match.score2 = 0;
          match.races = createBlankRaces(null, match.team2Id);
          changed = true;
        }
      }

      const source2DeletedVal = match.team2SourceMatchId ? matchups.find(m => m.id === match.team2SourceMatchId) : null;
      if (source2DeletedVal && (!source2DeletedVal.winnerId || !source2DeletedVal.isCompleted)) {
        if (match.team2Id !== null) {
          match.team2Id = null;
          match.winnerId = null;
          match.isCompleted = false;
          match.score1 = 0;
          match.score2 = 0;
          match.races = createBlankRaces(match.team1Id, null);
          changed = true;
        }
      }
    }
  }

  // Ensure overall Champion is set at the Grand Final
  const grandFinal = matchups.find(m => m.id === 'match_final');
  if (grandFinal && grandFinal.isCompleted && grandFinal.winnerId) {
    // Set champion (will be resolved in state)
  }
}
