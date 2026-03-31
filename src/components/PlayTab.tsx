import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Globe, Monitor, Users, Zap, Clock, Settings, Link as LinkIcon, Copy, Check, ChevronLeft, User } from "lucide-react";
import { ChessBoard } from "./ChessBoard";
import { Chess } from "chess.js";
import { engine } from "../utils/engine";

type PlayMode = "menu" | "online" | "computer" | "friend" | "playing";
type TimeControl = "1 min" | "3 min" | "5 min" | "10 min" | "15 min" | "Custom";

export const PlayTab = () => {
  const [mode, setMode] = useState<PlayMode>("menu");
  const [timeControl, setTimeControl] = useState<TimeControl>("10 min");
  const [aiDifficulty, setAiDifficulty] = useState(5);
  const [isMatchmaking, setIsMatchmaking] = useState(false);
  const [gameLink, setGameLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [matchTime, setMatchTime] = useState(0);

  const [gameState, setGameState] = useState<"idle" | "playing_ai">("idle");
  const [chess] = useState(new Chess());
  const [fen, setFen] = useState(chess.fen());
  const [isEngineThinking, setIsEngineThinking] = useState(false);

  // Matchmaking timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isMatchmaking) {
      interval = setInterval(() => {
        setMatchTime(prev => prev + 1);
      }, 1000);
    } else {
      setMatchTime(0);
    }
    return () => clearInterval(interval);
  }, [isMatchmaking]);

  const handlePlayOnline = () => {
    setIsMatchmaking(true);
    // Mock matchmaking
    setTimeout(() => {
      setIsMatchmaking(false);
      console.log("Matchmaking is simulated in this demo!");
    }, 5000);
  };

  const handlePlayComputer = async () => {
    setGameState("playing_ai");
    setMode("playing");
    chess.reset();
    setFen(chess.fen());
    try {
      await engine.init();
    } catch (e) {
      console.error("Failed to initialize engine", e);
      setGameState("idle");
      setMode("menu");
    }
  };

  const handleCreateLink = () => {
    const id = Math.random().toString(36).substring(2, 9);
    setGameLink(`https://chessreview.pro/play/${id}`);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(gameLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleMove = (source: string, target: string) => {
    if (gameState !== "playing_ai" || isEngineThinking) return false;

    try {
      const move = chess.move({ from: source, to: target, promotion: "q" });
      if (move) {
        setFen(chess.fen());
        if (!chess.isGameOver()) {
          makeEngineMove();
        }
        return true;
      }
    } catch (e) {
      return false;
    }
    return false;
  };

  const makeEngineMove = async () => {
    setIsEngineThinking(true);
    try {
      // Depth based on difficulty: 1 -> depth 1, 10 -> depth 15
      const depth = Math.max(1, Math.floor(aiDifficulty * 1.5));
      const { bestMove } = await engine.evaluatePosition(chess.fen(), depth);
      if (bestMove) {
        const from = bestMove.substring(0, 2);
        const to = bestMove.substring(2, 4);
        const promotion = bestMove.length > 4 ? bestMove[4] : undefined;
        chess.move({ from, to, promotion });
        setFen(chess.fen());
      }
    } catch (e) {
      console.error("Engine error", e);
    } finally {
      setIsEngineThinking(false);
    }
  };

  const renderMenu = () => (
    <motion.div 
      key="menu"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="flex flex-col gap-4 w-full max-w-md mx-auto"
    >
      <MenuCard 
        icon={<Globe size={32} className="text-[#81B64C]" />}
        title="Play Online"
        description="Play vs a person of similar skill"
        onClick={() => setMode("online")}
      />
      <MenuCard 
        icon={<Monitor size={32} className="text-[#81B64C]" />}
        title="Play vs Computer"
        description="Challenge a bot from Easy to Master"
        onClick={() => setMode("computer")}
      />
      <MenuCard 
        icon={<Users size={32} className="text-[#81B64C]" />}
        title="Play a Friend"
        description="Invite a friend to a game"
        onClick={() => setMode("friend")}
      />
    </motion.div>
  );

  const renderOnline = () => (
    <motion.div 
      key="online"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col gap-6 w-full max-w-md mx-auto bg-[#3C3B39] p-6 rounded-xl"
    >
      <div className="flex items-center gap-4 mb-2">
        <button onClick={() => setMode("menu")} className="text-gray-400 hover:text-white">
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-2xl font-bold text-white">Play Online</h2>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <TimeButton icon={<Zap size={18}/>} label="1 min" type="Bullet" active={timeControl === "1 min"} onClick={() => setTimeControl("1 min")} />
        <TimeButton icon={<Zap size={18}/>} label="3 min" type="Blitz" active={timeControl === "3 min"} onClick={() => setTimeControl("3 min")} />
        <TimeButton icon={<Zap size={18}/>} label="5 min" type="Blitz" active={timeControl === "5 min"} onClick={() => setTimeControl("5 min")} />
        <TimeButton icon={<Clock size={18}/>} label="10 min" type="Rapid" active={timeControl === "10 min"} onClick={() => setTimeControl("10 min")} />
        <TimeButton icon={<Clock size={18}/>} label="15 min" type="Rapid" active={timeControl === "15 min"} onClick={() => setTimeControl("15 min")} />
        <TimeButton icon={<Settings size={18}/>} label="Custom" type="Custom" active={timeControl === "Custom"} onClick={() => setTimeControl("Custom")} />
      </div>

      <button 
        onClick={handlePlayOnline}
        disabled={isMatchmaking}
        className="w-full bg-[#81B64C] hover:bg-[#92c75d] text-white font-bold py-4 rounded-xl shadow-[0_4px_0_rgba(0,0,0,0.2)] transition-all active:translate-y-1 active:shadow-none text-xl mt-4 relative overflow-hidden"
      >
        {isMatchmaking ? (
          <div className="flex items-center justify-center gap-3">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span>Searching... {matchTime}s</span>
          </div>
        ) : (
          "Play"
        )}
      </button>

      {isMatchmaking && (
        <div className="text-center text-gray-400 text-sm animate-pulse">
          Estimated wait: 0:05
        </div>
      )}
    </motion.div>
  );

  const renderComputer = () => (
    <motion.div 
      key="computer"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col gap-6 w-full max-w-md mx-auto bg-[#3C3B39] p-6 rounded-xl"
    >
      <div className="flex items-center gap-4 mb-2">
        <button onClick={() => setMode("menu")} className="text-gray-400 hover:text-white">
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-2xl font-bold text-white">Play vs Computer</h2>
      </div>

      <div className="flex flex-col items-center gap-4 py-4">
        <div className="w-24 h-24 bg-[#262421] rounded-2xl flex items-center justify-center shadow-inner">
          <Monitor size={48} className="text-[#81B64C]" />
        </div>
        <div className="text-center">
          <h3 className="text-xl font-bold text-white">Stockfish</h3>
          <p className="text-gray-400">Level {aiDifficulty}</p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex justify-between text-sm text-gray-400 font-bold uppercase">
          <span>Beginner</span>
          <span>Master</span>
        </div>
        <input 
          type="range" 
          min="1" 
          max="10" 
          value={aiDifficulty}
          onChange={(e) => setAiDifficulty(parseInt(e.target.value))}
          className="w-full h-2 bg-[#262421] rounded-lg appearance-none cursor-pointer accent-[#81B64C]"
        />
      </div>

      <button 
        onClick={handlePlayComputer}
        className="w-full bg-[#81B64C] hover:bg-[#92c75d] text-white font-bold py-4 rounded-xl shadow-[0_4px_0_rgba(0,0,0,0.2)] transition-all active:translate-y-1 active:shadow-none text-xl mt-4"
      >
        Play Computer
      </button>
    </motion.div>
  );

  const renderFriend = () => (
    <motion.div 
      key="friend"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col gap-6 w-full max-w-md mx-auto bg-[#3C3B39] p-6 rounded-xl"
    >
      <div className="flex items-center gap-4 mb-2">
        <button onClick={() => setMode("menu")} className="text-gray-400 hover:text-white">
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-2xl font-bold text-white">Play a Friend</h2>
      </div>

      <div className="flex flex-col gap-4">
        <div className="bg-[#262421] p-4 rounded-lg border border-[#4b4845]">
          <label className="block text-sm font-bold text-gray-400 mb-2 uppercase">Invite Link</label>
          {gameLink ? (
            <div className="flex gap-2">
              <input 
                type="text" 
                readOnly 
                value={gameLink} 
                className="flex-1 bg-[#3C3B39] text-white px-3 py-2 rounded border border-[#4b4845] outline-none"
              />
              <button 
                onClick={copyLink}
                className="bg-[#4b4845] hover:bg-[#5c5955] p-2 rounded transition-colors text-white"
              >
                {copied ? <Check size={20} className="text-[#81B64C]" /> : <Copy size={20} />}
              </button>
            </div>
          ) : (
            <button 
              onClick={handleCreateLink}
              className="w-full bg-[#4b4845] hover:bg-[#5c5955] text-white font-bold py-3 rounded transition-colors flex items-center justify-center gap-2"
            >
              <LinkIcon size={18} />
              Create Game Link
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="h-full flex flex-col md:flex-row items-center justify-start md:justify-center gap-4 md:gap-8 w-full overflow-y-auto no-scrollbar pb-10">
      {/* Left side: Board */}
      <div className="w-full max-w-[500px] shrink-0">
        <div className="flex items-center gap-3 mb-3 px-2">
          <div className="w-8 h-8 bg-[#262421] rounded flex items-center justify-center">
            {gameState === "playing_ai" ? <Monitor size={16} className="text-gray-400" /> : <User size={16} className="text-gray-400" />}
          </div>
          <div className="font-bold text-gray-200">
            {gameState === "playing_ai" ? `Stockfish Level ${aiDifficulty}` : "Opponent"}
          </div>
        </div>
        
        <ChessBoard fen={fen} onMove={handleMove} />
        
        <div className="flex items-center gap-3 mt-3 px-2">
          <div className="w-8 h-8 bg-[#262421] rounded flex items-center justify-center">
            <User size={16} className="text-gray-400" />
          </div>
          <div className="font-bold text-gray-200">You</div>
        </div>
      </div>

      {/* Right side: Menu */}
      <div className="w-full max-w-md">
        {gameState === "idle" ? (
          <AnimatePresence mode="wait">
            {mode === "menu" && renderMenu()}
            {mode === "online" && renderOnline()}
            {mode === "computer" && renderComputer()}
            {mode === "friend" && renderFriend()}
          </AnimatePresence>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-[#3C3B39] p-6 rounded-xl flex flex-col gap-4"
          >
            <h2 className="text-2xl font-bold text-white text-center">Game in Progress</h2>
            <div className="flex justify-between items-center bg-[#262421] p-4 rounded-lg">
              <span className="text-gray-400">Status</span>
              <span className="font-bold text-[#81B64C]">
                {isEngineThinking ? "Stockfish is thinking..." : "Your turn"}
              </span>
            </div>
            <button 
              onClick={() => {
                setGameState("idle");
                setMode("menu");
                chess.reset();
                setFen(chess.fen());
              }}
              className="w-full bg-[#4b4845] hover:bg-[#5c5955] text-white font-bold py-3 rounded-xl transition-colors mt-4"
            >
              Resign & Leave
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
};

const MenuCard = ({ icon, title, description, onClick }: any) => (
  <button 
    onClick={onClick}
    className="bg-[#3C3B39] hover:bg-[#4b4845] p-6 rounded-xl flex items-center gap-6 transition-all transform hover:-translate-y-1 hover:shadow-lg text-left w-full border border-transparent hover:border-[#4b4845]"
  >
    <div className="bg-[#262421] p-4 rounded-xl shadow-inner">
      {icon}
    </div>
    <div>
      <h3 className="text-2xl font-bold text-white mb-1">{title}</h3>
      <p className="text-gray-400 text-sm">{description}</p>
    </div>
  </button>
);

const TimeButton = ({ icon, label, type, active, onClick }: any) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center justify-center p-3 rounded-xl transition-colors border-2 ${
      active 
        ? "bg-[#262421] border-[#81B64C] text-white" 
        : "bg-[#262421] border-transparent text-gray-400 hover:bg-[#302e2b] hover:text-gray-200"
    }`}
  >
    <div className="mb-1">{icon}</div>
    <span className="font-bold text-sm">{label}</span>
    <span className="text-[10px] uppercase tracking-wider opacity-70">{type}</span>
  </button>
);
