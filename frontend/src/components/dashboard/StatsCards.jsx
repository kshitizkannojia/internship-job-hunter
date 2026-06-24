import { motion } from 'framer-motion'
import { Building2, Mail, MessageSquare, CalendarCheck } from 'lucide-react'
import Card from '../ui/Card'
import Skeleton from '../ui/Skeleton'
import AnimatedCounter from '../ui/AnimatedCounter'

const cardMeta = [
  { key: 'companies', label: 'Companies', icon: Building2, sub: s => `${s.verifiedCompanies || 0} verified` },
  { key: 'sent', label: 'Sent', icon: Mail, sub: s => `${s.drafts || 0} drafts pending` },
  { key: 'replies', label: 'Replies', icon: MessageSquare, sub: s => `${s.replyRate || 0}% rate` },
  { key: 'interviews', label: 'Interviews', icon: CalendarCheck, sub: () => 'booked' },
]

const values = (s) => ({
  companies: s.totalCompanies || 0,
  sent: s.emailsSent || 0,
  replies: s.replies || 0,
  interviews: s.interviews || 0,
})

export default function StatsCards({ stats, loading }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} delay={i * 0.08} className="p-5">
            <Skeleton className="h-3 w-20 mb-3" />
            <Skeleton className="h-7 w-12" />
          </Card>
        ))}
      </div>
    )
  }

  const vals = values(stats)

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cardMeta.map((card, i) => (
        <Card key={card.key} delay={i * 0.08} className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium uppercase tracking-wider text-[#555]">{card.label}</p>
            <motion.div
              whileHover={{ scale: 1.15, rotate: -5 }}
              className="rounded-lg p-1.5 bg-accent-500/[0.08] transition-all"
            >
              <card.icon className="h-3.5 w-3.5 text-accent-400" />
            </motion.div>
          </div>
          <p className="mt-2 text-2xl font-bold">
            <AnimatedCounter value={vals[card.key]} />
          </p>
          <p className="mt-0.5 text-[11px] text-[#444]">{card.sub(stats)}</p>
        </Card>
      ))}
    </div>
  )
}
