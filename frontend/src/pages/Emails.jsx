import { useState } from 'react';
import { useApi, apiCall } from '@/hooks/useApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, Eye, PenLine, Send } from 'lucide-react';
import EmailPreviewPanel from '@/components/dashboard/EmailPreviewPanel';

const statusFilters = ['all', 'draft', 'approved', 'sent', 'opened', 'replied'];

export default function Emails() {
  const [filter, setFilter] = useState('all');
  const [selectedEmail, setSelectedEmail] = useState(null);

  const endpoint = filter === 'all' ? '/emails?limit=50' : `/emails?status=${filter}&limit=50`;
  const { data, loading, refetch } = useApi(endpoint);
  const emails = data?.emails || [];

  async function handleApprove(emailId) {
    try {
      await apiCall(`/emails/${emailId}/approve`, 'POST');
      refetch();
    } catch (err) {
      console.error('Approve failed:', err);
    }
  }

  async function handleStartWriter() {
    try {
      await apiCall('/agent/start', 'POST', { type: 'writer' });
    } catch (err) {
      console.error('Writer start failed:', err);
    }
  }

  async function handleSendApproved() {
    try {
      await apiCall('/agent/start', 'POST', { type: 'sender' });
      // Refresh after a short delay to show updated statuses
      setTimeout(refetch, 3000);
    } catch (err) {
      console.error('Sender start failed:', err);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Email Drafts</h2>
          <p className="text-sm text-muted-foreground">
            Review, edit, and approve AI-generated emails before sending.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleStartWriter} className="bg-accent-600 hover:bg-accent-700 text-white">
            <PenLine className="mr-1.5 h-4 w-4" />
            Generate Emails
          </Button>
          <Button onClick={handleSendApproved} variant="outline">
            <Send className="mr-1.5 h-4 w-4" />
            Send Approved
          </Button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 rounded-lg border bg-muted/30 p-1">
        {statusFilters.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
              filter === s
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Email list */}
      {loading ? (
        <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
          Loading...
        </div>
      ) : emails.length === 0 ? (
        <Card>
          <CardContent className="flex h-32 items-center justify-center text-sm text-muted-foreground">
            No emails found. Run the scraper first, then click "Generate Emails" to create drafts.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {emails.map((email) => (
            <Card key={email.id} className="transition-colors hover:bg-muted/20">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  {/* Email info */}
                  <div
                    className="flex-1 cursor-pointer"
                    onClick={() => setSelectedEmail(email)}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium text-foreground">
                        {email.company?.name || 'Unknown Company'}
                      </p>
                      <StatusBadge status={email.status} />
                    </div>
                    <p className="text-sm text-accent-600 dark:text-accent-400">
                      {email.subjectA}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                      {email.body}
                    </p>
                    <p className="mt-1.5 text-[11px] text-muted-foreground">
                      Created {new Date(email.createdAt).toLocaleDateString()}
                      {email.sentAt && ` • Sent ${new Date(email.sentAt).toLocaleDateString()}`}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedEmail(email)}
                      title="Preview"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>

                    {email.status === 'draft' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleApprove(email.id)}
                        title="Approve"
                        className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Email preview panel */}
      {selectedEmail && (
        <EmailPreviewPanel
          email={selectedEmail}
          onClose={() => setSelectedEmail(null)}
          onApprove={() => {
            handleApprove(selectedEmail.id);
            setSelectedEmail(null);
          }}
        />
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    draft: { variant: 'secondary', label: 'Draft' },
    approved: { variant: 'outline', label: 'Approved' },
    sent: { variant: 'sent', label: 'Sent' },
    opened: { variant: 'followup', label: 'Opened' },
    replied: { variant: 'replied', label: 'Replied' },
    bounced: { variant: 'destructive', label: 'Bounced' },
    follow_up_sent: { variant: 'followup', label: 'Follow-up Sent' },
  };
  const config = map[status] || { variant: 'secondary', label: status };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
