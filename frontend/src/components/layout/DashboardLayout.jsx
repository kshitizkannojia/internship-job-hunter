import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

export default function DashboardLayout({
  children,
  onRefresh,
  loading,
  activePage,
  onNavigate,
}) {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar activePage={activePage} onNavigate={onNavigate} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          darkMode={darkMode}
          onToggleDark={() => setDarkMode(!darkMode)}
          onRefresh={onRefresh}
          loading={loading}
          activePage={activePage}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
