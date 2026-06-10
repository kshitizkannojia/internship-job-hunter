import { useState, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Dashboard from '@/pages/Dashboard';
import Emails from '@/pages/Emails';
import Settings from '@/pages/Settings';

function App() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState('dashboard');

  const handleRefresh = useCallback(() => {
    setLoading(true);
    setRefreshKey((k) => k + 1);
    setTimeout(() => setLoading(false), 800);
  }, []);

  return (
    <DashboardLayout
      onRefresh={handleRefresh}
      loading={loading}
      activePage={page}
      onNavigate={setPage}
    >
      {page === 'dashboard' && <Dashboard key={refreshKey} />}
      {page === 'emails' && <Emails key={refreshKey} />}
      {page === 'settings' && <Settings key={refreshKey} />}
    </DashboardLayout>
  );
}

export default App;
