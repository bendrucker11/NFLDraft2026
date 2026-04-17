export type PlayerRow = {
  id: string;
  name: string;
  position: PlayerPosition;
};

export type PlayerPosition =
  | "QB"
  | "RB"
  | "WR"
  | "TE"
  | "OL"
  | "Edge"
  | "DT"
  | "LB"
  | "CB"
  | "S";

export type PickInput = {
  playerId: string;
  isFirstRound: boolean;
  isTop10: boolean;
};

export type SubmissionWithPicks = {
  id: string;
  username: string;
  created_at: string;
  picks: {
    player_id: string;
    is_first_round: boolean;
    is_top_10: boolean;
    players: { name: string; position: PlayerPosition } | null;
  }[];
};
