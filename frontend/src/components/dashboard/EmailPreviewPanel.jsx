import { X, Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';

export default function EmailPreviewPanel({ email, onClose, onApprove }) {
  const [copied, setCopied] = useState(false);

  if (!email) return null;

  function handleCopy() {
    const text = `Subject: ${email.chosenSubject || email.subjectA}\n\n${email.body}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />

      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg border-l bg-card shadow-xl">
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-6 py-4">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-foreground">Email Preview</h2>
              <Badge variant="outline">{email.status}</Badge>
            </div>
            <button
              onClick={onClose}
              className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Company */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                To
              </p>
              <p className="text-sm text-foreground">
                {email.company?.name || 'Unknown'} — {email.company?.website || ''}
              </p>
            </div>

            {/* Subject A */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Subject A
              </p>
              <p className="text-sm font-medium text-foreground">{email.subjectA}</p>
            </div>

            {/* Subject B */}
            {email.subjectB && email.subjectB !== email.subjectA && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Subject B (variant)
                </p>
                <p className="text-sm font-medium text-foreground">{email.subjectB}</p>
              </div>
            )}

            {/* Email body */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Body
              </p>
              <div className="rounded-lg border p-4 bg-muted/20">
                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                  {email.body}
                </p>
              </div>
            </div>

            {/* Follow-up */}
            {email.followupBody && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Follow-up (sent after 3 days)
                </p>
                <div className="rounded-lg border p-4 bg-muted/20">
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {email.followupBody}
                  </p>
                </div>
              </div>
            )}

            {/* Timestamps */}
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>Created: {new Date(email.createdAt).toLocaleString()}</p>
              {email.sentAt && <p>Sent: {new Date(email.sentAt).toLocaleString()}</p>}
              {email.openedAt && <p>Opened: {new Date(email.openedAt).toLocaleString()}</p>}
              {email.repliedAt && <p>Replied: {new Date(email.repliedAt).toLocaleString()}</p>}
            </div>
          </div>

          {/* Footer actions */}
          <div className="border-t p-4 flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCopy}>
              <Copy className="mr-1.5 h-3.5 w-3.5" />
              {copied ? 'Copied!' : 'Copy'}
            </Button>

            {email.status === 'draft' && (
              <Button
                size="sm"
                onClick={onApprove}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Check className="mr-1.5 h-3.5 w-3.5" />
                Approve to Send
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
