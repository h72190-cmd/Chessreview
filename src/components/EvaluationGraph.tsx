import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface EvaluationGraphProps {
  evalHistory: number[];
  currentIndex: number;
  onHover?: (index: number) => void;
}

export const EvaluationGraph = ({
  evalHistory,
  currentIndex,
  onHover,
}: EvaluationGraphProps) => {
  const data = evalHistory.map((val, index) => ({
    move: index,
    evaluation: Math.max(-10, Math.min(10, val)), // Clamp for better visualization
  }));

  // Calculate percentage of positive space to set gradient offset
  const maxEval = Math.max(...data.map(d => d.evaluation), 0);
  const minEval = Math.min(...data.map(d => d.evaluation), 0);
  const range = maxEval - minEval;
  const offset = range === 0 ? 0.5 : maxEval / range;

  return (
    <div className="w-full h-32 bg-[#262421] rounded-lg p-2 shadow-lg">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          onMouseMove={(e) => {
            if (e.activeTooltipIndex !== undefined && onHover) {
              onHover(Number(e.activeTooltipIndex));
            }
          }}
          margin={{ top: 5, right: 0, left: 0, bottom: 5 }}
        >
          <defs>
            <linearGradient id="splitColor" x1="0" y1="0" x2="0" y2="1">
              <stop offset={offset} stopColor="#ffffff" stopOpacity={0.8} />
              <stop offset={offset} stopColor="#000000" stopOpacity={0.8} />
            </linearGradient>
          </defs>
          <XAxis dataKey="move" hide />
          <YAxis domain={[-10, 10]} hide />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const val = payload[0].value as number;
                return (
                  <div className="bg-[#333] text-white text-xs p-1 rounded shadow">
                    {val > 0 ? `+${val.toFixed(1)}` : val.toFixed(1)}
                  </div>
                );
              }
              return null;
            }}
          />
          <ReferenceLine y={0} stroke="#555" strokeDasharray="3 3" />
          <ReferenceLine x={currentIndex} stroke="#4ade80" strokeWidth={2} />
          <Area
            type="monotone"
            dataKey="evaluation"
            stroke="#888"
            strokeWidth={1}
            fill="url(#splitColor)"
            isAnimationActive={true}
            animationDuration={500}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
