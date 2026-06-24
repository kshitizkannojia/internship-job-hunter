import { useMemo } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts'
import Card from '../ui/Card'
import AnimatedCounter from '../ui/AnimatedCounter'

export default function ReplyChart({ stats }) {
  const data = useMemo(() => {
    const daily = stats.dailyChart
    if (daily?.length) return daily.map(d => ({ date: d.date, rate: d.rate }))
    const now = new Date()
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now); d.setDate(d.getDate() - (6 - i))
      return { date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), rate: 0 }
    })
  }, [stats])

  return (
    <Card delay={0.25} className="p-5">
      <div className="flex items-center justify-between mb-1">
        <div>
          <h3 className="text-[11px] font-medium uppercase tracking-wider text-[#555]">Reply Rate</h3>
          <p className="text-[11px] mt-0.5 text-[#444]">Last 7 days vs industry avg (6%)</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold"><AnimatedCounter value={stats.replyRate || 0} />%</p>
          <p className="text-[10px] text-[#444]">your rate</p>
        </div>
      </div>
      <div className="h-[208px] mt-2">
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="purpleGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#9333ea" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#9333ea" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#1a1a1a" strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fill: '#444', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#444', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
            <Tooltip
              contentStyle={{ background: '#111', border: '1px solid #222', borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: '#e5e5e5' }}
              itemStyle={{ color: '#888' }}
              formatter={(v) => [`${v}%`, 'Reply Rate']}
            />
            <ReferenceLine y={6} stroke="#333" strokeDasharray="4 4" label={{ value: 'Industry avg', position: 'right', fill: '#555', fontSize: 10 }} />
            <Area type="monotone" dataKey="rate" stroke="#9333ea" strokeWidth={2} fill="url(#purpleGrad)" dot={{ fill: '#9333ea', stroke: '#000', strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
