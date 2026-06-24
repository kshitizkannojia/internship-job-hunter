import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Home, Mail, Settings, X, Box } from 'lucide-react'

const links = [
  { to: '/', label: 'Dashboard', icon: Home },
  { to: '/emails', label: 'Emails', icon: Mail },
  { to: '/settings', label: 'Settings', icon: Settings },
]

function SidebarNav({ onClick }) {
  return (
    <nav className="flex-1 px-3 py-3 space-y-0.5">
      {links.map((link, i) => (
        <NavLink
          key={link.to}
          to={link.to}
          onClick={onClick}
          className={({ isActive }) =>
            `group relative flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-300 overflow-hidden ${
              isActive
                ? 'bg-accent-600/10 text-accent-400 font-semibold'
                : 'text-[#666] hover:text-[#ccc] hover:bg-[#111] hover:translate-x-0.5'
            }`
          }
        >
          {({ isActive }) => (
            <>
              {/* Hover sweep gradient */}
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-accent-500/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              {/* Active indicator bar */}
              {isActive && (
                <motion.span
                  layoutId="nav-indicator"
                  className="absolute left-0 top-1/4 h-1/2 w-[3px] rounded-r-sm bg-accent-500"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              <link.icon className="h-4 w-4 shrink-0 transition-transform duration-300 group-hover:scale-110" />
              <span className="relative">{link.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}

// Desktop sidebar
export function DesktopSidebar() {
  return (
    <aside className="hidden lg:flex lg:w-60 lg:flex-col border-r border-[#111] bg-[#050505]">
      <div className="flex h-14 items-center gap-2.5 border-b border-[#111] px-5">
        <motion.div
          whileHover={{ rotate: 180, scale: 1.1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-600 cursor-pointer shadow-lg shadow-accent-600/20"
        >
          <Box className="h-4 w-4 text-white" />
        </motion.div>
        <span className="text-sm font-bold tracking-tight text-gray-100">Internship Hunter</span>
      </div>
      <SidebarNav />
      <div className="border-t border-[#111] px-4 py-3">
        <p className="text-[11px] tracking-wide uppercase text-[#333]">v3.0 — React</p>
      </div>
    </aside>
  )
}

// Mobile sidebar drawer
export function MobileSidebar({ open, onClose }) {
  return (
    <>
      {/* Overlay */}
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
        />
      )}
      {/* Drawer */}
      <motion.aside
        initial={{ x: '-100%' }}
        animate={{ x: open ? 0 : '-100%' }}
        transition={{ type: 'spring', stiffness: 400, damping: 40 }}
        className="fixed inset-y-0 left-0 z-50 w-64 border-r border-[#111] bg-[#050505] lg:hidden"
      >
        <div className="flex h-14 items-center justify-between border-b border-[#111] px-5">
          <span className="text-sm font-bold text-gray-100">Internship Hunter</span>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-[#111] text-gray-500 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <SidebarNav onClick={onClose} />
      </motion.aside>
    </>
  )
}
