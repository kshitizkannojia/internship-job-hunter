import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Search, ShieldCheck, PenLine, Send, BarChart3 } from 'lucide-react';

const stages = [
  { key: 'scraping', label: 'Scraping', icon: Search },
  { key: 'verifying', label: 'Verifying', icon: ShieldCheck },
  { key: 'writing', label: 'Writing', icon: PenLine },
  { key: 'sending', label: 'Sending', icon: Send },
  { key: 'tracking', label: 'Tracking', icon: BarChart3 },
];

// Maps agent run status to which stages are done
function getStageStatus(agentStatus, agentType) {
  if (!agentStatus || agentStatus === 'idle') {
    return { active: null, completed: [] };
  }

  // For a running scraper, it's on the first stage
  if (agentStatus === 'running') {
    const stageMap = {
      scraper: 'scraping',
      writer: 'writing',
      sender: 'sending',
    };
    return {
      active: stageMap[agentType] || 'scraping',
      completed: stages
        .slice(0, stages.findIndex((s) => s.key === (stageMap[agentType] || 'scraping')))
        .map((s) => s.key),
    };
  }

  // Completed run — all stages done
  if (agentStatus === 'completed') {
    return { active: null, completed: stages.map((s) => s.key) };
  }

  return { active: null, completed: [] };
}

export default function PipelineStatus({ agentRun }) {
  const { active, completed } = getStageStatus(agentRun?.status, agentRun?.type);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Agent Pipeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          {stages.map(({ key, label, icon: Icon }, i) => {
            const isCompleted = completed.includes(key);
            const isActive = active === key;

            return (
              <div key={key} className="flex items-center">
                {/* Stage node */}
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-full border-2 transition-colors',
                      isCompleted && 'border-green-500 bg-green-50 text-green-600 dark:bg-green-900/20',
                      isActive && 'border-accent-500 bg-accent-50 text-accent-600 dark:bg-accent-900/20 animate-pulse',
                      !isCompleted && !isActive && 'border-muted text-muted-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <span
                    className={cn(
                      'text-[11px] font-medium',
                      isCompleted && 'text-green-600 dark:text-green-400',
                      isActive && 'text-accent-600 dark:text-accent-400',
                      !isCompleted && !isActive && 'text-muted-foreground'
                    )}
                  >
                    {label}
                  </span>
                </div>

                {/* Connector line between stages */}
                {i < stages.length - 1 && (
                  <div
                    className={cn(
                      'mx-2 h-0.5 w-8 sm:w-12 lg:w-16',
                      isCompleted ? 'bg-green-500' : 'bg-muted'
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Status text */}
        <div className="mt-4 text-center">
          {agentRun?.status === 'running' && (
            <span className="text-xs text-accent-600 dark:text-accent-400">
              Agent is running — {agentRun.companiesFound} companies found so far
            </span>
          )}
          {agentRun?.status === 'completed' && (
            <span className="text-xs text-green-600 dark:text-green-400">
              Last run completed — {agentRun.companiesFound} companies, {agentRun.emailsSent} emails
            </span>
          )}
          {(!agentRun || agentRun.status === 'idle') && (
            <span className="text-xs text-muted-foreground">
              No active agent run. Click "Start Agent" to begin.
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
