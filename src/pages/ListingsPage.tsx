import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Navbar from '../components/Navbar'

interface ListingImage {
  storage_path: string
  display_order: number
}

interface Listing {
  id: string
  title: string
  price: number
  condition: string
  category: string | null
  brand: string | null
  created_at: string
  listing_images: ListingImage[]
}

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

function sortedUrls(images: ListingImage[]): string[] {
  if (!images || images.length === 0) return []
  return images
    .slice()
    .sort((a, b) => a.display_order - b.display_order)
    .map(img => supabase.storage.from('listing-images').getPublicUrl(img.storage_path).data.publicUrl)
}

// ── Per-card image carousel ───────────────────────────────────────────────────
function ImageCarousel({ urls }: { urls: string[] }) {
  const [index, setIndex] = useState(0)

  if (urls.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-300">
        <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
    )
  }

  const prev = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIndex(i => (i - 1 + urls.length) % urls.length)
  }

  const next = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIndex(i => (i + 1) % urls.length)
  }

  return (
    <>
      <img
        src={urls[index]}
        alt=""
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
      />

      {/* Counter badge — visible on hover */}
      {urls.length > 0 && (
        <span className="absolute top-2 right-2 text-xs font-semibold bg-black/50 text-white px-2 py-0.5 rounded-full pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
          {index + 1}/{urls.length}
        </span>
      )}

      {/* Arrows — visible on hover when multiple images */}
      {urls.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-1.5 top-1/2 -translate-y-1/2 w-7 h-7 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={next}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}
    </>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ListingsPage() {
  const navigate = useNavigate()
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    async function fetchListings() {
      const { data, error } = await supabase
        .from('listings')
        .select('id, title, price, condition, category, brand, created_at, listing_images(storage_path, display_order)')
        .order('created_at', { ascending: false })

      if (error) {
        setError(error.message)
      } else {
        setListings(data ?? [])
      }
      setLoading(false)
    }

    fetchListings()
  }, [])

  const handleDelete = async (listing: Listing, e: React.MouseEvent) => {
    e.stopPropagation()
    if (deletingId) return
    setDeletingId(listing.id)
    const paths = listing.listing_images.map(img => img.storage_path)
    if (paths.length > 0) await supabase.storage.from('listing-images').remove(paths)
    await supabase.from('listing_images').delete().eq('listing_id', listing.id)
    await supabase.from('listings').delete().eq('id', listing.id)
    setListings(prev => prev.filter(l => l.id !== listing.id))
    setDeletingId(null)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Listings</h1>
            <p className="text-gray-500 text-sm mt-1">
              {loading ? 'Loading…' : `${listings.length} item${listings.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <button
            onClick={() => navigate('/listings/create')}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Listing
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-6">
            {error}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-200 overflow-hidden animate-pulse">
                <div className="aspect-square bg-gray-200" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                  <div className="h-3 bg-gray-100 rounded w-1/3 mt-3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && listings.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">No listings yet</h2>
            <p className="text-gray-500 text-sm mb-6">Create your first listing to get started.</p>
            <button
              onClick={() => navigate('/listings/create')}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
            >
              Create Listing
            </button>
          </div>
        )}

        {/* Grid */}
        {!loading && listings.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {listings.map(listing => {
              const urls = sortedUrls(listing.listing_images)
              return (
                <div
                  key={listing.id}
                  onClick={() => navigate(`/listings/${listing.id}/edit`)}
                  className="relative bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group"
                >
                  {/* Photo carousel */}
                  <div className="relative aspect-square bg-gray-100 overflow-hidden">
                    <ImageCarousel urls={urls} />
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2 mb-2">
                      {listing.title}
                    </h3>

                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-gray-900">
                        ${Number(listing.price).toFixed(2)}
                      </span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${CONDITION_COLORS[listing.condition] ?? 'bg-gray-100 text-gray-600'}`}>
                        {CONDITION_LABELS[listing.condition] ?? listing.condition}
                      </span>
                    </div>

                    {(listing.brand || listing.category) && (
                      <p className="text-xs text-gray-400 mt-2 truncate">
                        {[listing.brand, listing.category].filter(Boolean).join(' · ')}
                      </p>
                    )}

                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(listing.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>

                  {/* Delete button — appears on hover */}
                  <button
                    onClick={e => handleDelete(listing, e)}
                    disabled={deletingId === listing.id}
                    className="absolute bottom-3 right-3 w-8 h-8 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                  >
                    {deletingId === listing.id ? (
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )}
                  </button>
                </div>
              )
            })}
          </div>
        )}

      </main>
    </div>
  )
}
