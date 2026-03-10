import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import Navbar from '../components/Navbar'

export default function HomePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [totalListings, setTotalListings] = useState<number | null>(null)

  useEffect(() => {
    async function fetchCounts() {
      const { count } = await supabase
        .from('listings')
        .select('*', { count: 'exact', head: true })
      setTotalListings(count ?? 0)
    }
    fetchCounts()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Welcome */}
        <div className="mb-10">
          <h2 className="text-2xl font-bold text-gray-900">
            Welcome back{user?.email ? `, ${user.email.split('@')[0]}` : ''}!
          </h2>
          <p className="text-gray-500 mt-1">Manage and crosslist your items from one place.</p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10">
          {[
            { label: 'Total Listings',      value: totalListings, icon: '📦' },
            { label: 'Active Crosslistings', value: 0,             icon: '🔗' },
            { label: 'Items Sold',           value: 0,             icon: '✅' },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <div className="text-3xl mb-3">{stat.icon}</div>
              <div className="text-3xl font-bold text-gray-900">
                {stat.value === null ? (
                  <span className="inline-block w-8 h-8 bg-gray-200 rounded animate-pulse" />
                ) : (
                  stat.value
                )}
              </div>
              <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">

          <button
            onClick={() => navigate('/listings/create')}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl p-6 text-left transition-colors shadow-sm group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <svg className="w-5 h-5 opacity-60 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <div className="font-semibold text-lg">Create Listing</div>
            <div className="text-blue-100 text-sm mt-1">Add a new item to sell</div>
          </button>

          <button
            onClick={() => navigate('/listings')}
            className="bg-white hover:bg-gray-50 text-gray-900 rounded-2xl p-6 text-left border border-gray-200 transition-colors shadow-sm group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </div>
              <svg className="w-5 h-5 text-gray-400 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <div className="font-semibold text-lg">My Listings</div>
            <div className="text-gray-500 text-sm mt-1">View and manage all items</div>
          </button>

          <button onClick={() => navigate('/platforms')} className="bg-white hover:bg-gray-50 text-gray-900 rounded-2xl p-6 text-left border border-gray-200 transition-colors shadow-sm group">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <svg className="w-5 h-5 text-gray-400 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <div className="font-semibold text-lg">Connected Platforms</div>
            <div className="text-gray-500 text-sm mt-1">eBay, Poshmark, Etsy & more</div>
          </button>

        </div>
      </main>
    </div>
  )
}
