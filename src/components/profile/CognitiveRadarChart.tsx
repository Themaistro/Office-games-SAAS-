"use client";

import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from "recharts";

interface RadarChartProps {
  data: {
    subject: string;
    A: number;
    fullMark: number;
  }[];
}

export default function CognitiveRadarChart({ data }: RadarChartProps) {
  return (
    <div className="bg-card/50 backdrop-blur-md border border-border/50 p-6 rounded-3xl shadow-sm flex flex-col items-center">
      <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2 w-full text-left">
        Cognitive Strengths
      </h3>
      
      <div className="w-full h-[250px] sm:h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
            <PolarGrid stroke="hsl(var(--border))" />
            <PolarAngleAxis 
              dataKey="subject" 
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12, fontWeight: 600 }} 
            />
            <PolarRadiusAxis 
              angle={30} 
              domain={[0, 100]} 
              tick={false} 
              axisLine={false} 
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: "hsl(var(--card))", 
                borderColor: "hsl(var(--border))",
                borderRadius: "0.75rem",
                fontWeight: "bold"
              }}
              itemStyle={{ color: "hsl(var(--primary))" }}
            />
            <Radar 
              name="Proficiency" 
              dataKey="A" 
              stroke="hsl(var(--primary))" 
              fill="hsl(var(--primary))" 
              fillOpacity={0.4} 
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
