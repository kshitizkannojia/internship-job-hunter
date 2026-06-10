import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner, EmptyState } from '@/components/ui/loading';
import { Building2 } from 'lucide-react';

// Maps status strings to badge variants
const statusBadge = {
  discovered: { label: 'Discovered', variant: 'secondary' },
  verified: { label: 'Verified', variant: 'outline' },
  emailed: { label: 'Sent', variant: 'sent' },
  replied: { label: 'Replied', variant: 'replied' },
  interview: { label: 'Interview', variant: 'replied' },
  rejected: { label: 'Rejected', variant: 'destructive' },
  no_match: { label: 'No Match', variant: 'nomatch' },
  follow_up: { label: 'Follow-up Due', variant: 'followup' },
};

function getStatusBadge(status) {
  return statusBadge[status] || { label: status, variant: 'secondary' };
}

export default function OutreachTable({ companies, loading, onSelect }) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Recent Outreach</CardTitle>
        </CardHeader>
        <CardContent>
          <LoadingSpinner text="Loading companies..." />
        </CardContent>
      </Card>
    );
  }

  if (!companies || companies.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Recent Outreach</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={Building2}
            title="No companies yet"
            description="Click 'Start Agent' to scrape companies, or add them manually via the API."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Recent Outreach</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Company</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Contact</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Role</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Location</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((company) => {
                const badge = getStatusBadge(company.status);
                return (
                  <tr
                    key={company.id}
                    onClick={() => onSelect(company)}
                    className="cursor-pointer border-b transition-colors hover:bg-muted/30 last:border-0"
                  >
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-foreground">{company.name}</p>
                        {company.website && (
                          <p className="text-xs text-muted-foreground">{company.website}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {company.contactName || '—'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {company.roleHint || '—'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {company.location || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
