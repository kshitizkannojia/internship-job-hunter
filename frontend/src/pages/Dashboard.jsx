import { useState, useCallback } from 'react';
import { useApi } from '@/hooks/useApi';
import { LoadingSpinner, ErrorState } from '@/components/ui/loading';
import StatsCards from '@/components/dashboard/StatsCards';
import PipelineStatus from '@/components/dashboard/PipelineStatus';
import OutreachTable from '@/components/dashboard/OutreachTable';
import CompanyPanel from '@/components/dashboard/CompanyPanel';
import ReplyRateChart from '@/components/dashboard/ReplyRateChart';
import AgentControls from '@/components/dashboard/AgentControls';

export default function Dashboard() {
  const [selectedCompany, setSelectedCompany] = useState(null);

  const { data: stats, loading: statsLoading, error: statsError, refetch: refetchStats } = useApi('/stats');
  const { data: companiesData, loading: companiesLoading, refetch: refetchCompanies } = useApi('/companies?limit=10');
  const { data: agentRun, refetch: refetchAgent } = useApi('/agent/status');

  const refreshAll = useCallback(() => {
    refetchStats();
    refetchCompanies();
    refetchAgent();
  }, [refetchStats, refetchCompanies, refetchAgent]);

  if (statsLoading && !stats) {
    return <LoadingSpinner text="Loading dashboard..." />;
  }

  if (statsError) {
    return <ErrorState message={statsError} onRetry={refreshAll} />;
  }

  return (
    <div className="space-y-6">
      {/* Top row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Overview</h2>
          <p className="text-sm text-muted-foreground">
            Track your outreach pipeline at a glance.
          </p>
        </div>
        <AgentControls agentRun={agentRun} onAgentStarted={refreshAll} />
      </div>

      <StatsCards stats={stats} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <PipelineStatus agentRun={agentRun} />
        <ReplyRateChart
          recentActivity={stats?.recentActivity}
          replyRate={stats?.replyRate}
        />
      </div>

      <OutreachTable
        companies={companiesData?.companies}
        loading={companiesLoading}
        onSelect={setSelectedCompany}
      />

      {selectedCompany && (
        <CompanyPanel
          company={selectedCompany}
          onClose={() => setSelectedCompany(null)}
        />
      )}
    </div>
  );
}
