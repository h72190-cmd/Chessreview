export class Engine {
  private worker: Worker | null = null;
  private isReady = false;
  private callbacks: Record<string, Function> = {};
  private currentAnalysisResolve: Function | null = null;
  private initPromise: Promise<void> | null = null;
  private evaluationQueue: Array<{
    fen: string;
    depth: number;
    resolve: Function;
    reject: Function;
  }> = [];
  private isEvaluating = false;

  async init() {
    if (this.isReady) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise<void>((resolve, reject) => {
      try {
        this.worker = new Worker('/stockfish.js');
        
        const timeout = setTimeout(() => {
          console.warn("Stockfish init timed out!");
          if (this.worker) {
            this.worker.terminate();
            this.worker = null;
          }
          this.initPromise = null;
          reject(new Error("Stockfish init timed out"));
        }, 30000);

        this.worker.onerror = (err) => {
          console.warn("Worker error:", err);
          clearTimeout(timeout);
          this.initPromise = null;
          reject(err);
        };
        this.worker.onmessageerror = (err) => {
          console.warn("Worker message error:", err);
        };

        this.worker.onmessage = (e) => {
          const line = e.data;
          // console.log("Stockfish:", line);
          if (typeof line === "string" && line === "readyok") {
            this.isReady = true;
            this.initPromise = null;
            clearTimeout(timeout);
            resolve();
          } else if (typeof line === "string" && line.startsWith("info ")) {
            if (this.callbacks["info"]) {
              this.callbacks["info"](line);
            }
          } else if (typeof line === "string" && line.startsWith("bestmove")) {
            if (this.currentAnalysisResolve) {
              this.currentAnalysisResolve(line);
              this.currentAnalysisResolve = null;
            }
          }
        };

        this.worker.postMessage("uci");
        this.worker.postMessage("isready");
      } catch (error) {
        console.warn("Failed to initialize Stockfish:", error);
        this.initPromise = null;
        reject(error);
      }
    });

    return this.initPromise;
  }

  evaluatePosition(
    fen: string,
    depth: number = 15,
  ): Promise<{
    bestMove: string;
    evaluation: number;
    mate: number | null;
    line: string[];
  }> {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        return resolve({ bestMove: "", evaluation: 0, mate: null, line: [] });
      }
      this.evaluationQueue.push({ fen, depth, resolve, reject });
      this.processQueue();
    });
  }

  private processQueue() {
    if (this.isEvaluating || this.evaluationQueue.length === 0 || !this.worker) return;

    this.isEvaluating = true;
    const { fen, depth, resolve } = this.evaluationQueue.shift()!;

    let currentEval = 0;
    let currentMate: number | null = null;
    let currentLine: string[] = [];

    const timeout = setTimeout(() => {
      console.error("Stockfish evaluation timed out for FEN:", fen);
      this.isEvaluating = false;
      resolve({
        bestMove: "",
        evaluation: currentEval,
        mate: currentMate,
        line: currentLine,
      });
      this.processQueue();
    }, 15000); // 15 seconds timeout

    this.callbacks["info"] = (line: string) => {
      const scoreMatch = line.match(/score (cp|mate) (-?\d+)/);
      if (scoreMatch) {
        const type = scoreMatch[1];
        const value = parseInt(scoreMatch[2], 10);

        // Stockfish outputs score from the perspective of the side to move
        const isWhiteTurn = fen.includes(" w ");
        const multiplier = isWhiteTurn ? 1 : -1;

        if (type === "cp") {
          currentEval = (value / 100) * multiplier; // Convert centipawns to pawns
          currentMate = null;
        } else if (type === "mate") {
          currentMate = value * multiplier;
          currentEval = value > 0 ? 100 * multiplier : -100 * multiplier;
        }
      }

      const pvMatch = line.match(/ pv (.+)/);
      if (pvMatch) {
        currentLine = pvMatch[1].split(" ");
      }
    };

    this.currentAnalysisResolve = (line: string) => {
      clearTimeout(timeout);
      const bestMoveMatch = line.match(/bestmove (\S+)/);
      const bestMove = bestMoveMatch ? bestMoveMatch[1] : "";
      this.isEvaluating = false;
      resolve({
        bestMove,
        evaluation: currentEval,
        mate: currentMate,
        line: currentLine,
      });
      this.processQueue();
    };

    this.worker.postMessage(`position fen ${fen}`);
    this.worker.postMessage(`go depth ${depth}`);
  }

  stop() {
    if (this.worker) {
      this.worker.postMessage("stop");
    }
  }

  quit() {
    if (this.worker) {
      this.worker.postMessage("quit");
      this.worker.terminate();
      this.worker = null;
      this.isReady = false;
      this.initPromise = null;
      this.evaluationQueue = [];
      this.isEvaluating = false;
    }
  }
}

export const engine = new Engine();
