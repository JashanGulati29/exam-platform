import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function PassFailChart({ data }) {
  const chartData = data.map((d) => ({
    name: d.title?.length > 12 ? `${d.title.slice(0, 12)}...` : d.title,
    Passed: d.passed,
    Failed: d.failed,
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
        <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
        <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
        <Tooltip
          contentStyle={{ background: '#0F1526', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 12 }}
          labelStyle={{ color: '#fff' }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="Passed" stackId="a" fill="#34D399" radius={[0, 0, 4, 4]} />
        <Bar dataKey="Failed" stackId="a" fill="#F87171" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
