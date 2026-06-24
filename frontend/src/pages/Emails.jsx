import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Check, Trash2, Eye, Pencil } from 'lucide-react'
import PageTransition from '../components/layout/PageTransition'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Skeleton from '../components/ui/Skeleton'
import SlidePanel from '../components/ui/SlidePanel'
import { api } from '../lib/utils'
import { useToast } from '../components/layout/Toast'

const TABS = [
  { key: '', label: 'All' },
  { key: 'draft', label: 'Drafts' },
  { key: 'approved', label: 'Approved' },
  { key: 'sent', label: 'Sent' },
  { key: 'opened', label: 'Opened' },
  { key: 'replied', label: 'Replied' },
]

export default function Emails() {
  const { toast } = useToast()
  const [emails, setEmails] = useState([])
  const [total, setTotal] = useState(0)
  const [tab, setTab] = useState('')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [editing, setEditing] = useState(false)
  const [editData, setEditData] = useState({})

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api(`/api/emails?limit=100${tab ? `&status=${tab}` : ''}`)
      setEmails(data.emails || [])
      setTotal(data.total || 0)
    } catch { /* silent */ }
    setLoading(false)
  }, [tab])

  useEffect(() => { load() }, [load])

  const approve = async (id) => {
    try {
      await api(`/api/emails/${id}/approve`, { method: 'POST' })
      toast('Email approved')
      load()
      setSelected(null)
    } catch (e) { toast(e.message, 'error') }
  }

  const deleteEmail = async (id) => {
    try {
      await api(`/api/emails/${id}`, { method: 'DELETE' })
      toast('Email deleted')
      load()
      setSelected(null)
    } catch (e) { toast(e.message, 'error') }
  }

  const saveEdit = async () => {
    try {
      const updated = await api(`/api/emails/${selected.id}`, {
        method: 'PUT',
        body: JSON.stringify(editData),
      })
      toast('Draft updated')
      setSelected(updated)
      setEditing(false)
      load()
    } catch (e) { toast(e.message, 'error') }
  }

  const openEdit = () => {
    setEditData({
      subjectA: selected.subjectA || '',
      subjectB: selected.subjectB || '',
      body: selected.body || '',
      followupBody: selected.followupBody || '',
    })
    setEditing(true)
  }

  return (
    <PageTransition>
      <div className="space-y-4">
        {/* Filter tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {TABS.map(t => (
            <motion.button
              key={t.key}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setTab(t.key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-300 shrink-0 ${
                tab === t.key
                  ? 'bg-accent-500/15 text-accent-400 shadow-[0_0_12px_hsla(270,90%,55%,0.1)]'
                  : 'text-[#666] hover:text-[#999] hover:bg-[#111]'
              }`}
            >
              {t.label}
            </motion.button>
          ))}
          <span className="ml-auto text-[11px] text-[#555] shrink-0">{total} emails</span>
        </div>

        {/* Email list */}
        <Card delay={0.1} className="overflow-hidden">
          {loading ? (
            <div className="divide-y divide-[#111]">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="px-5 py-4 flex items-center gap-4">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-48 flex-1" />
                  <Skeleton className="h-5 w-14 rounded-full" />
                </div>
              ))}
            </div>
          ) : emails.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <Mail className="mx-auto h-10 w-10 mb-3 text-[#333]" />
              <p className="text-sm font-medium text-[#666]">No emails{tab ? ` with status "${tab}"` : ''}</p>
              <p className="text-xs mt-1 text-[#444]">Run the agent to generate email drafts.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#111]">
              <AnimatePresence>
                {emails.map((email, i) => (
                  <motion.div
                    key={email.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.025 }}
                    onClick={() => { setSelected(email); setEditing(false) }}
                    className="px-5 py-3.5 flex items-center gap-4 cursor-pointer transition-all duration-300 hover:bg-[#0d0d0d] hover:shadow-[inset_3px_0_0_theme(colors.accent.500)]"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{email.company?.name || 'Unknown'}</p>
                      <p className="text-xs text-[#555] truncate mt-0.5">{email.subjectA || email.chosenSubject || '(no subject)'}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {email.sentAt && <span className="text-[10px] text-[#444] hidden sm:block">{new Date(email.sentAt).toLocaleDateString()}</span>}
                      <Badge status={email.status} />
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </Card>

        {/* Detail panel */}
        <SlidePanel open={!!selected} onClose={() => { setSelected(null); setEditing(false) }} title={selected?.company?.name || 'Email'}>
          {selected && !editing && (
            <div className="space-y-5">
              <div className="space-y-3">
                <Row label="Status"><Badge status={selected.status} /></Row>
                <Row label="Subject A"><p className="text-sm text-[#ccc]">{selected.subjectA || '—'}</p></Row>
                {selected.subjectB && <Row label="Subject B"><p className="text-sm text-[#ccc]">{selected.subjectB}</p></Row>}
                <div>
                  <span className="text-[11px] font-medium uppercase tracking-wider text-[#555] block mb-2">Body</span>
                  <div className="rounded-lg bg-[#050505] border border-[#1a1a1a] p-4 text-sm text-[#aaa] leading-relaxed whitespace-pre-wrap">{selected.body || '—'}</div>
                </div>
                {selected.followupBody && (
                  <div>
                    <span className="text-[11px] font-medium uppercase tracking-wider text-[#555] block mb-2">Follow-up</span>
                    <div className="rounded-lg bg-[#050505] border border-[#1a1a1a] p-4 text-sm text-[#aaa] leading-relaxed whitespace-pre-wrap">{selected.followupBody}</div>
                  </div>
                )}
                {selected.sentAt && <Row label="Sent">{new Date(selected.sentAt).toLocaleString()}</Row>}
                {selected.openedAt && <Row label="Opened">{new Date(selected.openedAt).toLocaleString()}</Row>}
                {selected.repliedAt && <Row label="Replied">{new Date(selected.repliedAt).toLocaleString()}</Row>}
              </div>
              <div className="flex gap-2 pt-4 border-t border-[#1a1a1a]">
                {selected.status === 'draft' && (
                  <>
                    <Button onClick={() => approve(selected.id)} className="flex-1 justify-center">
                      <Check className="h-3.5 w-3.5 mr-1.5" /> Approve
                    </Button>
                    <Button variant="outline" onClick={openEdit} className="flex-1 justify-center">
                      <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
                    </Button>
                  </>
                )}
                <Button variant="danger" onClick={() => deleteEmail(selected.id)} className={selected.status === 'draft' ? '' : 'flex-1 justify-center'}>
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete
                </Button>
              </div>
            </div>
          )}

          {/* Edit mode */}
          {selected && editing && (
            <div className="space-y-4">
              <Field label="Subject A" value={editData.subjectA} onChange={v => setEditData(d => ({ ...d, subjectA: v }))} />
              <Field label="Subject B" value={editData.subjectB} onChange={v => setEditData(d => ({ ...d, subjectB: v }))} />
              <Field label="Body" value={editData.body} onChange={v => setEditData(d => ({ ...d, body: v }))} multiline />
              <Field label="Follow-up" value={editData.followupBody} onChange={v => setEditData(d => ({ ...d, followupBody: v }))} multiline />
              <div className="flex gap-2 pt-4 border-t border-[#1a1a1a]">
                <Button onClick={saveEdit} className="flex-1 justify-center">Save</Button>
                <Button variant="outline" onClick={() => setEditing(false)} className="flex-1 justify-center">Cancel</Button>
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

function Field({ label, value, onChange, multiline }) {
  const cls = "w-full rounded-lg bg-[#050505] border border-[#222] px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-accent-500/50 focus:border-accent-500 transition-all"
  return (
    <div>
      <label className="text-[11px] font-medium uppercase tracking-wider text-[#555] block mb-1.5">{label}</label>
      {multiline ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} rows={5} className={cls} />
      ) : (
        <input value={value} onChange={e => onChange(e.target.value)} className={cls} />
      )}
    </div>
  )
}
