import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function ScoreTrendChart({ data }) {
  const chartData = data.map((d) => ({
    name: d.title?.length > 14 ? `${d.title.slice(0, 14)}...` : d.title,
    percentage: Number(d.percentage),
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
        <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
        <YAxis stroke="#64748b" fontSize={11} domain={[0, 100]} />
        <Tooltip
          contentStyle={{ background: '#0F1526', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 12 }}
          labelStyle={{ color: '#fff' }}
        />
        <Line type="monotone" dataKey="percentage" stroke="#818CF8" strokeWidth={2.5} dot={{ r: 3, fill: '#818CF8' }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
