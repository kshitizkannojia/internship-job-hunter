import { createContext, useContext, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, X } from 'lucide-react'

const ToastCtx = createContext()
export const useToast = () => useContext(ToastCtx)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const toast = useCallback((message, type = 'info') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500)
  }, [])

  return (
    <ToastCtx.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className={`pointer-events-auto flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium shadow-xl border backdrop-blur-md ${
                t.type === 'success' ? 'bg-green-950/80 text-green-300 border-green-900'
                : t.type === 'error' ? 'bg-red-950/80 text-red-300 border-red-900'
                : 'bg-[#111]/80 text-gray-300 border-[#222]'
              }`}
            >
              {t.type === 'success' && <Check className="h-4 w-4 shrink-0" />}
              {t.type === 'error' && <X className="h-4 w-4 shrink-0" />}
              {t.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  )
}
