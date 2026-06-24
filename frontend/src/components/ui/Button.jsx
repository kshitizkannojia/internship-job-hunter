import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

const variants = {
  primary: 'bg-accent-600 text-white hover:bg-accent-500 shadow-lg shadow-accent-600/20 hover:shadow-accent-500/30',
  outline: 'border border-[#333] text-[#ccc] hover:border-accent-500/30 hover:text-white hover:bg-accent-500/5 hover:shadow-[0_0_15px_hsla(270,80%,60%,0.08)]',
  danger: 'border border-red-900 text-red-400 hover:bg-red-950',
  ghost: 'text-[#888] hover:text-white hover:bg-[#111]',
}

export default function Button({ children, variant = 'primary', className, disabled, ...props }) {
  return (
    <motion.button
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.97 }}
      disabled={disabled}
      className={cn(
        'relative inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-300 overflow-hidden disabled:opacity-50 disabled:pointer-events-none',
        variants[variant],
        className
      )}
      {...props}
    >
      {/* Shine overlay for primary */}
      {variant === 'primary' && (
        <span className="absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity pointer-events-none" />
      )}
      <span className="relative flex items-center gap-1.5">{children}</span>
    </motion.button>
  )
}
