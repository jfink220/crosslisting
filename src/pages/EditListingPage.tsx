import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Navbar from '../components/Navbar'

const CONDITIONS = [
  { value: 'new',      label: 'New' },
  { value: 'like_new', label: 'Like New' },
  { value: 'good',     label: 'Good' },
  { value: 'fair',     label: 'Fair' },
  { value: 'poor',     label: 'Poor' },
]

const CATEGORIES = [
  'Clothing & Shoes', 'Electronics', 'Collectibles', 'Home & Garden',
  'Sporting Goods', 'Toys & Hobbies', 'Books', 'Music',
  'Jewelry & Watches', 'Health & Beauty', 'Art', 'Other',
]

// Unified image type — one array covers both saved and newly added photos
type DisplayImage =
  | { kind: 'existing'; key: string; id: string; storage_path: string; url: string }
  | { kind: 'new';      key: string; file: File; previewUrl: string }

export default function EditListingPage() {
  const { id } = useParams<{ id: string }>()
  const navigate  = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Form fields
  const [title, setTitle]             = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice]             = useState('')
  const [condition, setCondition]     = useState('good')
  const [category, setCategory]       = useState('')
  const [brand, setBrand]             = useState('')
  const [size, setSize]               = useState('')
  const [color, setColor]             = useState('')
  const [tags, setTags]               = useState('')

  // Unified image list + removed-existing tracker
  const [displayImages, setDisplayImages]       = useState<DisplayImage[]>([])
  const [removedExistingIds, setRemovedExistingIds] = useState<string[]>([])

  // Drag state
  const [dragIndex, setDragIndex]         = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  // Lightbox
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)

  const [loading,   setLoading]  = useState(true)
  const [saving,    setSaving]   = useState(false)
  const [deleting,  setDeleting] = useState(false)
  const [error,     setError]    = useState('')
  const [notFound,  setNotFound] = useState(false)

  // ── Load listing ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return
    async function fetchListing() {
      const { data, error } = await supabase
        .from('listings')
        .select('*, listing_images(id, storage_path, display_order)')
        .eq('id', id)
        .single()

      if (error || !data) { setNotFound(true); setLoading(false); return }

      setTitle(data.title ?? '')
      setDescription(data.description ?? '')
      setPrice(String(data.price ?? ''))
      setCondition(data.condition ?? 'good')
      setCategory(data.category ?? '')
      setBrand(data.brand ?? '')
      setSize(data.size ?? '')
      setColor(data.color ?? '')
      setTags((data.tags ?? []).join(', '))

      const sorted = [...(data.listing_images ?? [])].sort(
        (a: { display_order: number }, b: { display_order: number }) => a.display_order - b.display_order
      )
      setDisplayImages(sorted.map((img: { id: string; storage_path: string }) => ({
        kind:         'existing' as const,
        key:          img.id,
        id:           img.id,
        storage_path: img.storage_path,
        url:          supabase.storage.from('listing-images').getPublicUrl(img.storage_path).data.publicUrl,
      })))
      setLoading(false)
    }
    fetchListing()
  }, [id])

  // ── Escape closes lightbox ──────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setLightboxSrc(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // ── Image actions ───────────────────────────────────────────────────────────
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    const toAdd: DisplayImage[] = files.map(file => ({
      kind:       'new' as const,
      key:        `new-${Date.now()}-${Math.random()}`,
      file,
      previewUrl: URL.createObjectURL(file),
    }))
    setDisplayImages(prev => [...prev, ...toAdd].slice(0, 12))
    e.target.value = ''
  }

  const removeImage = (index: number) => {
    setDisplayImages(prev => {
      const img = prev[index]
      if (img.kind === 'existing') setRemovedExistingIds(r => [...r, img.id])
      if (img.kind === 'new') URL.revokeObjectURL(img.previewUrl)
      return prev.filter((_, i) => i !== index)
    })
  }

  // ── Drag handlers ───────────────────────────────────────────────────────────
  const onDragStart = (i: number) => setDragIndex(i)

  const onDragOver = (e: React.DragEvent, i: number) => {
    e.preventDefault()
    if (i !== dragOverIndex) setDragOverIndex(i)
  }

  const onDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    if (dragIndex === null || dragIndex === dropIndex) {
      setDragIndex(null); setDragOverIndex(null); return
    }
    setDisplayImages(prev => {
      const next = [...prev]
      const [moved] = next.splice(dragIndex, 1)
      next.splice(dropIndex, 0, moved)
      return next
    })
    setDragIndex(null); setDragOverIndex(null)
  }

  const onDragEnd = () => { setDragIndex(null); setDragOverIndex(null) }

  // ── Delete ──────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!id) return
    setDeleting(true)
    const { data: images } = await supabase
      .from('listing_images')
      .select('storage_path')
      .eq('listing_id', id)
    if (images && images.length > 0) {
      await supabase.storage.from('listing-images').remove(images.map(img => img.storage_path))
    }
    await supabase.from('listing_images').delete().eq('listing_id', id)
    await supabase.from('listings').delete().eq('id', id)
    navigate('/listings')
  }

  // ── Save ────────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault()
    if (!id) return
    setError('')
    setSaving(true)

    // 1. Update listing row
    const { error: updateError } = await supabase
      .from('listings')
      .update({
        title:       title.trim(),
        description: description.trim() || null,
        price:       parseFloat(price),
        condition,
        category:    category || null,
        brand:       brand.trim() || null,
        size:        size.trim() || null,
        color:       color.trim() || null,
        tags:        tags.trim() ? tags.split(',').map(t => t.trim()).filter(Boolean) : null,
      })
      .eq('id', id)

    if (updateError) { setError(updateError.message); setSaving(false); return }

    // 2. Delete removed existing images from storage + DB
    if (removedExistingIds.length > 0) {
      const removedPaths = removedExistingIds
        .map(rid => {
          const found = displayImages.find(img => img.kind === 'existing' && img.id === rid)
          return found?.kind === 'existing' ? found.storage_path : null
        })
        .filter(Boolean) as string[]

      // Also check original images for paths (they may have been removed from displayImages already)
      await supabase.storage.from('listing-images').remove(removedPaths)
      await supabase.from('listing_images').delete().in('id', removedExistingIds)
    }

    // 3. Update display_order for kept existing images
    const existingUpdates = displayImages
      .map((img, index) => img.kind === 'existing' ? { id: img.id, display_order: index } : null)
      .filter(Boolean) as { id: string; display_order: number }[]

    await Promise.all(
      existingUpdates.map(u =>
        supabase.from('listing_images').update({ display_order: u.display_order }).eq('id', u.id)
      )
    )

    // 4. Upload new images with correct display_order
    const newImages = displayImages
      .map((img, index) => img.kind === 'new' ? { img, index } : null)
      .filter(Boolean) as { img: Extract<DisplayImage, { kind: 'new' }>; index: number }[]

    if (newImages.length > 0) {
      try {
        const uploaded = await Promise.all(
          newImages.map(async ({ img, index }) => {
            const ext  = img.file.name.split('.').pop()
            const path = `${id}/${Date.now()}_${index}.${ext}`
            const { error: uploadError } = await supabase.storage
              .from('listing-images').upload(path, img.file)
            if (uploadError) throw uploadError
            return { listing_id: id, storage_path: path, display_order: index }
          })
        )
        await supabase.from('listing_images').insert(uploaded)
      } catch {
        setError('Listing updated but some images failed to upload.')
        setSaving(false)
        navigate('/listings')
        return
      }
    }

    navigate('/listings')
  }

  // ── Loading / not found ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50"><Navbar />
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-gray-50"><Navbar />
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <p className="text-gray-500 mb-4">Listing not found.</p>
          <button onClick={() => navigate('/listings')} className="text-blue-600 font-medium hover:underline">
            Back to listings
          </button>
        </div>
      </div>
    )
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate('/listings')}
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-white border border-gray-200 text-gray-500 hover:text-gray-900 hover:border-gray-300 transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Edit Listing</h1>
            <p className="text-gray-500 text-sm">Update your item details</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Left column */}
            <div className="lg:col-span-2 space-y-5">

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                  {error}
                </div>
              )}

              {/* Photos */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <h2 className="font-semibold text-gray-900 mb-1">Photos</h2>
                <p className="text-xs text-gray-400 mb-4">Drag to reorder · First photo is the cover</p>

                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {displayImages.map((img, i) => {
                    const src = img.kind === 'existing' ? img.url : img.previewUrl
                    const isDragging  = dragIndex === i
                    const isDropTarget = dragOverIndex === i && dragIndex !== i

                    return (
                      <div
                        key={img.key}
                        draggable
                        onDragStart={() => onDragStart(i)}
                        onDragOver={e => onDragOver(e, i)}
                        onDrop={e => onDrop(e, i)}
                        onDragEnd={onDragEnd}
                        onClick={() => setLightboxSrc(src)}
                        className={[
                          'relative aspect-square rounded-xl overflow-hidden bg-gray-100 group cursor-grab active:cursor-grabbing transition-all',
                          isDragging   ? 'opacity-40 scale-95' : '',
                          isDropTarget ? 'ring-2 ring-blue-500 ring-offset-2' : '',
                        ].join(' ')}
                      >
                        <img src={src} alt="" className="w-full h-full object-cover pointer-events-none" />

                        {/* Remove button */}
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); removeImage(i) }}
                          className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>

                        {/* Cover badge */}
                        {i === 0 && (
                          <span className="absolute bottom-1.5 left-1.5 text-xs bg-blue-600 text-white px-1.5 py-0.5 rounded-md font-medium pointer-events-none">
                            Cover
                          </span>
                        )}

                        {/* Drag handle hint */}
                        <div className="absolute top-1.5 left-1.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                          <svg className="w-4 h-4 text-white drop-shadow" fill="currentColor" viewBox="0 0 24 24">
                            <circle cx="9"  cy="5"  r="1.5" /><circle cx="15" cy="5"  r="1.5" />
                            <circle cx="9"  cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
                            <circle cx="9"  cy="19" r="1.5" /><circle cx="15" cy="19" r="1.5" />
                          </svg>
                        </div>
                      </div>
                    )
                  })}

                  {/* Add button */}
                  {displayImages.length < 12 && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="aspect-square rounded-xl border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-blue-500 transition-colors"
                    >
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                      </svg>
                      <span className="text-xs font-medium">Add</span>
                    </button>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleImageSelect}
                />
              </div>

              {/* Core details */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
                <h2 className="font-semibold text-gray-900">Details</h2>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    required maxLength={80} value={title}
                    onChange={e => setTitle(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm"
                  />
                  <p className="text-xs text-gray-400 mt-1 text-right">{title.length}/80</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                  <textarea
                    rows={5} value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Price <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-sm">$</span>
                      <input
                        required type="number" min="0.01" step="0.01" value={price}
                        onChange={e => setPrice(e.target.value)}
                        className="w-full pl-8 pr-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Condition <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={condition} onChange={e => setCondition(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm bg-white"
                    >
                      {CONDITIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                </div>
              </div>

            </div>

            {/* Right column */}
            <div className="space-y-5">
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
                <h2 className="font-semibold text-gray-900">Item Info</h2>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
                  <select
                    value={category} onChange={e => setCategory(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm bg-white"
                  >
                    <option value="">Select a category</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                {[
                  { label: 'Brand', value: brand, set: setBrand, placeholder: "e.g. Nike, Apple" },
                  { label: 'Size',  value: size,  set: setSize,  placeholder: "e.g. M, 32x30" },
                  { label: 'Color', value: color, set: setColor, placeholder: "e.g. White" },
                ].map(field => (
                  <div key={field.label}>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{field.label}</label>
                    <input
                      value={field.value} onChange={e => field.set(e.target.value)}
                      placeholder={field.placeholder}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm"
                    />
                  </div>
                ))}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Tags</label>
                  <input
                    value={tags} onChange={e => setTags(e.target.value)}
                    placeholder="vintage, streetwear, rare"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm"
                  />
                  <p className="text-xs text-gray-400 mt-1">Comma-separated</p>
                </div>
              </div>

              <button
                type="submit" disabled={saving || deleting}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-sm"
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>

              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting || saving}
                className="w-full flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white font-semibold py-3 rounded-xl transition-colors shadow-sm"
              >
                {deleting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                )}
                {deleting ? 'Deleting…' : 'Delete Listing'}
              </button>

              <button
                type="button" onClick={() => navigate('/listings')}
                className="w-full bg-white hover:bg-gray-50 text-gray-700 font-medium py-3 rounded-xl border border-gray-200 transition-colors text-sm"
              >
                Cancel
              </button>
            </div>

          </div>
        </form>
      </main>

      {/* Lightbox */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setLightboxSrc(null)}
        >
          {/* Close button */}
          <button
            onClick={() => setLightboxSrc(null)}
            className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Image — stop propagation so clicking the image itself doesn't close */}
          <img
            src={lightboxSrc}
            alt=""
            onClick={e => e.stopPropagation()}
            className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
            style={{ maxHeight: 'calc(100vh - 4rem)' }}
          />
        </div>
      )}
    </div>
  )
}
