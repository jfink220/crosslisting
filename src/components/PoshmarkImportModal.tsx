import { useState } from 'react'
import { supabase } from '../lib/supabase'

// ── Mock Poshmark listings ────────────────────────────────────────────────────
// NOTE: Poshmark has no public API. Real sync options:
//   1. Browser extension that automates the Poshmark web UI via Puppeteer/Playwright
//   2. Authenticated web scraping (violates Poshmark ToS — not recommended)
// This mock represents what would be returned by the user's Poshmark closet
// once automation is available.
const MOCK_POSHMARK_LISTINGS = [
  { pm_id: 'pm001', title: 'Free People Floral Maxi Dress Size S',           price: 48.00,  condition: 'like_new', category: 'Clothing & Shoes', brand: 'Free People' },
  { pm_id: 'pm002', title: 'Coach Leather Crossbody Bag Tan',                 price: 95.00,  condition: 'good',     category: 'Jewelry & Watches', brand: 'Coach'       },
  { pm_id: 'pm003', title: 'Lululemon Align Leggings 25" Black Size 6',       price: 55.00,  condition: 'like_new', category: 'Clothing & Shoes', brand: 'Lululemon'   },
  { pm_id: 'pm004', title: 'Kate Spade New York Tote Bag Pink Floral',        price: 110.00, condition: 'good',     category: 'Jewelry & Watches', brand: 'Kate Spade'  },
  { pm_id: 'pm005', title: 'Zara Blazer Oversized Camel Size M',              price: 35.00,  condition: 'good',     category: 'Clothing & Shoes', brand: 'Zara'        },
  { pm_id: 'pm006', title: 'Steve Madden Block Heel Ankle Boot Size 8',       price: 42.00,  condition: 'good',     category: 'Clothing & Shoes', brand: 'Steve Madden'},
  { pm_id: 'pm007', title: 'Anthropologie Sweater Wrap Cardigan Ivory M/L',   price: 38.00,  condition: 'like_new', category: 'Clothing & Shoes', brand: 'Anthropologie'},
  { pm_id: 'pm008', title: 'Mejuri Gold Vermeil Chunky Chain Necklace',       price: 65.00,  condition: 'like_new', category: 'Jewelry & Watches', brand: 'Mejuri'      },
]

type PoshmarkListing = typeof MOCK_POSHMARK_LISTINGS[number]

const CONDITION_LABELS: Record<string, string> = {
  new:      'New',
  like_new: 'Like New',
  good:     'Good',
  fair:     'Fair',
  poor:     'Poor',
}

const CONDITION_COLORS: Record<string, string> = {
  new:      'bg-green-100 text-green-700',
  like_new: 'bg-blue-100 text-blue-700',
  good:     'bg-yellow-100 text-yellow-700',
  fair:     'bg-orange-100 text-orange-700',
  poor:     'bg-red-100 text-red-700',
}

const THUMB_COLORS: Record<string, string> = {
  new:      'bg-green-200',
  like_new: 'bg-blue-200',
  good:     'bg-yellow-200',
  fair:     'bg-orange-200',
  poor:     'bg-red-200',
}

interface Props {
  userId: string
  onClose: () => void
  onImported: () => void
}

export default function PoshmarkImportModal({ userId, onClose, onImported }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState('')

  const allSelected = selected.size === MOCK_POSHMARK_LISTINGS.length

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(MOCK_POSHMARK_LISTINGS.map(l => l.pm_id)))
    }
  }

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleImport = async () => {
    if (selected.size === 0) return
    setImporting(true)
    setError('')

    const toImport = MOCK_POSHMARK_LISTINGS.filter(l => selected.has(l.pm_id))

    const { error: insertError } = await supabase
      .from('listings')
      .insert(
        toImport.map(l => ({
          user_id:   userId,
          title:     l.title,
          price:     l.price,
          condition: l.condition,
          category:  l.category,
          brand:     l.brand,
        }))
      )

    if (insertError) {
      setError(insertError.message)
      setImporting(false)
      return
    }

    onImported()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative bg-white w-full max-w-3xl mx-auto mt-12 mb-6 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: 'calc(100vh - 6rem)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-red-500 flex items-center justify-center text-white text-xs font-bold">PM</div>
              <h2 className="text-lg font-bold text-gray-900">Import from Poshmark</h2>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Select listings to import · {selected.size} selected
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Select all */}
        <div className="px-6 py-3 border-b border-gray-100 flex items-center gap-3">
          <button
            onClick={toggleAll}
            className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
          >
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
              allSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300 bg-white'
            }`}>
              {allSelected && (
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            {allSelected ? 'Deselect all' : 'Select all'}
          </button>
          <span className="text-xs text-gray-400">{MOCK_POSHMARK_LISTINGS.length} items found in closet</span>
        </div>

        {/* Listings grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-4">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {MOCK_POSHMARK_LISTINGS.map(listing => {
              const isSelected = selected.has(listing.pm_id)
              return (
                <button
                  key={listing.pm_id}
                  type="button"
                  onClick={() => toggle(listing.pm_id)}
                  className={[
                    'text-left rounded-xl border-2 overflow-hidden flex transition-all',
                    isSelected
                      ? 'border-blue-500 shadow-md shadow-blue-100'
                      : 'border-gray-200 hover:border-gray-300',
                  ].join(' ')}
                >
                  {/* Thumbnail placeholder */}
                  <div className={`w-20 flex-shrink-0 flex items-center justify-center ${THUMB_COLORS[listing.condition] ?? 'bg-gray-200'}`}>
                    <svg className="w-7 h-7 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>

                  {/* Info */}
                  <div className="flex-1 p-3 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug">
                        {listing.title}
                      </p>
                      <div className={`w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center mt-0.5 transition-colors ${
                        isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300 bg-white'
                      }`}>
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-sm font-bold text-gray-900">
                        ${listing.price.toFixed(2)}
                      </span>
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${CONDITION_COLORS[listing.condition] ?? 'bg-gray-100 text-gray-600'}`}>
                        {CONDITION_LABELS[listing.condition] ?? listing.condition}
                      </span>
                    </div>

                    {(listing.brand || listing.category) && (
                      <p className="text-xs text-gray-400 mt-1 truncate">
                        {[listing.brand, listing.category].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={selected.size === 0 || importing}
            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
          >
            {importing ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            )}
            {importing
              ? 'Importing…'
              : selected.size === 0
                ? 'Select listings to import'
                : `Import ${selected.size} Listing${selected.size !== 1 ? 's' : ''}`
            }
          </button>
        </div>
      </div>
    </div>
  )
}
