import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

// Industry average cold email reply rate is ~5-8%
const INDUSTRY_AVG = 6;

// Aggregates raw email activity into daily reply-rate data
function buildChartData(recentActivity) {
  if (!recentActivity || recentActivity.length === 0) {
    // Show placeholder data so the chart isn't empty
    const now = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (6 - i));
      return {
        date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        sent: 0,
        replied: 0,
        rate: 0,
      };
    });
  }

  // Group by date
  const grouped = {};
  for (const email of recentActivity) {
    const day = new Date(email.sentAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    if (!grouped[day]) grouped[day] = { sent: 0, replied: 0 };
    grouped[day].sent++;
    if (email.status === 'replied') grouped[day].replied++;
  }

  return Object.entries(grouped).map(([date, { sent, replied }]) => ({
    date,
    sent,
    replied,
    rate: sent > 0 ? Math.round((replied / sent) * 100) : 0,
  }));
}

export default function ReplyRateChart({ recentActivity, replyRate }) {
  const data = buildChartData(recentActivity);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-medium">Reply Rate</CardTitle>
            <CardDescription>Last 7 days vs industry average ({INDUSTRY_AVG}%)</CardDescription>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-foreground">{replyRate ?? 0}%</p>
            <p className="text-xs text-muted-foreground">your rate</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="rateGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#5c7cfa" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#5c7cfa" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
              />
              <YAxis
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
                unit="%"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '0.5rem',
                  fontSize: '12px',
                }}
              />
              <ReferenceLine
                y={INDUSTRY_AVG}
                stroke="#94a3b8"
                strokeDasharray="4 4"
                label={{
                  value: 'Industry avg',
                  position: 'right',
                  fontSize: 10,
                  fill: '#94a3b8',
                }}
              />
              <Area
                type="monotone"
                dataKey="rate"
                stroke="#5c7cfa"
                strokeWidth={2}
                fill="url(#rateGradient)"
                name="Reply Rate"
                unit="%"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
