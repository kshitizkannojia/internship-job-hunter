import { motion } from 'framer-motion'

const styles = {
  discovered: 'bg-[#111] text-[#888] border-[#222]',
  verified: 'bg-[#0a1628] text-blue-400 border-[#1e3a5f]',
  emailed: 'bg-[#1a1000] text-amber-400 border-[#422006]',
  replied: 'bg-[#001a0d] text-emerald-400 border-[#064e3b]',
  interview: 'bg-[#0f001a] text-violet-400 border-[#2e1065]',
  rejected: 'bg-[#1a0000] text-red-400 border-[#450a0a]',
  no_match: 'bg-[#111] text-[#666] border-[#222]',
  draft: 'bg-[#111] text-[#888] border-[#222]',
  approved: 'bg-[#001a2e] text-sky-400 border-[#0c4a6e]',
  sent: 'bg-[#1a1000] text-amber-400 border-[#422006]',
  opened: 'bg-[#1a0011] text-pink-400 border-[#500724]',
  bounced: 'bg-[#1a0000] text-red-400 border-[#450a0a]',
  follow_up_sent: 'bg-[#001a0d] text-emerald-400 border-[#064e3b]',
}

export default function Badge({ status }) {
  return (
    <motion.span
      whileHover={{ scale: 1.06, filter: 'brightness(1.2)' }}
      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium border ${styles[status] || styles.draft}`}
    >
      {status}
    </motion.span>
  )
}
