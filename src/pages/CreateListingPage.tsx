import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'

const CONDITIONS = [
  { value: 'new',       label: 'New' },
  { value: 'like_new',  label: 'Like New' },
  { value: 'good',      label: 'Good' },
  { value: 'fair',      label: 'Fair' },
  { value: 'poor',      label: 'Poor' },
]

const CATEGORIES = [
  'Clothing & Shoes',
  'Electronics',
  'Collectibles',
  'Home & Garden',
  'Sporting Goods',
  'Toys & Hobbies',
  'Books',
  'Music',
  'Jewelry & Watches',
  'Health & Beauty',
  'Art',
  'Other',
]

interface ImagePreview {
  file: File
  previewUrl: string
}

export default function CreateListingPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [title, setTitle]             = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice]             = useState('')
  const [condition, setCondition]     = useState('good')
  const [category, setCategory]       = useState('')
  const [brand, setBrand]             = useState('')
  const [size, setSize]               = useState('')
  const [color, setColor]             = useState('')
  const [tags, setTags]               = useState('')
  const [images, setImages]           = useState<ImagePreview[]>([])
  const [error, setError]             = useState('')
  const [saving, setSaving]           = useState(false)

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    const previews = files.map(file => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }))
    setImages(prev => [...prev, ...previews].slice(0, 12))
    e.target.value = ''
  }

  const removeImage = (index: number) => {
    setImages(prev => {
      URL.revokeObjectURL(prev[index].previewUrl)
      return prev.filter((_, i) => i !== index)
    })
  }

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault()
    if (!user) return
    setError('')
    setSaving(true)

    // 1. Insert listing row
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .insert({
        user_id:     user.id,
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
      .select('id')
      .single()

    if (listingError || !listing) {
      setError(listingError?.message ?? 'Failed to save listing.')
      setSaving(false)
      return
    }

    // 2. Upload images to Supabase Storage
    if (images.length > 0) {
      const uploads = images.map(async ({ file }, index) => {
        const ext  = file.name.split('.').pop()
        const path = `${user.id}/${listing.id}/${index}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('listing-images')
          .upload(path, file)
        if (uploadError) throw uploadError
        return path
      })

      let paths: string[]
      try {
        paths = await Promise.all(uploads)
      } catch {
        setError('Listing saved but some images failed to upload.')
        setSaving(false)
        navigate('/')
        return
      }

      await supabase.from('listing_images').insert(
        paths.map((storage_path, index) => ({
          listing_id:    listing.id,
          storage_path,
          display_order: index,
        }))
      )
    }

    navigate('/')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate('/')}
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-white border border-gray-200 text-gray-500 hover:text-gray-900 hover:border-gray-300 transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Create Listing</h1>
            <p className="text-gray-500 text-sm">Fill in your item details below</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Left column — main fields */}
            <div className="lg:col-span-2 space-y-5">

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                  {error}
                </div>
              )}

              {/* Photos */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <h2 className="font-semibold text-gray-900 mb-4">Photos</h2>

                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {images.map((img, i) => (
                    <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 group">
                      <img src={img.previewUrl} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                      {i === 0 && (
                        <span className="absolute bottom-1.5 left-1.5 text-xs bg-blue-600 text-white px-1.5 py-0.5 rounded-md font-medium">
                          Cover
                        </span>
                      )}
                    </div>
                  ))}

                  {images.length < 12 && (
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
                <p className="text-xs text-gray-400 mt-3">Up to 12 photos. First photo is the cover.</p>
              </div>

              {/* Core details */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
                <h2 className="font-semibold text-gray-900">Details</h2>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    maxLength={80}
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="e.g. Nike Air Max 90 White Size 10"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm"
                  />
                  <p className="text-xs text-gray-400 mt-1 text-right">{title.length}/80</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                  <textarea
                    rows={5}
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Describe your item — condition details, measurements, defects, etc."
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm resize-none"
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
                        required
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={price}
                        onChange={e => setPrice(e.target.value)}
                        placeholder="0.00"
                        className="w-full pl-8 pr-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Condition <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={condition}
                      onChange={e => setCondition(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm bg-white"
                    >
                      {CONDITIONS.map(c => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

            </div>

            {/* Right column — metadata */}
            <div className="space-y-5">

              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
                <h2 className="font-semibold text-gray-900">Item Info</h2>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm bg-white"
                  >
                    <option value="">Select a category</option>
                    {CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Brand</label>
                  <input
                    value={brand}
                    onChange={e => setBrand(e.target.value)}
                    placeholder="e.g. Nike, Apple, Levi's"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Size</label>
                  <input
                    value={size}
                    onChange={e => setSize(e.target.value)}
                    placeholder="e.g. M, 32x30, 10"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Color</label>
                  <input
                    value={color}
                    onChange={e => setColor(e.target.value)}
                    placeholder="e.g. White, Navy Blue"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Tags</label>
                  <input
                    value={tags}
                    onChange={e => setTags(e.target.value)}
                    placeholder="vintage, streetwear, rare"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm"
                  />
                  <p className="text-xs text-gray-400 mt-1">Comma-separated</p>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={saving}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-sm"
              >
                {saving ? 'Saving…' : 'Save Listing'}
              </button>

              <button
                type="button"
                onClick={() => navigate('/')}
                className="w-full bg-white hover:bg-gray-50 text-gray-700 font-medium py-3 rounded-xl border border-gray-200 transition-colors text-sm"
              >
                Cancel
              </button>

            </div>
          </div>
        </form>
      </main>
    </div>
  )
}
