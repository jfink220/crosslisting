import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import EbayImportModal from '../components/EbayImportModal'
import PoshmarkImportModal from '../components/PoshmarkImportModal'

// Platforms that support listing import (mock or real)
const IMPORT_ENABLED = new Set(['ebay', 'poshmark'])

// ── Platform visual config ────────────────────────────────────────────────────
const PLATFORM_STYLE: Record<string, { bg: string; text: string; abbr: string }> = {
  ebay:     { bg: 'bg-yellow-400',  text: 'text-gray-900',  abbr: 'eBay' },
  poshmark: { bg: 'bg-red-500',     text: 'text-white',     abbr: 'PM'   },
  mercari:  { bg: 'bg-red-400',     text: 'text-white',     abbr: 'M'    },
  depop:    { bg: 'bg-red-600',     text: 'text-white',     abbr: 'D'    },
  etsy:     { bg: 'bg-orange-500',  text: 'text-white',     abbr: 'E'    },
  facebook: { bg: 'bg-blue-600',    text: 'text-white',     abbr: 'fb'   },
  shopify:  { bg: 'bg-green-600',   text: 'text-white',     abbr: 'S'    },
}

interface Platform {
  id: string
  name: string
  slug: string
}

interface PlatformAccount {
  id: string
  platform_id: string
  username: string | null
  connected_at: string
}

// ── Connect modal ─────────────────────────────────────────────────────────────
function ConnectModal({
  platform,
  onConnect,
  onClose,
}: {
  platform: Platform
  onConnect: (username: string) => Promise<void>
  onClose: () => void
}) {
  const [username, setUsername] = useState('')
  const [saving, setSaving] = useState(false)
  const style = PLATFORM_STYLE[platform.slug] ?? { bg: 'bg-gray-400', text: 'text-white', abbr: '?' }

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault()
    setSaving(true)
    await onConnect(username.trim())
    setSaving(false)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"
        onClick={e => e.stopPropagation()}
      >
        {/* Icon + title */}
        <div className="flex items-center gap-3 mb-5">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${style.bg} ${style.text}`}>
            {style.abbr}
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Connect {platform.name}</h2>
            <p className="text-xs text-gray-400">Enter your {platform.name} username</p>
          </div>
        </div>

        {/* NOTE: Real OAuth flow would redirect to the platform's auth URL instead of this form.
            For eBay: https://auth.ebay.com/oauth2/authorize?client_id=...&redirect_uri=...&scope=...
            A Supabase Edge Function would then exchange the code for access/refresh tokens. */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            required
            autoFocus
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder={`Your ${platform.name} username`}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !username.trim()}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-semibold transition-colors"
            >
              {saving ? 'Connecting…' : 'Connect'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Platform card ─────────────────────────────────────────────────────────────
function PlatformCard({
  platform,
  account,
  onConnect,
  onDisconnect,
  onImport,
}: {
  platform: Platform
  account: PlatformAccount | undefined
  onConnect: (platform: Platform) => void
  onDisconnect: (account: PlatformAccount) => void
  onImport: (slug: string) => void
}) {
  const style = PLATFORM_STYLE[platform.slug] ?? { bg: 'bg-gray-400', text: 'text-white', abbr: '?' }
  const isConnected = !!account
  const hasImport = IMPORT_ENABLED.has(platform.slug)

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-col gap-4">
      {/* Header row */}
      <div className="flex items-center gap-3">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg flex-shrink-0 ${style.bg} ${style.text}`}>
          {style.abbr}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900">{platform.name}</h3>
          {isConnected ? (
            <p className="text-xs text-green-600 font-medium truncate">
              ● Connected{account.username ? ` · ${account.username}` : ''}
            </p>
          ) : (
            <p className="text-xs text-gray-400">Not connected</p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2 mt-auto">
        {isConnected ? (
          <>
            {hasImport && (
              <>
                <button
                  onClick={() => onImport(platform.slug)}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Import Listings
                </button>
                <p className="text-xs text-gray-400 text-center">
                  {platform.slug === 'ebay'
                    ? 'Live sync via eBay API · Enabled with real credentials'
                    : 'No public API · Browser automation required for live sync'}
                </p>
              </>
            )}
            <button
              onClick={() => onDisconnect(account!)}
              className="w-full py-2 rounded-lg border border-gray-200 text-sm text-gray-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors"
            >
              Disconnect
            </button>
          </>
        ) : (
          <button
            onClick={() => onConnect(platform)}
            className="w-full py-2 rounded-lg bg-gray-900 hover:bg-gray-700 text-white text-sm font-semibold transition-colors"
          >
            Connect
          </button>
        )}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function PlatformsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [platforms, setPlatforms]   = useState<Platform[]>([])
  const [accounts, setAccounts]     = useState<PlatformAccount[]>([])
  const [loading, setLoading]       = useState(true)

  // Modal state
  const [connectTarget, setConnectTarget] = useState<Platform | null>(null)
  const [importSlug, setImportSlug]       = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    async function fetchData() {
      const [{ data: plats }, { data: accts }] = await Promise.all([
        supabase.from('platforms').select('*').order('name'),
        supabase.from('platform_accounts').select('*').eq('user_id', user!.id),
      ])
      setPlatforms(plats ?? [])
      setAccounts(accts ?? [])
      setLoading(false)
    }
    fetchData()
  }, [user])

  const handleConnect = async (username: string) => {
    if (!user || !connectTarget) return
    const { data, error } = await supabase
      .from('platform_accounts')
      .insert({ user_id: user.id, platform_id: connectTarget.id, username: username || null })
      .select()
      .single()
    if (!error && data) {
      setAccounts(prev => [...prev, data])
    }
    setConnectTarget(null)
  }

  const handleDisconnect = async (account: PlatformAccount) => {
    await supabase.from('platform_accounts').delete().eq('id', account.id)
    setAccounts(prev => prev.filter(a => a.id !== account.id))
  }

  const accountByPlatform = (platformId: string) =>
    accounts.find(a => a.platform_id === platformId)

  const closeImport = () => setImportSlug(null)
  const afterImport = () => { setImportSlug(null); navigate('/listings') }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

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
            <h1 className="text-2xl font-bold text-gray-900">Connected Platforms</h1>
            <p className="text-gray-500 text-sm">
              Connect selling platforms to import and crosslist your items
            </p>
          </div>
        </div>

        {/* Stats */}
        {!loading && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-6 py-4 mb-8 flex items-center gap-6">
            <div>
              <span className="text-2xl font-bold text-gray-900">{accounts.length}</span>
              <span className="text-sm text-gray-500 ml-2">
                {accounts.length === 1 ? 'platform' : 'platforms'} connected
              </span>
            </div>
            <div className="h-6 w-px bg-gray-200" />
            <p className="text-sm text-gray-400">
              {platforms.length - accounts.length} available to connect
            </p>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5 animate-pulse">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gray-200 rounded-xl" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-gray-200 rounded w-2/3" />
                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                  </div>
                </div>
                <div className="h-9 bg-gray-200 rounded-lg" />
              </div>
            ))}
          </div>
        )}

        {/* Platform grid */}
        {!loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {platforms.map(platform => (
              <PlatformCard
                key={platform.id}
                platform={platform}
                account={accountByPlatform(platform.id)}
                onConnect={setConnectTarget}
                onDisconnect={handleDisconnect}
                onImport={setImportSlug}
              />
            ))}
          </div>
        )}

      </main>

      {/* Connect modal */}
      {connectTarget && (
        <ConnectModal
          platform={connectTarget}
          onConnect={handleConnect}
          onClose={() => setConnectTarget(null)}
        />
      )}

      {/* Import modals */}
      {importSlug === 'ebay' && (
        <EbayImportModal userId={user!.id} onClose={closeImport} onImported={afterImport} />
      )}
      {importSlug === 'poshmark' && (
        <PoshmarkImportModal userId={user!.id} onClose={closeImport} onImported={afterImport} />
      )}
    </div>
  )
}
