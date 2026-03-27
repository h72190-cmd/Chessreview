import { Chessboard } from "react-chessboard";
import { Chess, Square } from "chess.js";
import React, { useState, useEffect } from "react";

interface ChessBoardProps {
  fen: string;
  onMove?: (sourceSquare: string, targetSquare: string) => boolean;
  orientation?: "white" | "black";
  lastMove?: [string, string];
  suggestedMove?: [string, string];
  isMistake?: boolean;
}

export const ChessBoard = ({
  fen,
  onMove,
  orientation = "white",
  lastMove,
  suggestedMove,
  isMistake,
}: ChessBoardProps) => {
  const [chess] = useState(new Chess());
  const [moveFrom, setMoveFrom] = useState<string | null>(null);
  const [optionSquares, setOptionSquares] = useState<Record<string, React.CSSProperties>>({});

  useEffect(() => {
    chess.load(fen);
    setMoveFrom(null);
    setOptionSquares({});
  }, [fen, chess]);

  const getMoveOptions = (square: string) => {
    const moves = chess.moves({
      square: square as Square,
      verbose: true,
    });
    if (moves.length === 0) {
      setOptionSquares({});
      return false;
    }

    const newSquares: Record<string, React.CSSProperties> = {};
    moves.forEach((move) => {
      const isCapture = move.flags.includes("c") || move.flags.includes("e");
      newSquares[move.to] = {
        background: isCapture
          ? "radial-gradient(transparent 0%, transparent 79%, rgba(220, 50, 50, 0.8) 80%, rgba(220, 50, 50, 0.8) 90%, transparent 90%)"
          : "radial-gradient(circle, rgba(0,0,0,.15) 25%, transparent 25%)",
      };
    });
    newSquares[square] = {
      background: "radial-gradient(circle, rgba(0, 100, 255, 0.3) 50%, transparent 50%)",
    };
    setOptionSquares(newSquares);
    return true;
  };

  const onSquareClick = ({ square }: { square: string }) => {
    if (!onMove) return; // Only allow interaction if onMove is provided

    if (!moveFrom) {
      const hasMoveOptions = getMoveOptions(square);
      if (hasMoveOptions) setMoveFrom(square);
      return;
    }

    // Try to move
    const success = onMove(moveFrom, square);
    if (success) {
      setMoveFrom(null);
      setOptionSquares({});
    } else {
      // If invalid move, check if we clicked another piece of ours
      const hasMoveOptions = getMoveOptions(square);
      if (hasMoveOptions) setMoveFrom(square);
      else {
        setMoveFrom(null);
        setOptionSquares({});
      }
    }
  };

  const onPieceDrag = ({ square }: { square: string }) => {
    if (!onMove) return;
    getMoveOptions(square);
    setMoveFrom(square);
  };

  const onPieceDrop = ({ sourceSquare, targetSquare }: { sourceSquare: string, targetSquare: string }) => {
    setMoveFrom(null);
    setOptionSquares({});
    if (onMove) {
      return onMove(sourceSquare, targetSquare);
    }
    return false;
  };

  const customSquareStyles: Record<string, React.CSSProperties> = {
    ...optionSquares,
  };

  if (lastMove) {
    const color = isMistake ? "rgba(255, 0, 0, 0.5)" : "rgba(255, 255, 0, 0.4)";
    customSquareStyles[lastMove[0]] = {
      ...customSquareStyles[lastMove[0]],
      backgroundColor: color,
    };
    customSquareStyles[lastMove[1]] = {
      ...customSquareStyles[lastMove[1]],
      backgroundColor: color,
    };
  }

  if (suggestedMove) {
    customSquareStyles[suggestedMove[0]] = {
      ...customSquareStyles[suggestedMove[0]],
      backgroundColor: "rgba(0, 255, 0, 0.4)",
    };
    customSquareStyles[suggestedMove[1]] = {
      ...customSquareStyles[suggestedMove[1]],
      backgroundColor: "rgba(0, 255, 0, 0.4)",
    };
  }

  return (
    <div className="w-full max-w-[500px] aspect-square mx-auto rounded-md overflow-hidden shadow-sm">
      <Chessboard
        options={{
          position: fen,
          onPieceDrop: onPieceDrop,
          onPieceDrag: onPieceDrag,
          onSquareClick: onSquareClick,
          boardOrientation: orientation,
          darkSquareStyle: { backgroundColor: "#769656" },
          lightSquareStyle: { backgroundColor: "#EEEED2" },
          squareStyles: customSquareStyles,
          animationDurationInMs: 200
        }}
      />
    </div>
  );
};
