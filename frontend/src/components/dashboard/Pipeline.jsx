import { motion } from 'framer-motion'
import { Search, ShieldCheck, Pencil, Send, BarChart3 } from 'lucide-react'
import Card from '../ui/Card'

const stages = [
  { key: 'scraping', label: 'Scraping', icon: Search },
  { key: 'verifying', label: 'Verifying', icon: ShieldCheck },
  { key: 'writing', label: 'Writing', icon: Pencil },
  { key: 'sending', label: 'Sending', icon: Send },
  { key: 'tracking', label: 'Tracking', icon: BarChart3 },
]

const stageMap = { scraper: 'scraping', writer: 'writing', sender: 'sending' }

export default function Pipeline({ agentRun }) {
  const isRunning = agentRun?.status === 'running'
  const isDone = agentRun?.status === 'completed'
  const activeKey = isRunning ? (stageMap[agentRun?.type] || 'scraping') : null
  const activeIdx = activeKey ? stages.findIndex(s => s.key === activeKey) : -1

  return (
    <Card delay={0.2} className="p-5">
      <h3 className="text-[11px] font-medium uppercase tracking-wider mb-5 text-[#555]">Agent Pipeline</h3>
      <div className="flex items-center justify-between">
        {stages.map((stage, i) => {
          const completed = isDone || (activeIdx >= 0 && i < activeIdx)
          const running = stage.key === activeKey
          const Icon = stage.icon

          return (
            <div key={stage.key} className={`flex items-center ${i < stages.length - 1 ? 'flex-1' : ''}`}>
              <motion.div
                whileHover={{ scale: 1.1 }}
                className="flex flex-col items-center gap-1.5"
              >
                <motion.div
                  animate={running ? { boxShadow: ['0 0 8px hsla(270,90%,55%,0.15)', '0 0 24px hsla(270,90%,55%,0.35)', '0 0 8px hsla(270,90%,55%,0.15)'] } : {}}
                  transition={running ? { duration: 2, repeat: Infinity } : {}}
                  className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all duration-500 ${
                    completed ? 'border-green-500 bg-green-900/20 text-green-400'
                    : running ? 'border-accent-500 bg-accent-900/20 text-accent-400'
                    : 'border-[#222] text-[#555]'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </motion.div>
                <span className={`text-[10px] font-medium ${
                  completed ? 'text-green-400' : running ? 'text-accent-400' : 'text-[#555]'
                }`}>
                  {stage.label}
                </span>
              </motion.div>
              {i < stages.length - 1 && (
                <div className="mx-1 sm:mx-2 h-0.5 flex-1 min-w-3 sm:min-w-6 relative overflow-hidden">
                  <div className="absolute inset-0 bg-[#1a1a1a]" />
                  {completed && (
                    <motion.div
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                      className="absolute inset-0 bg-gradient-to-r from-green-500 to-green-400 origin-left"
                    />
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
      <div className="mt-4 text-center">
        {isRunning && (
          <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-accent-400">
            Agent running — {agentRun?.companiesFound || 0} companies found
          </motion.span>
        )}
        {isDone && (
          <span className="text-xs text-green-400">
            Last run: {agentRun?.companiesFound || 0} companies, {agentRun?.emailsSent || 0} emails
          </span>
        )}
        {(!agentRun || agentRun?.status === 'idle') && (
          <span className="text-xs text-[#444]">No active run. Click "Start Agent" to begin.</span>
        )}
      </div>
    </Card>
  )
}
