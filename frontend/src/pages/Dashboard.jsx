import { useState, useEffect, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { Play, Pause, Download, Globe, Trash2, ExternalLink } from 'lucide-react'
import PageTransition from '../components/layout/PageTransition'
import StatsCards from '../components/dashboard/StatsCards'
import Pipeline from '../components/dashboard/Pipeline'
import ReplyChart from '../components/dashboard/ReplyChart'
import OutreachTable from '../components/dashboard/OutreachTable'
import SlidePanel from '../components/ui/SlidePanel'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import { api } from '../lib/utils'
import { useToast } from '../components/layout/Toast'

const PAGE_SIZE = 20

export default function Dashboard() {
  const { toast } = useToast()

  // State
  const [stats, setStats] = useState({})
  const [companies, setCompanies] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [agentRun, setAgentRun] = useState(null)
  const [selected, setSelected] = useState(null)
  const pollRef = useRef(null)

  // Fetch companies
  const loadCompanies = useCallback(async (p = page, q = search) => {
    try {
      const data = await api(`/api/companies?limit=${PAGE_SIZE}&offset=${p * PAGE_SIZE}${q ? `&search=${encodeURIComponent(q)}` : ''}`)
      setCompanies(data.companies || [])
      setTotal(data.total || 0)
    } catch { /* silent */ }
  }, [page, search])

  // Fetch stats
  const loadStats = useCallback(async () => {
    try {
      const data = await api('/api/stats')
      setStats(data)
    } catch { /* silent */ }
  }, [])

  // Fetch agent status
  const loadAgent = useCallback(async () => {
    try {
      const data = await api('/api/agent/status')
      setAgentRun(data)
      return data
    } catch { return null }
  }, [])

  // Initial load
  useEffect(() => {
    async function init() {
      setLoading(true)
      await Promise.all([loadStats(), loadCompanies(0, ''), loadAgent()])
      setLoading(false)
    }
    init()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fetch companies on page/search change
  useEffect(() => { loadCompanies() }, [page, search, loadCompanies])

  // Poll agent status while running
  useEffect(() => {
    if (agentRun?.status === 'running' && !pollRef.current) {
      pollRef.current = setInterval(async () => {
        const data = await loadAgent()
        if (data?.status !== 'running') {
          clearInterval(pollRef.current)
          pollRef.current = null
          loadStats()
          loadCompanies(0, '')
          toast('Agent run completed', 'success')
        }
      }, 3000)
    }
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null } }
  }, [agentRun?.status]) // eslint-disable-line react-hooks/exhaustive-deps

  // Start agent
  const startAgent = async () => {
    try {
      await api('/api/agent/start', { method: 'POST' })
      toast('Agent started')
      const data = await loadAgent()
      if (data) setAgentRun(data)
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  // CSV export
  const exportCSV = async () => {
    try {
      const data = await api('/api/companies?limit=1000&offset=0')
      const rows = data.companies || []
      if (!rows.length) { toast('No data to export', 'error'); return }
      const headers = ['name', 'contactName', 'contactEmail', 'website', 'industry', 'location', 'status']
      const csv = [headers.join(','), ...rows.map(r => headers.map(h => `"${(r[h] || '').toString().replace(/"/g, '""')}"`).join(','))].join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = 'outreach.csv'; a.click()
      URL.revokeObjectURL(url)
      toast('CSV exported')
    } catch (e) { toast(e.message, 'error') }
  }

  // Delete company
  const deleteCompany = async (id) => {
    try {
      await api(`/api/companies/${id}`, { method: 'DELETE' })
      setSelected(null)
      loadCompanies()
      loadStats()
      toast('Company deleted')
    } catch (e) { toast(e.message, 'error') }
  }

  const isRunning = agentRun?.status === 'running'

  return (
    <PageTransition>
      <div className="space-y-4">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <div />
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={exportCSV}>
              <Download className="h-3.5 w-3.5 mr-1.5" /> Export
            </Button>
            <Button onClick={isRunning ? undefined : startAgent} disabled={isRunning}>
              {isRunning ? <><Pause className="h-3.5 w-3.5 mr-1.5" /> Running…</> : <><Play className="h-3.5 w-3.5 mr-1.5" /> Start Agent</>}
            </Button>
          </div>
        </div>

        <StatsCards stats={stats} loading={loading} />

        <div className="grid gap-4 lg:grid-cols-2">
          <Pipeline agentRun={agentRun} />
          <ReplyChart stats={stats} />
        </div>

        <OutreachTable
          companies={companies}
          total={total}
          loading={loading}
          page={page}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          onSearch={(q) => { setSearch(q); setPage(0) }}
          searchQuery={search}
          onSelect={setSelected}
        />

        {/* Company detail panel */}
        <SlidePanel open={!!selected} onClose={() => setSelected(null)} title={selected?.name || ''}>
          {selected && (
            <div className="space-y-5">
              <div className="space-y-3">
                <Row label="Status"><Badge status={selected.status} /></Row>
                <Row label="Contact">{selected.contactName || '—'}</Row>
                <Row label="Email">{selected.contactEmail || '—'}</Row>
                <Row label="Industry">{selected.industry || '—'}</Row>
                <Row label="Location">{selected.location || '—'}</Row>
                {selected.website && (
                  <Row label="Website">
                    <a href={selected.website} target="_blank" rel="noopener noreferrer" className="text-accent-400 hover:underline inline-flex items-center gap-1 text-sm">
                      {selected.website.replace(/^https?:\/\//, '').slice(0, 30)} <ExternalLink className="h-3 w-3" />
                    </a>
                  </Row>
                )}
                {selected.techStack?.length > 0 && (
                  <Row label="Tech Stack">
                    <div className="flex flex-wrap gap-1.5">
                      {selected.techStack.map(t => (
                        <span key={t} className="rounded-md bg-[#111] border border-[#222] px-2 py-0.5 text-[11px] text-[#888]">{t}</span>
                      ))}
                    </div>
                  </Row>
                )}
                {selected.recentNews && <Row label="Recent News"><p className="text-sm text-[#888] leading-relaxed">{selected.recentNews}</p></Row>}
              </div>
              <div className="pt-4 border-t border-[#1a1a1a]">
                <Button variant="danger" onClick={() => deleteCompany(selected.id)} className="w-full justify-center">
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete Company
                </Button>
              </div>
            </div>
          )}
        </SlidePanel>
      </div>
    </PageTransition>
  )
}

function Row({ label, children }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-[11px] font-medium uppercase tracking-wider text-[#555] pt-0.5 shrink-0 w-20">{label}</span>
      <div className="text-sm text-right">{children}</div>
    </div>
  )
}
