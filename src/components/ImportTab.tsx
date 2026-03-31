import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Search, Download, Upload, Trophy, Target, Zap, Clock, Calendar, ChevronRight } from "lucide-react";
import { clsx } from "clsx";

interface ImportTabProps {
  onImport: (pgn: string) => void;
}

interface GameData {
  id: string;
  pgn: string;
  white: string;
  black: string;
  whiteRating: number;
  blackRating: number;
  result: "win" | "loss" | "draw";
  date: Date;
  timeClass: string;
  opponent: string;
  userColor: "white" | "black";
}

export const ImportTab = ({ onImport }: ImportTabProps) => {
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [games, setGames] = useState<GameData[]>([]);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const cached = localStorage.getItem("chess_review_cached_games");
    const lastUser = localStorage.getItem("chess_review_last_user");
    if (cached && lastUser) {
      try {
        const parsed = JSON.parse(cached);
        const withDates = parsed.map((g: any) => ({ ...g, date: new Date(g.date) }));
        setGames(withDates);
        setUsername(lastUser);
      } catch (e) {
        // ignore
      }
    }
  }, []);

  const fetchGames = async () => {
    if (!username.trim()) return;
    setIsLoading(true);
    setError("");
    try {
      // 1. Get archives
      const archivesRes = await fetch(`https://api.chess.com/pub/player/${username.toLowerCase()}/games/archives`);
      if (!archivesRes.ok) throw new Error("User not found or API error");
      const archivesData = await archivesRes.json();
      
      if (!archivesData.archives || archivesData.archives.length === 0) {
        throw new Error("No games found for this user");
      }

      // 2. Fetch the most recent archive (last in the array)
      const lastArchiveUrl = archivesData.archives[archivesData.archives.length - 1];
      const gamesRes = await fetch(lastArchiveUrl);
      if (!gamesRes.ok) throw new Error("Failed to fetch games");
      const gamesData = await gamesRes.json();

      if (!gamesData.games || gamesData.games.length === 0) {
        throw new Error("No games in the recent archive");
      }

      // 3. Parse and format games
      const parsedGames: GameData[] = gamesData.games.map((g: any) => {
        const isWhite = g.white.username.toLowerCase() === username.toLowerCase();
        const userColor = isWhite ? "white" : "black";
        const opponent = isWhite ? g.black.username : g.white.username;
        
        // Determine result
        let result: "win" | "loss" | "draw" = "draw";
        const userResultCode = isWhite ? g.white.result : g.black.result;
        if (userResultCode === "win") result = "win";
        else if (["checkmated", "timeout", "resigned", "abandoned", "lose"].includes(userResultCode)) result = "loss";
        else result = "draw";

        return {
          id: g.url || Math.random().toString(),
          pgn: g.pgn,
          white: g.white.username,
          black: g.black.username,
          whiteRating: g.white.rating,
          blackRating: g.black.rating,
          result,
          date: new Date(g.end_time * 1000),
          timeClass: g.time_class,
          opponent,
          userColor
        };
      });

      // Sort by date descending
      parsedGames.sort((a, b) => b.date.getTime() - a.date.getTime());
      
      setGames(parsedGames);
      
      // Cache locally
      localStorage.setItem("chess_review_cached_games", JSON.stringify(parsedGames));
      localStorage.setItem("chess_review_last_user", username);

    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        onImport(content);
      }
    };
    reader.readAsText(file);
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const filteredGames = games.filter(g => filter === "all" || g.timeClass === filter);
  
  const wins = filteredGames.filter(g => g.result === "win").length;
  const losses = filteredGames.filter(g => g.result === "loss").length;
  const draws = filteredGames.filter(g => g.result === "draw").length;
  const total = filteredGames.length;
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto p-4 w-full">
      {/* Header */}
      <div className="bg-[#262421] p-6 rounded-xl shadow-lg border border-[#3c3a38]">
        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
          <Download className="text-green-400" /> Import from Chess.com
        </h2>
        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="Enter Chess.com Username" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchGames()}
              className="flex-1 bg-[#3c3a38] text-white px-4 py-3 rounded-lg border border-[#4b4845] focus:outline-none focus:border-green-500 transition-colors min-w-0"
            />
            <button 
              onClick={fetchGames}
              disabled={isLoading || !username.trim()}
              className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white px-4 md:px-6 py-3 rounded-lg font-bold transition-colors flex items-center justify-center gap-2 shrink-0"
            >
              {isLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Search size={20} />}
              <span className="hidden sm:inline">Fetch Games</span>
            </button>
          </div>
          <div className="flex items-center gap-4">
            <div className="h-px bg-[#4b4845] flex-1"></div>
            <span className="text-gray-400 text-sm uppercase font-bold">or</span>
            <div className="h-px bg-[#4b4845] flex-1"></div>
          </div>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="w-full bg-[#3c3a38] hover:bg-[#4b4845] text-white px-6 py-3 rounded-lg font-bold transition-colors flex items-center justify-center gap-2 border border-[#4b4845]"
          >
            <Upload size={20} />
            <span>Upload PGN File</span>
          </button>
          <input type="file" accept=".pgn" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
        </div>
        {error && <p className="text-red-400 mt-3 text-sm">{error}</p>}
      </div>

      {/* Stats & Filters */}
      {games.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-[#262421] p-4 rounded-xl border border-[#3c3a38] flex flex-col items-center justify-center">
            <span className="text-gray-400 text-sm mb-1">Win Rate</span>
            <div className="text-3xl font-bold text-white flex items-center gap-2">
              <Trophy className="text-yellow-400" size={24} /> {winRate}%
            </div>
            <div className="text-xs text-gray-500 mt-2">{wins}W {losses}L {draws}D</div>
          </div>
          
          <div className="md:col-span-3 bg-[#262421] p-4 rounded-xl border border-[#3c3a38] flex items-center gap-2 overflow-x-auto no-scrollbar">
            <FilterButton active={filter === "all"} onClick={() => setFilter("all")} label="All Games" />
            <FilterButton active={filter === "blitz"} onClick={() => setFilter("blitz")} icon={<Zap size={16} />} label="Blitz" />
            <FilterButton active={filter === "rapid"} onClick={() => setFilter("rapid")} icon={<Clock size={16} />} label="Rapid" />
            <FilterButton active={filter === "bullet"} onClick={() => setFilter("bullet")} icon={<Target size={16} />} label="Bullet" />
          </div>
        </div>
      )}

      {/* Games List */}
      <div className="flex flex-col gap-3 pb-8">
        {filteredGames.map((game) => (
          <div key={game.id} className="bg-[#262421] p-4 rounded-xl border border-[#3c3a38] hover:border-[#4b4845] transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full overflow-hidden">
            <div className="flex items-center gap-4 w-full sm:w-auto min-w-0">
              <div className={clsx(
                "w-12 h-12 rounded-lg flex items-center justify-center font-bold text-lg shrink-0",
                game.result === "win" ? "bg-green-500/20 text-green-400" :
                game.result === "loss" ? "bg-red-500/20 text-red-400" :
                "bg-gray-500/20 text-gray-400"
              )}>
                {game.result === "win" ? "W" : game.result === "loss" ? "L" : "D"}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 sm:gap-2 text-base sm:text-lg">
                  <div className="flex items-baseline gap-1 min-w-0">
                    <span className={clsx("truncate block max-w-[70px] sm:max-w-[150px]", game.userColor === "white" ? "text-white font-bold" : "text-gray-400")} title={game.white}>{game.white}</span>
                    <span className="text-xs font-normal text-gray-400 shrink-0">({game.whiteRating})</span>
                  </div>
                  <span className="text-gray-500 text-sm shrink-0">vs</span>
                  <div className="flex items-baseline gap-1 min-w-0">
                    <span className={clsx("truncate block max-w-[70px] sm:max-w-[150px]", game.userColor === "black" ? "text-white font-bold" : "text-gray-400")} title={game.black}>{game.black}</span>
                    <span className="text-xs font-normal text-gray-400 shrink-0">({game.blackRating})</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs sm:text-sm text-gray-500 mt-1">
                  <span className="flex items-center gap-1 shrink-0"><Calendar size={14} /> {game.date.toLocaleDateString()}</span>
                  <span className="capitalize flex items-center gap-1 shrink-0">
                    {game.timeClass === "blitz" ? <Zap size={14} /> : game.timeClass === "rapid" ? <Clock size={14} /> : <Target size={14} />}
                    {game.timeClass}
                  </span>
                </div>
              </div>
            </div>
            <button 
              onClick={() => onImport(game.pgn)}
              className="w-full sm:w-auto bg-[#3c3a38] hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 group shrink-0"
            >
              Review <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        ))}
        
        {isLoading && (
          <div className="py-12 flex justify-center">
            <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        
        {!isLoading && games.length === 0 && username && !error && (
          <div className="text-center py-12 text-gray-400">
            No games found. Try fetching.
          </div>
        )}
      </div>
    </div>
  );
};

const FilterButton = ({ active, onClick, icon, label }: any) => (
  <button
    onClick={onClick}
    className={clsx(
      "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap",
      active ? "bg-[#4b4845] text-white" : "text-gray-400 hover:bg-[#3c3a38] hover:text-gray-200"
    )}
  >
    {icon}
    {label}
  </button>
);
