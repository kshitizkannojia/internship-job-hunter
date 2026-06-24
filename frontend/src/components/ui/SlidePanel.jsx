import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

export default function SlidePanel({ open, onClose, title, children }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[8px]"
          />
          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 400, damping: 40 }}
            className="fixed top-0 right-0 bottom-0 z-50 w-[480px] max-w-[100vw] bg-[#0a0a0a] border-l border-[#1a1a1a] shadow-[-16px_0_60px_rgba(0,0,0,0.8)]"
          >
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between border-b border-[#1a1a1a] px-6 py-4">
                <h3 className="text-base font-semibold">{title}</h3>
                <motion.button
                  whileHover={{ scale: 1.1, backgroundColor: '#111' }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onClose}
                  className="rounded-lg p-1 text-[#555] transition-colors"
                >
                  <X className="h-5 w-5" />
                </motion.button>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-5">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                >
                  {children}
                </motion.div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
