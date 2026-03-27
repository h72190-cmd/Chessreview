export type MoveClassification =
  | "Brilliant"
  | "Great"
  | "Best"
  | "Excellent"
  | "Good"
  | "Book"
  | "Inaccuracy"
  | "Mistake"
  | "Blunder"
  | "Miss";

export interface AnalyzedMove {
  moveNumber: number;
  color: "w" | "b";
  san: string;
  lan: string;
  fenBefore: string;
  fenAfter: string;
  evaluation: number; // in pawns, positive for white advantage
  mate: number | null;
  bestMove: string;
  classification?: MoveClassification;
  explanation?: string;
  evalDiff?: number;
  principalVariation?: string[];
}

export interface GameReviewSummary {
  accuracy: {
    w: number;
    b: number;
  };
  estimatedRating: {
    w: number;
    b: number;
  };
  blunders: { w: number; b: number };
  mistakes: { w: number; b: number };
  inaccuracies: { w: number; b: number };
  greatMoves: { w: number; b: number };
  brilliantMoves: { w: number; b: number };
  evalHistory: number[]; // array of evaluations
  openingName?: string;
}
