import { useState, useEffect } from 'react';
import { useApi, apiCall } from '@/hooks/useApi';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Save,
  Mail,
  Key,
  Shield,
  Globe,
  Building2,
  MapPin,
  Users,
  Briefcase,
  CheckCircle,
  XCircle,
  ExternalLink,
} from 'lucide-react';

export default function Settings() {
  const { data: settings, loading, refetch } = useApi('/settings');
  const { data: authStatus } = useApi('/auth/status');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Form state
  const [prompt, setPrompt] = useState('');
  const [industry, setIndustry] = useState('');
  const [location, setLocation] = useState('');
  const [companySize, setCompanySize] = useState('');
  const [roleKeywords, setRoleKeywords] = useState('');
  const [dailyLimit, setDailyLimit] = useState('50');
  const [requireApproval, setRequireApproval] = useState(true);

  // Load settings into form
  useEffect(() => {
    if (!settings) return;
    setPrompt(settings.ai_prompt || '');
    setIndustry(settings.target_industry || '');
    setLocation(settings.target_location || '');
    setCompanySize(settings.target_company_size || '');
    setRoleKeywords(settings.target_role_keywords || '');
    setDailyLimit(String(settings.daily_send_limit || 50));
    setRequireApproval(settings.require_approval !== false);
  }, [settings]);

  async function handleSave() {
    setSaving(true);
    try {
      await apiCall('/settings', 'POST', {
        ai_prompt: prompt,
        target_industry: industry,
        target_location: location,
        target_company_size: companySize,
        target_role_keywords: roleKeywords,
        daily_send_limit: dailyLimit,
        require_approval: requireApproval,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      refetch();
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
        Loading settings...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Settings</h2>
          <p className="text-sm text-muted-foreground">
            Configure your outreach targets, AI prompt, and integrations.
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-accent-600 hover:bg-accent-700 text-white"
        >
          <Save className="mr-1.5 h-4 w-4" />
          {saved ? 'Saved!' : saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>

      {/* ── Target Config ──────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Target Filters</CardTitle>
          <CardDescription>Define what kind of companies the scraper should find.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <InputField
            icon={Globe}
            label="Industry"
            placeholder="e.g. Fintech, SaaS, Developer Tools"
            value={industry}
            onChange={setIndustry}
          />
          <InputField
            icon={MapPin}
            label="Location"
            placeholder="e.g. Bangalore, India"
            value={location}
            onChange={setLocation}
          />
          <InputField
            icon={Users}
            label="Company Size"
            placeholder="e.g. 11-50, 51-200"
            value={companySize}
            onChange={setCompanySize}
          />
          <InputField
            icon={Briefcase}
            label="Role Keywords"
            placeholder="e.g. Software Engineering Intern"
            value={roleKeywords}
            onChange={setRoleKeywords}
          />
        </CardContent>
      </Card>

      {/* ── AI Prompt Editor ───────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">AI Email Prompt</CardTitle>
          <CardDescription>
            This system prompt is sent to the AI when generating outreach emails.
            Edit it to change the tone, style, and content of generated emails.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={12}
            className="w-full rounded-lg border bg-muted/30 p-4 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent-500 resize-y"
            placeholder="Enter your AI system prompt here..."
          />
          <p className="mt-2 text-xs text-muted-foreground">
            The AI will use this prompt when writing cold emails. Be specific about tone, length, and what to include.
          </p>
        </CardContent>
      </Card>

      {/* ── Send Settings ──────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Sending</CardTitle>
          <CardDescription>Control how emails are sent.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <InputField
            icon={Mail}
            label="Daily Send Limit"
            placeholder="50"
            value={dailyLimit}
            onChange={setDailyLimit}
            type="number"
          />

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">Require approval before sending</p>
                <p className="text-xs text-muted-foreground">
                  When enabled, drafts must be manually approved before the sender dispatches them.
                </p>
              </div>
            </div>
            <button
              onClick={() => setRequireApproval(!requireApproval)}
              className={`relative h-6 w-11 rounded-full transition-colors ${
                requireApproval ? 'bg-accent-600' : 'bg-muted'
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  requireApproval ? 'left-[22px]' : 'left-0.5'
                }`}
              />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* ── Integrations ───────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Integrations</CardTitle>
          <CardDescription>Connect services and check API key status.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Gmail */}
          <IntegrationRow
            name="Gmail"
            description={authStatus?.gmailConnected ? 'Connected — ready to send' : 'Not connected'}
            connected={authStatus?.gmailConnected}
            action={
              !authStatus?.gmailConnected && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open('/api/auth/gmail', '_self')}
                >
                  <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                  Connect
                </Button>
              )
            }
          />

          {/* API Keys */}
          <IntegrationRow
            name="Groq / Gemini (AI)"
            description="Email generation AI model keys"
            connected={authStatus?.groqConfigured || authStatus?.geminiConfigured}
            note={authStatus?.groqConfigured || authStatus?.geminiConfigured ? 'Set in .env' : 'Missing in .env'}
          />
          <IntegrationRow
            name="Apollo.io"
            description="Company & contact scraping"
            connected={authStatus?.apolloConfigured}
            note={authStatus?.apolloConfigured ? 'Set in .env' : 'Optional — set APOLLO_API_KEY in .env'}
          />
          <IntegrationRow
            name="ZeroBounce"
            description="High-deliverability Email verification"
            connected={authStatus?.zeroBounceConfigured}
            note={authStatus?.zeroBounceConfigured ? 'Set in .env' : 'Optional — set ZEROBOUNCE_API_KEY in .env'}
          />
        </CardContent>
      </Card>
    </div>
  );
}

// ── Reusable Components ───────────────────────────────────────

function InputField({ icon: Icon, label, placeholder, value, onChange, type = 'text' }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="flex-1">
        <label className="text-xs font-medium text-muted-foreground">{label}</label>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="mt-0.5 w-full rounded-md border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent-500"
        />
      </div>
    </div>
  );
}

function IntegrationRow({ name, description, connected, action, note }) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-4">
      <div className="flex items-center gap-3">
        {connected ? (
          <CheckCircle className="h-4 w-4 text-green-500" />
        ) : (
          <XCircle className="h-4 w-4 text-muted-foreground" />
        )}
        <div>
          <p className="text-sm font-medium text-foreground">{name}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      {action || (note && <span className="text-xs text-muted-foreground">{note}</span>)}
    </div>
  );
}
