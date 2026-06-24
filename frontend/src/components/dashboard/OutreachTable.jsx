import { motion, AnimatePresence } from 'framer-motion'
import { Building2 } from 'lucide-react'
import Card from '../ui/Card'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import Skeleton from '../ui/Skeleton'

export default function OutreachTable({ companies, total, loading, page, pageSize, onPageChange, onSearch, searchQuery, onSelect }) {
  return (
    <Card delay={0.3} className="overflow-hidden">
      {/* Header */}
      <div className="border-b border-[#1a1a1a] px-5 py-3 flex items-center justify-between gap-3">
        <h3 className="text-[11px] font-medium uppercase tracking-wider shrink-0 text-[#555]">Recent Outreach</h3>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={e => onSearch(e.target.value)}
            placeholder="Search companies..."
            className="rounded-lg border border-[#222] bg-[#050505] px-3 py-1.5 text-xs w-40 text-gray-200 placeholder:text-[#444] focus:outline-none focus:ring-2 focus:ring-accent-500/50 focus:border-accent-500 transition-all duration-300"
          />
          <span className="text-[11px] shrink-0 text-[#555]">{total} total</span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#1a1a1a] text-left text-[11px] font-medium uppercase tracking-wider text-[#555]">
              <th className="px-5 py-2.5">Company</th>
              <th className="px-5 py-2.5 hidden sm:table-cell">Contact</th>
              <th className="px-5 py-2.5 hidden md:table-cell">Industry</th>
              <th className="px-5 py-2.5 hidden lg:table-cell">Location</th>
              <th className="px-5 py-2.5">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="border-b border-[#111]">
                  <td className="px-5 py-3"><Skeleton className="h-4 w-28" /></td>
                  <td className="px-5 py-3 hidden sm:table-cell"><Skeleton className="h-4 w-24" /></td>
                  <td className="px-5 py-3 hidden md:table-cell"><Skeleton className="h-4 w-20" /></td>
                  <td className="px-5 py-3 hidden lg:table-cell"><Skeleton className="h-4 w-20" /></td>
                  <td className="px-5 py-3"><Skeleton className="h-5 w-16 rounded-full" /></td>
                </tr>
              ))
            ) : companies.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center">
                  <Building2 className="mx-auto h-10 w-10 mb-3 text-[#333]" />
                  <p className="text-sm font-medium text-[#666]">No companies yet</p>
                  <p className="text-xs mt-1 text-[#444]">Click "Start Agent" to begin scraping.</p>
                </td>
              </tr>
            ) : (
              <AnimatePresence>
                {companies.map((company, i) => (
                  <motion.tr
                    key={company.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => onSelect(company)}
                    className="border-b border-[#111] cursor-pointer transition-all duration-300 hover:bg-[#0d0d0d] hover:shadow-[inset_3px_0_0_theme(colors.accent.500)]"
                  >
                    <td className="px-5 py-3">
                      <p className="font-medium text-sm">{company.name}</p>
                      <p className="text-xs sm:hidden text-[#555]">{company.contactName || ''}</p>
                    </td>
                    <td className="px-5 py-3 hidden sm:table-cell text-[#888]">{company.contactName || '—'}</td>
                    <td className="px-5 py-3 hidden md:table-cell text-[#888]">{company.industry || '—'}</td>
                    <td className="px-5 py-3 hidden lg:table-cell text-[#888]">{company.location || '—'}</td>
                    <td className="px-5 py-3"><Badge status={company.status} /></td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > pageSize && (
        <div className="border-t border-[#1a1a1a] px-5 py-3 flex items-center justify-between">
          <Button variant="outline" className="text-xs px-3 py-1.5" disabled={page === 0} onClick={() => onPageChange(page - 1)}>Previous</Button>
          <span className="text-[11px] text-[#555]">Page {page + 1} of {Math.ceil(total / pageSize)}</span>
          <Button variant="outline" className="text-xs px-3 py-1.5" disabled={(page + 1) * pageSize >= total} onClick={() => onPageChange(page + 1)}>Next</Button>
        </div>
      )}
    </Card>
  )
}
