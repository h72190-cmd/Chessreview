import { Chess } from "chess.js";
import { engine } from "./engine";
import { AnalyzedMove, GameReviewSummary, MoveClassification } from "../types";

const OPENINGS: Record<string, string> = {
  "e4": "King's Pawn Game",
  "e4 e5": "Open Game",
  "e4 e5 Nf3": "King's Knight Opening",
  "e4 e5 Nf3 Nc6": "King's Knight Opening: Normal Variation",
  "e4 e5 Nf3 Nc6 Bb5": "Ruy Lopez",
  "e4 e5 Nf3 Nc6 Bc4": "Italian Game",
  "e4 c5": "Sicilian Defense",
  "e4 e6": "French Defense",
  "e4 c6": "Caro-Kann Defense",
  "d4": "Queen's Pawn Game",
  "d4 d5": "Closed Game",
  "d4 d5 c4": "Queen's Gambit",
  "d4 Nf6": "Indian Defense",
  "d4 Nf6 c4 e6": "Nimzo-Indian Defense",
  "d4 Nf6 c4 g6": "King's Indian Defense",
  "c4": "English Opening",
  "Nf3": "Zukertort Opening",
  "Nf3 d5": "Réti Opening",
};

export const classifyMove = (
  evalBefore: number,
  evalAfter: number,
  isWhite: boolean,
  isMateBefore: number | null,
  isMateAfter: number | null,
  isBookMove: boolean
): {
  classification: MoveClassification;
  explanation: string;
  evalDiff: number;
} => {
  if (isBookMove) {
    return {
      classification: "Book",
      explanation: "Standard opening theory. We've seen this a million times!",
      evalDiff: 0,
    };
  }

  // Simple classification logic based on eval difference
  // evalBefore and evalAfter are always from white's perspective
  const diff = isWhite ? evalAfter - evalBefore : evalBefore - evalAfter;

  let classification: MoveClassification = "Good";
  let explanation = "A solid move.";

  if (isMateAfter !== null && isMateBefore === null) {
    if ((isWhite && isMateAfter > 0) || (!isWhite && isMateAfter < 0)) {
      classification = "Brilliant";
      explanation = "Wow, brilliant! You found the forced mate. Amazing calculation!";
    } else {
      classification = "Blunder";
      explanation = "Oh no... you just walked into a forced mate. Tough luck!";
    }
  } else if (diff <= -3) {
    classification = "Blunder";
    explanation = "Ouch, that's a massive blunder. You're giving away a huge advantage here.";
  } else if (diff <= -1.5) {
    classification = "Mistake";
    explanation = "Ah, that's a mistake. The position gets quite tricky for you now.";
  } else if (diff <= -0.5) {
    classification = "Inaccuracy";
    explanation = "A bit inaccurate. There were definitely sharper ways to play this.";
  } else if (diff >= 1.5) {
    classification = "Brilliant";
    explanation = "Brilliant move! Really creative and hard to see. Fantastic chess!";
  } else if (diff >= 0.8) {
    classification = "Great";
    explanation = "Great move! You're really putting the pressure on your opponent.";
  } else if (diff >= -0.1) {
    classification = "Best";
    explanation = "Spot on! That's the best move in the position.";
  } else {
    classification = "Excellent";
    explanation = "Excellent play. Very solid and strong.";
  }

  return { classification, explanation, evalDiff: diff };
};

export const analyzeGame = async (
  pgn: string,
  onProgress: (progress: number) => void,
): Promise<{ moves: AnalyzedMove[]; summary: GameReviewSummary }> => {
  const chess = new Chess();
  chess.loadPgn(pgn);
  const history = chess.history({ verbose: true });
  const sanHistory = chess.history();

  const analyzedMoves: AnalyzedMove[] = [];
  const tempChess = new Chess();

  await engine.init();

  let prevEval = 0.2; // Starting eval is slightly better for white
  let prevMate: number | null = null;
  let prevBestMove = "";
  let prevLine: string[] = [];
  const evalHistory: number[] = [prevEval];

  const summary: GameReviewSummary = {
    accuracy: { w: 100, b: 100 },
    estimatedRating: { w: 1200, b: 1200 },
    blunders: { w: 0, b: 0 },
    mistakes: { w: 0, b: 0 },
    inaccuracies: { w: 0, b: 0 },
    greatMoves: { w: 0, b: 0 },
    brilliantMoves: { w: 0, b: 0 },
    evalHistory: [prevEval],
  };

  let totalDiffW = 0;
  let totalDiffB = 0;

  // Get initial position evaluation
  const initialEval = await engine.evaluatePosition(tempChess.fen(), 10);
  prevEval = initialEval.evaluation;
  prevMate = initialEval.mate;
  prevBestMove = initialEval.bestMove;
  prevLine = initialEval.line;

  let currentOpening = "";

  for (let i = 0; i < history.length; i++) {
    const move = history[i];
    const fenBefore = tempChess.fen();

    const evalBefore = prevEval;
    const mateBefore = prevMate;
    const bestMove = prevBestMove;
    const principalVariation = prevLine;

    tempChess.move(move);
    const fenAfter = tempChess.fen();

    const currentMoves = sanHistory.slice(0, i + 1).join(" ");
    const isBookMove = OPENINGS[currentMoves] !== undefined;
    if (isBookMove) {
      currentOpening = OPENINGS[currentMoves];
    }

    // Evaluate position AFTER the move to see how the evaluation changed
    const {
      evaluation: evalAfter,
      mate: mateAfter,
      bestMove: nextBestMove,
      line: nextLine,
    } = await engine.evaluatePosition(fenAfter, 10);

    const isWhite = move.color === "w";

    const { classification, explanation, evalDiff } = classifyMove(
      evalBefore,
      evalAfter,
      isWhite,
      mateBefore,
      mateAfter,
      isBookMove
    );

    analyzedMoves.push({
      moveNumber: Math.floor(i / 2) + 1,
      color: move.color,
      san: move.san,
      lan: move.lan,
      fenBefore,
      fenAfter,
      evaluation: evalAfter,
      mate: mateAfter,
      bestMove,
      classification,
      explanation,
      evalDiff,
      principalVariation,
    });

    evalHistory.push(evalAfter);
    summary.evalHistory.push(evalAfter);

    // Update summary stats
    if (classification === "Blunder") summary.blunders[move.color]++;
    if (classification === "Mistake") summary.mistakes[move.color]++;
    if (classification === "Inaccuracy") summary.inaccuracies[move.color]++;
    if (classification === "Great") summary.greatMoves[move.color]++;
    if (classification === "Brilliant") summary.brilliantMoves[move.color]++;

    if (isWhite) totalDiffW += Math.abs(Math.min(0, evalDiff));
    else totalDiffB += Math.abs(Math.min(0, evalDiff));

    prevEval = evalAfter;
    prevMate = mateAfter;
    prevBestMove = nextBestMove;
    prevLine = nextLine;

    onProgress((i + 1) / history.length);
  }

  // Simple accuracy calculation (not exactly like chess.com, but a reasonable approximation)
  summary.accuracy.w = Math.max(0, Math.round(100 - totalDiffW * 2.5));
  summary.accuracy.b = Math.max(0, Math.round(100 - totalDiffB * 2.5));

  // Estimated rating calculation based on accuracy and blunders
  const calculateRating = (accuracy: number, blunders: number, mistakes: number) => {
    let baseRating = accuracy * 20; // 100% -> 2000
    baseRating -= blunders * 100;
    baseRating -= mistakes * 50;
    return Math.max(400, Math.min(3000, Math.round(baseRating / 50) * 50));
  };

  summary.estimatedRating.w = calculateRating(summary.accuracy.w, summary.blunders.w, summary.mistakes.w);
  summary.estimatedRating.b = calculateRating(summary.accuracy.b, summary.blunders.b, summary.mistakes.b);
  
  if (currentOpening) {
    summary.openingName = currentOpening;
  }

  return { moves: analyzedMoves, summary };
};
