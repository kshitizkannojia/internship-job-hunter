import { useState, useEffect, useCallback, lazy, Suspense } from 'react'
import { motion } from 'framer-motion'
import { Save, Link2, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import PageTransition from '../components/layout/PageTransition'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Skeleton from '../components/ui/Skeleton'
import { api } from '../lib/utils'
import { useToast } from '../components/layout/Toast'

const MonacoEditor = lazy(() => import('@monaco-editor/react'))

const SETTING_KEYS = {
  aiPrompt: 'ai_prompt',
  targetIndustry: 'target_industry',
  targetCity: 'target_city',
  targetSize: 'target_size',
  targetRole: 'target_role',
  dailyLimit: 'daily_limit',
  requireApproval: 'require_approval',
}

const DEFAULT_PROMPT = `You are writing a cold email on behalf of Kshitiz, a computer science student looking for internships. Write a personalized 4-sentence email:
1. Reference one specific thing about the company (recent funding, product, tech stack)
2. Mention relevant skills briefly
3. Keep it under 120 words
4. End with a clear CTA (15-min call or portfolio link)
Never use "I hope this email finds you well" or similar clichés. Sound like a real person, not a bot.`

export default function Settings() {
  const { toast } = useToast()
  const [settings, setSettings] = useState({})
  const [apiStatus, setApiStatus] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Local form state
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT)
  const [industry, setIndustry] = useState('')
  const [city, setCity] = useState('')
  const [size, setSize] = useState('')
  const [role, setRole] = useState('')
  const [dailyLimit, setDailyLimit] = useState(50)
  const [requireApproval, setRequireApproval] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [s, status] = await Promise.all([api('/api/settings'), api('/auth/status')])
      setSettings(s)
      setApiStatus(status)
      // Populate form
      if (s.ai_prompt) setPrompt(s.ai_prompt)
      if (s.target_industry) setIndustry(s.target_industry)
      if (s.target_city) setCity(s.target_city)
      if (s.target_size) setSize(s.target_size)
      if (s.target_role) setRole(s.target_role)
      if (s.daily_limit !== undefined) setDailyLimit(Number(s.daily_limit) || 50)
      if (s.require_approval !== undefined) setRequireApproval(s.require_approval === true || s.require_approval === 'true')
    } catch { /* silent */ }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const save = async () => {
    setSaving(true)
    try {
      await api('/api/settings', {
        method: 'POST',
        body: JSON.stringify({
          ai_prompt: prompt,
          target_industry: industry,
          target_city: city,
          target_size: size,
          target_role: role,
          daily_limit: String(dailyLimit),
          require_approval: requireApproval,
        }),
      })
      toast('Settings saved')
    } catch (e) { toast(e.message, 'error') }
    setSaving(false)
  }

  if (loading) {
    return (
      <PageTransition>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => <Card key={i} delay={i * 0.1} className="p-5"><Skeleton className="h-32 w-full" /></Card>)}
        </div>
      </PageTransition>
    )
  }

  const integrations = [
    { label: 'Gmail', key: 'gmailConnected', connect: '/auth/gmail' },
    { label: 'Groq AI', key: 'groqConfigured' },
    { label: 'Gemini AI', key: 'geminiConfigured' },
    { label: 'Anthropic', key: 'anthropicConfigured' },
    { label: 'Apollo.io', key: 'apolloConfigured' },
    { label: 'ZeroBounce', key: 'zeroBounceConfigured' },
  ]

  return (
    <PageTransition>
      <div className="space-y-4">
        {/* Save button */}
        <div className="flex justify-end">
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
            {saving ? 'Saving…' : 'Save Settings'}
          </Button>
        </div>

        {/* AI Prompt Editor */}
        <Card delay={0.05} className="overflow-hidden">
          <div className="border-b border-[#1a1a1a] px-5 py-3">
            <h3 className="text-[11px] font-medium uppercase tracking-wider text-[#555]">AI Email Prompt</h3>
            <p className="text-[11px] text-[#444] mt-0.5">Edit the system prompt used to generate cold emails.</p>
          </div>
          <div className="h-[320px]">
            <Suspense fallback={<div className="flex items-center justify-center h-full"><Loader2 className="h-5 w-5 animate-spin text-[#555]" /></div>}>
              <MonacoEditor
                height="320px"
                language="markdown"
                theme="vs-dark"
                value={prompt}
                onChange={v => setPrompt(v || '')}
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  lineNumbers: 'off',
                  wordWrap: 'on',
                  scrollBeyondLastLine: false,
                  padding: { top: 16, bottom: 16 },
                  renderLineHighlight: 'none',
                  overviewRulerBorder: false,
                  hideCursorInOverviewRuler: true,
                }}
              />
            </Suspense>
          </div>
        </Card>

        {/* Target Filters */}
        <Card delay={0.1} className="p-5">
          <h3 className="text-[11px] font-medium uppercase tracking-wider text-[#555] mb-4">Target Filters</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Industry" value={industry} onChange={setIndustry} placeholder="e.g. SaaS, FinTech, AI" />
            <Field label="City / Location" value={city} onChange={setCity} placeholder="e.g. Bangalore, Remote" />
            <Field label="Company Size" value={size} onChange={setSize} placeholder="e.g. 10-50, 50-200" />
            <Field label="Role Keywords" value={role} onChange={setRole} placeholder="e.g. Frontend, Full Stack" />
          </div>
        </Card>

        {/* Send Settings */}
        <Card delay={0.15} className="p-5">
          <h3 className="text-[11px] font-medium uppercase tracking-wider text-[#555] mb-4">Send Settings</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Daily Send Limit" value={dailyLimit} onChange={v => setDailyLimit(Number(v) || 0)} type="number" placeholder="50" />
            <div>
              <label className="text-[11px] font-medium uppercase tracking-wider text-[#555] block mb-1.5">Require Approval</label>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setRequireApproval(!requireApproval)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 ${requireApproval ? 'bg-accent-500' : 'bg-[#222]'}`}
              >
                <motion.span
                  layout
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  className="inline-block h-4 w-4 rounded-full bg-white shadow-md"
                  style={{ marginLeft: requireApproval ? 24 : 4 }}
                />
              </motion.button>
              <p className="text-[10px] text-[#444] mt-1">{requireApproval ? 'Drafts need manual approval before sending' : 'Emails send automatically after generation'}</p>
            </div>
          </div>
        </Card>

        {/* Integrations */}
        <Card delay={0.2} className="overflow-hidden">
          <div className="border-b border-[#1a1a1a] px-5 py-3">
            <h3 className="text-[11px] font-medium uppercase tracking-wider text-[#555]">Integrations</h3>
          </div>
          <div className="divide-y divide-[#111]">
            {integrations.map((svc, i) => (
              <motion.div
                key={svc.label}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 + i * 0.04 }}
                className="px-5 py-3.5 flex items-center justify-between transition-all duration-300 hover:bg-[#0d0d0d]"
              >
                <div className="flex items-center gap-3">
                  {apiStatus[svc.key] ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-[#555]" />
                  )}
                  <span className="text-sm font-medium">{svc.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[11px] ${apiStatus[svc.key] ? 'text-green-500' : 'text-[#555]'}`}>
                    {apiStatus[svc.key] ? 'Connected' : 'Not configured'}
                  </span>
                  {svc.connect && !apiStatus[svc.key] && (
                    <Button variant="outline" className="text-[11px] px-2.5 py-1" onClick={() => window.location.href = svc.connect}>
                      <Link2 className="h-3 w-3 mr-1" /> Connect
                    </Button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </Card>
      </div>
    </PageTransition>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div>
      <label className="text-[11px] font-medium uppercase tracking-wider text-[#555] block mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg bg-[#050505] border border-[#222] px-3 py-2 text-sm text-gray-200 placeholder:text-[#444] focus:outline-none focus:ring-2 focus:ring-accent-500/50 focus:border-accent-500 transition-all duration-300"
      />
    </div>
  )
}
