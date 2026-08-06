"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface Point {
  date: string;
  mood: number;
}

export default function MoodChart({ data }: { data: Point[] }) {
  if (data.length === 0) {
    return <p className="empty">Пока нет данных чек-инов.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef1f4" />
        <XAxis dataKey="date" fontSize={12} stroke="#9aa4b2" />
        <YAxis domain={[-2, 2]} ticks={[-2, -1, 0, 1, 2]} fontSize={12} stroke="#9aa4b2" />
        <Tooltip />
        <Line type="monotone" dataKey="mood" stroke="#4f6bfe" strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
