import { useState, useEffect } from 'react'
import { getItems } from '../api/items'
import ItemCard from '../components/ItemCard'
import LoadingSpinner from '../components/LoadingSpinner'

const FILTER_OPTIONS = [
  { label: 'All', value: '' },
  { label: 'Student card', value: 'Student card' },
  { label: 'Key', value: 'Key' },
  { label: 'Water bottles', value: 'Water bottles' },
  { label: 'Helmet', value: 'Helmet' },
  { label: 'Chargers', value: 'Chargers' },
  { label: 'Clothes', value: 'Clothes' },
]

export default function HomePage() {
  const [allItems, setAllItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [activeFilter, setActiveFilter] = useState('')

  const fetchItems = async (cat) => {
    try {
      setLoading(true)
      setError('')
      const res = await getItems({ category: cat })
      setAllItems(res.data || [])
    } catch {
      setError('Failed to load items.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchItems(activeFilter)
  }, [activeFilter])

  const displayedItems = allItems.filter(item => {
    const q = searchInput.trim().toLowerCase()
    return !q ||
      item.name?.toLowerCase().includes(q) ||
      item.locationFound?.toLowerCase().includes(q)
  })

  return (
    <div className="flex flex-col min-h-screen bg-white">

      {/* Search + Filter bar */}
      <div className="bg-white border-b border-gray-100 py-3">
        <div className="max-w-7xl mx-auto px-6 flex items-center gap-4">

        {/* Search bar — wide left side */}
        <div className="flex items-center gap-2 border border-gray-200 rounded-full px-4 py-1.5 bg-white" style={{ width: '280px' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400 flex-shrink-0">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search"
            className="text-sm outline-none text-gray-600 placeholder-gray-400 w-full bg-transparent"
          />
        </div>

        {/* Filter pills — inside a bordered rounded container */}
        <div className="flex-1 flex justify-end">
        <div className="border border-gray-300 rounded-full px-5 py-2 flex items-center gap-4">
          {FILTER_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-1.5 text-sm text-gray-400 cursor-pointer hover:text-gray-600 transition-colors select-none"
            >
              <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0`}
                style={activeFilter === opt.value
                  ? { borderColor: '#F5A623' }
                  : { borderColor: '#9ca3af' }}
              >
                {activeFilter === opt.value && (
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#F5A623' }} />
                )}
              </span>
              <input
                type="radio"
                name="filter"
                className="hidden"
                checked={activeFilter === opt.value}
                onChange={() => setActiveFilter(opt.value)}
              />
              <span className="whitespace-nowrap">{opt.label}</span>
            </label>
          ))}
        </div>
        </div>
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 px-6 py-6 bg-gray-50">
        {loading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner />
          </div>
        ) : error ? (
          <div className="text-center py-16 text-red-500 font-medium">{error}</div>
        ) : displayedItems.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <p className="text-base font-medium">No items found.</p>
            <p className="text-sm mt-1">Try adjusting your filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {displayedItems.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </main>


    </div>
  )
}
