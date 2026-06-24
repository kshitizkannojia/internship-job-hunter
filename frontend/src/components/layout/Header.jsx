import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Menu } from 'lucide-react'

export default function Header({ title, onMenuClick }) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const main = document.getElementById('main-scroll')
    if (!main) return
    const handler = () => setScrolled(main.scrollTop > 8)
    main.addEventListener('scroll', handler, { passive: true })
    return () => main.removeEventListener('scroll', handler)
  }, [])

  return (
    <header
      className={`flex h-14 items-center justify-between border-b px-4 sm:px-6 backdrop-blur-xl transition-all duration-300 ${
        scrolled
          ? 'border-[#1a1a1a] bg-[#050505]/95 shadow-lg shadow-black/20'
          : 'border-[#111] bg-[#050505]/80'
      }`}
    >
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden rounded-lg p-1.5 hover:bg-[#111] text-gray-500 transition-colors"
        >
          <Menu className="h-5 w-5" />
        </button>
        <motion.h1
          key={title}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="text-sm font-semibold text-gray-200"
        >
          {title}
        </motion.h1>
      </div>
      <div className="flex items-center gap-2">
        <motion.div
          whileHover={{ scale: 1.12, boxShadow: '0 0 0 3px hsla(270,80%,60%,0.3)' }}
          className="h-7 w-7 rounded-full bg-accent-600 flex items-center justify-center text-white text-xs font-bold select-none cursor-pointer"
        >
          K
        </motion.div>
      </div>
    </header>
  )
}
