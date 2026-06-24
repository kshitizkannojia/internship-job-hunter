import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { DesktopSidebar, MobileSidebar } from './Sidebar'
import Header from './Header'
import Aurora from './Aurora'
import { ToastProvider } from './Toast'

const titles = { '/': 'Dashboard', '/emails': 'Emails', '/settings': 'Settings' }

export default function AppShell({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const title = titles[location.pathname] || 'Dashboard'

  return (
    <ToastProvider>
      <Aurora />
      <div className="flex h-full relative z-10">
        <DesktopSidebar />
        <MobileSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="flex flex-1 flex-col overflow-hidden">
          <Header title={title} onMenuClick={() => setSidebarOpen(true)} />
          <main id="main-scroll" className="flex-1 overflow-y-auto p-4 sm:p-6">
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  )
}
