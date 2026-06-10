import { Play, Pause, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiCall } from '@/hooks/useApi';

export default function AgentControls({ agentRun, onAgentStarted }) {
  const isRunning = agentRun?.status === 'running';

  async function handleStart() {
    try {
      const run = await apiCall('/agent/start', 'POST', { type: 'scraper' });
      onAgentStarted?.(run);
    } catch (err) {
      console.error('Failed to start agent:', err);
    }
  }

  function handleExport() {
    // Download companies as CSV via a simple fetch
    window.open('/api/companies?format=csv', '_blank');
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        onClick={handleStart}
        disabled={isRunning}
        className="bg-accent-600 hover:bg-accent-700 text-white"
      >
        {isRunning ? (
          <>
            <Pause className="mr-1.5 h-4 w-4" />
            Running...
          </>
        ) : (
          <>
            <Play className="mr-1.5 h-4 w-4" />
            Start Agent
          </>
        )}
      </Button>

      <Button variant="outline" onClick={handleExport}>
        <Download className="mr-1.5 h-4 w-4" />
        Export CSV
      </Button>
    </div>
  );
}
