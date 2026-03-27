import React, { useState, useEffect } from "react";
import { ChessBoard } from "./components/ChessBoard";
import { ReviewPanel } from "./components/ReviewPanel";
import { EvaluationBar } from "./components/EvaluationBar";
import { EvaluationGraph } from "./components/EvaluationGraph";
import { PlayTab } from "./components/PlayTab";
import { ImportTab } from "./components/ImportTab";
import { analyzeGame } from "./utils/chess";
import { AnalyzedMove, GameReviewSummary } from "./types";
import { Upload, Play, Settings, User, Copy, Check, Download } from "lucide-react";
import { motion } from "framer-motion";

export default function App() {
  const [pgnInput, setPgnInput] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [moves, setMoves] = useState<AnalyzedMove[]>([]);
  const [summary, setSummary] = useState<GameReviewSummary | null>(null);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
  const [copiedFen, setCopiedFen] = useState(false);
  const [previewState, setPreviewState] = useState<{fen: string, move?: [string, string]} | null>(null);
  const [activeTab, setActiveTab] = useState<
    "home" | "play" | "review" | "import"
  >("home");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeTab !== "review" || moves.length === 0) return;
      if (e.key === "ArrowLeft") {
        setCurrentMoveIndex((prev) => Math.max(-1, prev - 1));
      } else if (e.key === "ArrowRight") {
        setCurrentMoveIndex((prev) => Math.min(moves.length - 1, prev + 1));
      } else if (e.key === "ArrowUp") {
        setCurrentMoveIndex(-1);
      } else if (e.key === "ArrowDown") {
        setCurrentMoveIndex(moves.length - 1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTab, moves.length]);

  const handleAnalyze = async (pgnToAnalyze: string = pgnInput) => {
    if (!pgnToAnalyze.trim()) return;
    setIsAnalyzing(true);
    setProgress(0);
    try {
      const { moves, summary } = await analyzeGame(pgnToAnalyze, setProgress);
      setMoves(moves);
      setSummary(summary);
      setCurrentMoveIndex(-1);
      setActiveTab("review");
    } catch (error: any) {
      console.error("Failed to analyze game:", error);
      alert(`Analysis failed: ${error.message || "Invalid PGN"}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCopyFen = () => {
    navigator.clipboard.writeText(currentFen);
    setCopiedFen(true);
    setTimeout(() => setCopiedFen(false), 2000);
  };

  const currentMove = currentMoveIndex >= 0 ? moves[currentMoveIndex] : null;
  const currentFen = currentMove 
    ? currentMove.fenAfter 
    : (moves.length > 0 ? moves[0].fenBefore : "start");
  const currentEval = currentMove
    ? currentMove.evaluation
    : summary
      ? summary.evalHistory[0]
      : 0.2;
  const currentMate = currentMove ? currentMove.mate : null;

  const lastMoveSquares: [string, string] | undefined = currentMove
    ? [currentMove.lan.substring(0, 2), currentMove.lan.substring(2, 4)]
    : undefined;

  const displayFen = previewState ? previewState.fen : currentFen;
  const displayLastMove = previewState ? undefined : lastMoveSquares;
  const displaySuggestedMove = previewState?.move;
  const isMistake = currentMove?.classification === "Mistake" || currentMove?.classification === "Blunder";

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[#312E2B] text-white font-sans overflow-hidden">
      {/* Side Navigation (Desktop) */}
      <div className="hidden md:flex h-full w-20 bg-[#262421] border-r border-[#3c3a38] flex-col items-center py-6 gap-8 z-50 shrink-0">
        <NavButton
          icon={<Upload />}
          label="Home"
          active={activeTab === "home"}
          onClick={() => setActiveTab("home")}
        />
        <NavButton
          icon={<Play />}
          label="Play"
          active={activeTab === "play"}
          onClick={() => setActiveTab("play")}
        />
        <NavButton
          icon={<Settings />}
          label="Review"
          active={activeTab === "review"}
          onClick={() => setActiveTab("review")}
        />
        <NavButton
          icon={<Download />}
          label="Import"
          active={activeTab === "import"}
          onClick={() => setActiveTab("import")}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 pb-20 md:pb-4 relative">
        {activeTab === "home" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-md mx-auto mt-10"
          >
            <h1 className="text-3xl font-bold mb-6 text-center text-green-400">
              Chess Review Pro
            </h1>
            <div className="bg-[#262421] p-6 rounded-lg shadow-xl">
              <h2 className="text-xl font-semibold mb-4">Analyze Your Game</h2>
              <textarea
                className="w-full h-40 bg-[#3c3a38] text-white p-3 rounded border border-[#4b4845] focus:outline-none focus:border-green-500 resize-none mb-4 font-mono text-sm"
                placeholder="Paste your PGN here..."
                value={pgnInput}
                onChange={(e) => setPgnInput(e.target.value)}
              />
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing || !pgnInput.trim()}
                className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-4 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
              >
                {isAnalyzing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Analyzing... {Math.round(progress * 100)}%
                  </>
                ) : (
                  <>
                    <Upload size={20} />
                    Start Review
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}

        {activeTab === "review" && moves.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="h-full flex flex-col md:flex-row gap-4 max-w-6xl mx-auto"
          >
            {/* Left Column: Board & Eval */}
            <div className="flex-1 flex flex-col gap-4">
              <div className="flex flex-col gap-2 max-w-[540px] mx-auto w-full">
                <div className="flex gap-2 justify-center items-stretch">
                  <EvaluationBar evaluation={currentEval} mate={currentMate} />
                  <div className="flex-1 max-w-[500px]">
                    <ChessBoard
                      fen={displayFen}
                      lastMove={displayLastMove}
                      suggestedMove={displaySuggestedMove}
                      isMistake={isMistake}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-[#262421] p-2 rounded border border-[#3c3a38]">
                  <span className="text-xs font-bold text-gray-500">FEN</span>
                  <div className="text-xs text-gray-400 font-mono truncate flex-1 select-all" title={displayFen}>
                    {displayFen}
                  </div>
                  <button
                    onClick={handleCopyFen}
                    className="p-1 hover:bg-[#3c3a38] rounded text-gray-400 hover:text-white transition-colors"
                    title="Copy FEN"
                  >
                    {copiedFen ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
              {summary && (
                <EvaluationGraph
                  evalHistory={summary.evalHistory}
                  currentIndex={currentMoveIndex + 1}
                  onHover={(index) => setCurrentMoveIndex(index - 1)}
                />
              )}
            </div>

            {/* Right Column: Review Panel */}
            <div className="w-full md:w-80 h-[400px] md:h-auto flex flex-col">
              <ReviewPanel
                moves={moves}
                currentMoveIndex={currentMoveIndex}
                onMoveSelect={setCurrentMoveIndex}
                summary={summary}
                currentFen={currentFen}
                onPreviewState={setPreviewState}
              />
            </div>
          </motion.div>
        )}

        {activeTab === "review" && moves.length === 0 && (
          <div className="flex items-center justify-center h-full text-gray-400">
            <p>No game analyzed yet. Go to Home to paste a PGN.</p>
          </div>
        )}

        {activeTab === "play" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="h-full w-full"
          >
            <PlayTab />
          </motion.div>
        )}

        {activeTab === "import" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="h-full w-full overflow-y-auto"
          >
            <ImportTab onImport={(pgn) => {
              setPgnInput(pgn);
              handleAnalyze(pgn);
            }} />
          </motion.div>
        )}
      </div>

      {/* Bottom Navigation (Mobile) */}
      <div className="fixed bottom-0 w-full bg-[#262421] border-t border-[#3c3a38] flex justify-around py-3 px-4 md:hidden z-50">
        <NavButton
          icon={<Upload />}
          label="Home"
          active={activeTab === "home"}
          onClick={() => setActiveTab("home")}
        />
        <NavButton
          icon={<Play />}
          label="Play"
          active={activeTab === "play"}
          onClick={() => setActiveTab("play")}
        />
        <NavButton
          icon={<Settings />}
          label="Review"
          active={activeTab === "review"}
          onClick={() => setActiveTab("review")}
        />
        <NavButton
          icon={<Download />}
          label="Import"
          active={activeTab === "import"}
          onClick={() => setActiveTab("import")}
        />
      </div>
    </div>
  );
}

const NavButton = ({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center gap-1 transition-colors ${active ? "text-green-400" : "text-gray-400 hover:text-white"}`}
  >
    {icon}
    <span className="text-[10px] uppercase font-bold">{label}</span>
  </button>
);
