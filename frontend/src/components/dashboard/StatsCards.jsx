import { Building2, Send, MessageSquare, CalendarCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const statConfig = [
  {
    key: 'totalCompanies',
    label: 'Companies Targeted',
    icon: Building2,
    color: 'text-accent-600 bg-accent-50 dark:bg-accent-900/20',
  },
  {
    key: 'emailsSent',
    label: 'Emails Sent',
    icon: Send,
    color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
  },
  {
    key: 'repliesReceived',
    label: 'Replies Received',
    icon: MessageSquare,
    color: 'text-green-600 bg-green-50 dark:bg-green-900/20',
  },
  {
    key: 'interviewsBooked',
    label: 'Interviews Booked',
    icon: CalendarCheck,
    color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20',
  },
];

export default function StatsCards({ stats }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {statConfig.map(({ key, label, icon: Icon, color }) => (
        <Card key={key}>
          <CardContent className="flex items-center gap-4 p-5">
            <div className={`rounded-lg p-2.5 ${color}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {stats?.[key] ?? '—'}
              </p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
