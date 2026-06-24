import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

// Animated card with hover glow + lift + shine sweep
export default function Card({ children, className, delay = 0, onClick, ...props }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{
        y: -2,
        borderColor: 'hsla(270,80%,60%,0.2)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3), 0 0 30px hsla(270,90%,55%,0.06)',
      }}
      onClick={onClick}
      className={cn(
        'relative rounded-xl border border-[#1a1a1a] bg-[#0a0a0a] overflow-hidden transition-colors',
        'group',
        onClick && 'cursor-pointer',
        className
      )}
      {...props}
    >
      {/* Gradient shine sweep */}
      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out bg-gradient-to-r from-transparent via-accent-500/[0.03] to-transparent pointer-events-none z-10" />
      <div className="relative z-20">{children}</div>
    </motion.div>
  )
}
