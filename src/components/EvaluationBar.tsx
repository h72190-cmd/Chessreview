import { motion } from "framer-motion";

interface EvaluationBarProps {
  evaluation: number;
  mate: number | null;
  orientation?: "white" | "black";
}

export const EvaluationBar = ({
  evaluation,
  mate,
  orientation = "white",
}: EvaluationBarProps) => {
  // Calculate percentage height for white
  // A typical scale is from -5 to +5 pawns
  let whitePercentage = 50;

  if (mate !== null) {
    if (mate > 0) {
      whitePercentage = 100;
    } else {
      whitePercentage = 0;
    }
  } else {
    // Sigmoid-like function or simple linear scale
    const maxEval = 5;
    const clampedEval = Math.max(-maxEval, Math.min(maxEval, evaluation));
    whitePercentage = 50 + (clampedEval / maxEval) * 50;
  }

  const isWhiteBottom = orientation === "white";

  return (
    <div className="w-6 h-full bg-[#333] rounded-sm overflow-hidden flex flex-col relative border border-[#444]">
      {/* White bar */}
      <motion.div
        className="absolute w-full bg-[#eee] z-10"
        initial={{ height: "50%" }}
        animate={{
          height: `${whitePercentage}%`,
          bottom: isWhiteBottom ? 0 : "auto",
          top: isWhiteBottom ? "auto" : 0,
        }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
      />

      {/* Black bar is the background */}
      <div className="absolute w-full h-full bg-[#333] z-0" />

      {/* Text overlay */}
      <div className="absolute w-full h-full flex flex-col justify-between items-center py-1 z-20 pointer-events-none">
        <span
          className={`text-[10px] font-bold ${whitePercentage > 50 ? "text-[#333]" : "text-[#eee]"}`}
        >
          {mate !== null
            ? mate > 0
              ? `M${mate}`
              : ""
            : evaluation > 0
              ? `+${evaluation.toFixed(1)}`
              : ""}
        </span>
        <span
          className={`text-[10px] font-bold ${whitePercentage < 50 ? "text-[#eee]" : "text-[#333]"}`}
        >
          {mate !== null
            ? mate < 0
              ? `M${Math.abs(mate)}`
              : ""
            : evaluation < 0
              ? `${evaluation.toFixed(1)}`
              : ""}
        </span>
      </div>
    </div>
  );
};
