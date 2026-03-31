import React from "react";
import { AnalyzedMove, GameReviewSummary } from "../types";
import {
  ChevronLeft,
  ChevronRight,
  FastForward,
  Rewind,
  Info,
  Lightbulb,
  BookOpen,
  Volume2,
} from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { useState, useEffect } from "react";
import { Chess } from "chess.js";
import { GoogleGenAI, Modality } from "@google/genai";

let ai: GoogleGenAI | null = null;
try {
  if (process.env.GEMINI_API_KEY) {
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
} catch (e) {
  console.warn("Failed to initialize Gemini API:", e);
}

interface ReviewPanelProps {
  moves: AnalyzedMove[];
  currentMoveIndex: number;
  onMoveSelect: (index: number) => void;
  summary: GameReviewSummary | null;
  currentFen: string;
  onPreviewState: (state: {fen: string, move?: [string, string]} | null) => void;
}

export const ReviewPanel = ({
  moves,
  currentMoveIndex,
  onMoveSelect,
  summary,
  currentFen,
  onPreviewState,
}: ReviewPanelProps) => {
  const currentMove = moves[currentMoveIndex];
  const [bookMoves, setBookMoves] = useState<any[]>([]);
  const [isLoadingBook, setIsLoadingBook] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const playPraggVoice = async (text: string) => {
    if (isPlayingAudio) return;
    if (!ai) {
      alert("Gemini API key is not configured. Please add it to your Vercel environment variables to use the voice feature.");
      return;
    }
    setIsPlayingAudio(true);
    try {
      const prompt = `Read this chess move explanation as Praggnanandhaa, the young Indian chess grandmaster. Be casual, enthusiastic, and insightful. Use a slight Indian English cadence if possible, but keep it natural. Text: "${text}"`;
      
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: 'Zephyr' },
              },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        const binaryString = atob(base64Audio);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const numSamples = bytes.length / 2;
        const audioBuffer = audioContext.createBuffer(1, numSamples, 24000);
        const channelData = audioBuffer.getChannelData(0);
        
        const dataView = new DataView(bytes.buffer);
        for (let i = 0; i < numSamples; i++) {
          channelData[i] = dataView.getInt16(i * 2, true) / 32768.0;
        }
        
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.onended = () => setIsPlayingAudio(false);
        source.start();
      } else {
        setIsPlayingAudio(false);
      }
    } catch (error) {
      console.error("TTS failed:", error);
      setIsPlayingAudio(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout;

    const fetchBookMoves = async () => {
      if (!currentFen) return;
      setIsLoadingBook(true);
      try {
        const res = await fetch(
          `https://explorer.lichess.ovh/master?fen=${encodeURIComponent(
            currentFen,
          )}`,
        );
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        const data = await res.json();
        if (isMounted) {
          setBookMoves(data.moves?.slice(0, 5) || []);
        }
      } catch (e) {
        // Silently fail to avoid console spam on rate limits
        if (isMounted) setBookMoves([]);
      } finally {
        if (isMounted) setIsLoadingBook(false);
      }
    };

    // Debounce the fetch to avoid rate limiting
    timeoutId = setTimeout(fetchBookMoves, 300);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [currentFen]);

  const handlePreview = (san: string) => {
    try {
      const chess = new Chess(currentFen);
      chess.move(san);
      onPreviewState({ fen: chess.fen() });
    } catch (e) {
      // invalid move
    }
  };

  const handlePreviewBestMove = () => {
    if (!currentMove || !currentMove.bestMove) return;
    try {
      // Best move is evaluated from the position BEFORE the current move was made
      const chess = new Chess(currentMove.fenBefore);
      // bestMove is in LAN (e.g. "e2e4")
      const moveObj = chess.move(currentMove.bestMove);
      onPreviewState({
        fen: chess.fen(),
        move: [moveObj.from, moveObj.to]
      });
    } catch (e) {
      console.error(e);
    }
  };

  const clearPreview = () => {
    onPreviewState(null);
  };

  const getClassificationColor = (classification?: string) => {
    switch (classification) {
      case "Brilliant":
        return "text-purple-500 drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]";
      case "Great":
        return "text-blue-400";
      case "Best":
        return "text-yellow-400";
      case "Excellent":
        return "text-green-500";
      case "Good":
        return "text-green-400";
      case "Book":
        return "text-gray-400";
      case "Inaccuracy":
        return "text-yellow-400";
      case "Mistake":
        return "text-orange-500";
      case "Blunder":
        return "text-red-500";
      default:
        return "text-gray-400";
    }
  };

  const getClassificationIcon = (classification?: string) => {
    switch (classification) {
      case "Brilliant":
        return "‼";
      case "Great":
        return "!";
      case "Best":
        return "⭐";
      case "Excellent":
        return "✓";
      case "Good":
        return "";
      case "Book":
        return "📖";
      case "Inaccuracy":
        return "?!";
      case "Mistake":
        return "?";
      case "Blunder":
        return "??";
      default:
        return "";
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#262421] text-white rounded-lg overflow-hidden shadow-xl">
      {/* Header */}
      <div className="p-4 border-b border-[#3c3a38] flex flex-col gap-2">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold">Game Review</h2>
          {summary && summary.openingName && (
            <div className="text-sm text-gray-400 flex items-center gap-1">
              <BookOpen size={14} />
              {summary.openingName}
            </div>
          )}
        </div>
        {summary && (
          <div className="flex justify-between text-sm mt-2 bg-[#302e2b] p-3 rounded-md">
            <div className="flex flex-col items-center flex-1 border-r border-[#3c3a38]">
              <span className="text-gray-400 mb-1">White</span>
              <span className="font-bold text-green-400 text-lg">
                {summary.accuracy.w}%
              </span>
              <span className="text-xs text-gray-500 mt-1">
                ~{summary.estimatedRating.w}
              </span>
            </div>
            <div className="flex flex-col items-center flex-1">
              <span className="text-gray-400 mb-1">Black</span>
              <span className="font-bold text-green-400 text-lg">
                {summary.accuracy.b}%
              </span>
              <span className="text-xs text-gray-500 mt-1">
                ~{summary.estimatedRating.b}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Move List */}
      <div className="flex-1 overflow-y-auto p-2 bg-[#302e2b] no-scrollbar">
        <div className="grid grid-cols-[auto_1fr_1fr] gap-x-2 gap-y-1 text-sm font-mono">
          {moves.reduce((acc: React.ReactNode[], move, i) => {
            if (i % 2 === 0) {
              const whiteMove = move;
              const blackMove = moves[i + 1];
              acc.push(
                <div
                  key={`num-${i}`}
                  className="text-gray-500 text-right pr-2 py-1 select-none"
                >
                  {whiteMove.moveNumber}.
                </div>,
              );

              const renderMove = (
                m: AnalyzedMove | undefined,
                index: number,
              ) => {
                if (!m) return <div key={`empty-${index}`} className="py-1" />;
                const isSelected = currentMoveIndex === index;
                return (
                  <div
                    key={`move-${index}`}
                    onClick={() => onMoveSelect(index)}
                    className={twMerge(
                      clsx(
                        "py-1 px-2 rounded cursor-pointer hover:bg-[#3c3a38] transition-colors flex justify-between items-center",
                        isSelected && "bg-[#4b4845] font-bold",
                      ),
                    )}
                  >
                    <span>{m.san}</span>
                    <span
                      className={clsx(
                        "text-xs font-bold",
                        getClassificationColor(m.classification),
                      )}
                    >
                      {getClassificationIcon(m.classification)}
                    </span>
                  </div>
                );
              };

              acc.push(renderMove(whiteMove, i));
              acc.push(renderMove(blackMove, i + 1));
            }
            return acc;
          }, [])}
        </div>
      </div>

      {/* Current Move Details */}
      {currentMove && (
        <div className="p-4 bg-[#262421] border-t border-[#3c3a38]">
          <div className="flex items-center gap-2 mb-2">
            <span
              className={clsx(
                "text-lg font-bold flex items-center gap-1",
                getClassificationColor(currentMove.classification),
              )}
            >
              {getClassificationIcon(currentMove.classification)}
              {currentMove.classification || "Good"}
            </span>
            <span className="text-gray-400 text-sm">
              {currentMove.color === "w" ? "White" : "Black"} played{" "}
              {currentMove.san}
            </span>
            <button
              onClick={() => playPraggVoice(currentMove.explanation)}
              disabled={isPlayingAudio}
              className="ml-auto p-1.5 bg-[#3c3a38] hover:bg-[#4b4845] rounded-full text-gray-300 transition-colors disabled:opacity-50"
              title="Listen to Praggnanandhaa's analysis"
            >
              {isPlayingAudio ? (
                <div className="w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Volume2 size={16} className="text-green-400" />
              )}
            </button>
          </div>
          <p className="text-sm text-gray-300 mb-4">
            {currentMove.explanation}
          </p>

          {currentMove.classification !== "Best" &&
            currentMove.classification !== "Brilliant" &&
            currentMove.classification !== "Book" &&
            currentMove.bestMove && (
              <div 
                className="mt-2 flex flex-col text-sm text-green-400 bg-green-950/40 p-3 rounded-lg border border-green-500/30 shadow-lg relative overflow-hidden cursor-pointer hover:bg-green-900/50 transition-colors"
                onMouseEnter={handlePreviewBestMove}
                onMouseLeave={clearPreview}
              >
                <div className="absolute inset-0 bg-green-500/5 animate-pulse pointer-events-none" />
                <div className="flex items-center gap-3 relative z-10">
                  <div className="bg-green-500/20 p-1.5 rounded-full">
                    <Lightbulb size={18} className="text-green-400" />
                  </div>
                  <span className="font-medium">
                    Best move was <strong className="font-bold text-green-300 text-base ml-1">{currentMove.bestMove}</strong>
                  </span>
                </div>
                {currentMove.principalVariation && currentMove.principalVariation.length > 0 && (
                  <div className="mt-2 text-xs text-green-200/70 pl-10 relative z-10">
                    <span className="font-semibold text-green-300/80">Line: </span>
                    {currentMove.principalVariation.slice(0, 4).join(" ")}
                  </div>
                )}
              </div>
            )}
        </div>
      )}

      {/* Book Moves Section */}
      {bookMoves.length > 0 && (
        <div className="p-4 bg-[#262421] border-t border-[#3c3a38]">
          <div className="flex items-center gap-2 mb-3 text-gray-300">
            <BookOpen size={18} />
            <h3 className="font-semibold text-sm">Masters Database</h3>
          </div>
          <div className="flex flex-col gap-2">
            {bookMoves.map((move) => {
              const total = move.white + move.draws + move.black;
              const wPct = (move.white / total) * 100;
              const dPct = (move.draws / total) * 100;
              const bPct = (move.black / total) * 100;

              return (
                <div
                  key={move.san}
                  className="flex items-center gap-3 text-sm hover:bg-[#3c3a38] p-1.5 rounded cursor-pointer transition-colors"
                  onMouseEnter={() => handlePreview(move.san)}
                  onMouseLeave={clearPreview}
                >
                  <span className="font-mono font-bold w-12">{move.san}</span>
                  <span className="text-gray-500 w-12 text-right text-xs">
                    {total > 1000 ? (total / 1000).toFixed(1) + "k" : total}
                  </span>
                  <div className="flex-1 h-2 flex rounded overflow-hidden opacity-80">
                    <div
                      style={{ width: `${wPct}%` }}
                      className="bg-white"
                      title={`White: ${Math.round(wPct)}%`}
                    />
                    <div
                      style={{ width: `${dPct}%` }}
                      className="bg-gray-500"
                      title={`Draw: ${Math.round(dPct)}%`}
                    />
                    <div
                      style={{ width: `${bPct}%` }}
                      className="bg-black"
                      title={`Black: ${Math.round(bPct)}%`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="p-4 bg-[#21201d] flex flex-col gap-3 border-t border-[#3c3a38]">
        <div className="flex justify-center gap-4">
          <button
            onClick={() => onMoveSelect(-1)}
            disabled={currentMoveIndex < 0}
            className="p-2 rounded hover:bg-[#3c3a38] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Start of game"
          >
            <Rewind size={20} />
          </button>
          <button
            onClick={() => onMoveSelect(currentMoveIndex - 1)}
            disabled={currentMoveIndex < 0}
            className="p-2 rounded hover:bg-[#3c3a38] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Previous Move"
          >
            <ChevronLeft size={24} />
          </button>
          <button
            onClick={() => onMoveSelect(currentMoveIndex + 1)}
            disabled={currentMoveIndex >= moves.length - 1}
            className="p-2 rounded hover:bg-[#3c3a38] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Next Move"
          >
            <ChevronRight size={24} />
          </button>
          <button
            onClick={() => onMoveSelect(moves.length - 1)}
            disabled={currentMoveIndex >= moves.length - 1}
            className="p-2 rounded hover:bg-[#3c3a38] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="End of game"
          >
            <FastForward size={20} />
          </button>
        </div>
        <div className="flex justify-center gap-2">
          <button
            onClick={() => onMoveSelect(currentMoveIndex - 1)}
            disabled={currentMoveIndex < 0}
            className="px-4 py-2 bg-[#3c3a38] hover:bg-[#4b4845] rounded text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-1"
          >
            Previous
          </button>
          <button
            onMouseDown={handlePreviewBestMove}
            onMouseUp={clearPreview}
            onMouseLeave={clearPreview}
            onTouchStart={handlePreviewBestMove}
            onTouchEnd={clearPreview}
            disabled={!currentMove || !currentMove.bestMove}
            className="px-4 py-2 bg-green-600/80 hover:bg-green-500 rounded text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-1 text-white"
          >
            Show Best Move
          </button>
          <button
            onClick={() => onMoveSelect(currentMoveIndex + 1)}
            disabled={currentMoveIndex >= moves.length - 1}
            className="px-4 py-2 bg-[#3c3a38] hover:bg-[#4b4845] rounded text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-1"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};
