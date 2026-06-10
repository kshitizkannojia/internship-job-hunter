import { X, ExternalLink, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function CompanyPanel({ company, onClose }) {
  if (!company) return null;

  const latestEmail = company.emails?.[0];

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md border-l bg-card shadow-xl">
        <div className="flex h-full flex-col">
          {/* Panel header */}
          <div className="flex items-center justify-between border-b px-6 py-4">
            <h2 className="text-lg font-semibold text-foreground">{company.name}</h2>
            <button
              onClick={onClose}
              className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Panel body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Company details */}
            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Company Details
              </h3>
              <div className="space-y-2 text-sm">
                <DetailRow label="Website" value={company.website} isLink />
                <DetailRow label="Contact" value={company.contactName} />
                <DetailRow label="Email" value={company.contactEmail} />
                <DetailRow label="Title" value={company.contactTitle} />
                <DetailRow label="Industry" value={company.industry} />
                <DetailRow label="Location" value={company.location} />
                <DetailRow label="Size" value={company.size} />
                <DetailRow label="Source" value={company.source} />
              </div>

              {company.techStack?.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">Tech Stack</p>
                  <div className="flex flex-wrap gap-1.5">
                    {company.techStack.map((tech) => (
                      <Badge key={tech} variant="secondary" className="text-xs">
                        {tech}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {company.recentNews && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Recent News</p>
                  <p className="text-sm text-foreground">{company.recentNews}</p>
                </div>
              )}
            </section>

            {/* Latest email preview */}
            {latestEmail && (
              <section className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Latest Email
                </h3>
                <div className="rounded-lg border p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">
                      {latestEmail.chosenSubject || latestEmail.subjectA}
                    </p>
                    <Badge variant="outline" className="text-xs">
                      {latestEmail.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {latestEmail.body}
                  </p>
                  {latestEmail.sentAt && (
                    <p className="text-xs text-muted-foreground">
                      Sent: {new Date(latestEmail.sentAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </section>
            )}
          </div>

          {/* Panel footer */}
          <div className="border-t p-4 flex gap-2">
            {company.website && (
              <Button variant="outline" size="sm" asChild>
                <a href={company.website} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                  Website
                </a>
              </Button>
            )}
            {company.contactEmail && (
              <Button variant="outline" size="sm" asChild>
                <a href={`mailto:${company.contactEmail}`}>
                  <Mail className="mr-1.5 h-3.5 w-3.5" />
                  Email
                </a>
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function DetailRow({ label, value, isLink }) {
  if (!value) return null;
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      {isLink ? (
        <a
          href={value.startsWith('http') ? value : `https://${value}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent-600 hover:underline dark:text-accent-400"
        >
          {value}
        </a>
      ) : (
        <span className="text-foreground">{value}</span>
      )}
    </div>
  );
}
