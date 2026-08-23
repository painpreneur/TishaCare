"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from "recharts";

interface Point {
  date: string;
  score: number;
}

export default function QuestionnaireScoreChart({
  data,
  domain,
  thresholds = [],
  color = "#4f6bfe",
}: {
  data: Point[];
  domain: [number, number];
  thresholds?: number[];
  color?: string;
}) {
  if (data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef1f4" />
        <XAxis dataKey="date" fontSize={12} stroke="#9aa4b2" />
        <YAxis domain={domain} fontSize={12} stroke="#9aa4b2" />
        <Tooltip />
        {thresholds.map((t) => (
          <ReferenceLine key={t} y={t} stroke="#d8dee6" strokeDasharray="4 4" />
        ))}
        <Line type="monotone" dataKey="score" stroke={color} strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
