import { analyzeGame } from "./chess";

async function test() {
  const pgn = "1. e4 e5 2. Nf3 Nc6";
  console.log("Starting analysis...");
  try {
    const result = await analyzeGame(pgn, (p) => console.log("Progress:", p));
    console.log("Analysis complete:", result);
  } catch (e) {
    console.error("Error:", e);
  }
}

test();
