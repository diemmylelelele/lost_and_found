import { useState, useEffect } from 'react'
import { getItems } from '../api/items'
import ItemCard from '../components/ItemCard'
import LoadingSpinner from '../components/LoadingSpinner'
import { Twitter, Youtube, Github } from 'lucide-react'

const CATEGORIES = [
  { label: 'All Items', value: '' },
  { label: 'Bottles', value: 'Bottles' },
  { label: 'Keys', value: 'Keys' },
  { label: 'Clothes', value: 'Clothes' },
  { label: 'Electronic devices', value: 'Electronics' },
]

const LOCATIONS = [
  'Common Area GF',
  'Library',
  'Maker Space',
  'Classroom 1',
  'Classroom 2',
  'Classroom 3',
  'Classroom 4',
  'Classroom 5',
  'Classroom 6',
  'Classroom 7',
]

export default function HomePage() {
  const [allItems, setAllItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [category, setCategory] = useState('')
  const [location, setLocation] = useState('')

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
    fetchItems(category)
  }, [category])

  const handleCategoryChange = (val) => {
    setCategory(val)
    setLocation('')
  }

  const handleLocationChange = (val) => {
    setLocation(prev => prev === val ? '' : val)
  }

  const displayedItems = allItems.filter(item => {
    const q = searchInput.trim().toLowerCase()
    const matchesSearch = !q ||
      item.name?.toLowerCase().includes(q) ||
      item.locationFound?.toLowerCase().includes(q)
    const matchesLocation = !location || item.locationFound === location
    return matchesSearch && matchesLocation
  })

  return (
    <div className="flex flex-col" style={{ minHeight: 'calc(100vh - 64px)' }}>
      <div className="flex flex-1">

        {/* Sidebar */}
        <aside className="w-52 flex-shrink-0 bg-white border-r border-gray-200 pt-4 pr-4 pb-4 pl-6">
          {/* Search */}
          <div className="mb-5">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search"
              className="w-full px-3 py-2 border border-gray-300 rounded-full text-sm outline-none"
            />
          </div>

          {/* Categories */}
          <div className="mb-5">
            <p className="text-sm font-semibold text-gray-1000 mb-2">Categories</p>
            {CATEGORIES.map((cat) => (
              <label
                key={cat.value}
                className="flex items-center gap-2 text-sm text-gray-600 mb-2 cursor-pointer"
              >
                <input
                  type="radio"
                  name="category"
                  checked={category === cat.value && location === ''}
                  onChange={() => handleCategoryChange(cat.value)}
                  className="accent-brand-gold"
                />
                {cat.label}
              </label>
            ))}
          </div>

          {/* Locations */}
          <div>
            <p className="text-sm font-semibold text-gray-1000 mb-2">Locations</p>
            {LOCATIONS.map((loc) => (
              <label
                key={loc}
                className="flex items-center gap-2 text-sm text-gray-600 mb-2 cursor-pointer"
              >
                <input
                  type="radio"
                  name="location"
                  checked={location === loc}
                  onChange={() => handleLocationChange(loc)}
                  className="accent-brand-gold"
                />
                {loc}
              </label>
            ))}
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 bg-gray-50 p-6">
          {loading ? (
            <div className="flex justify-center py-16">
              <LoadingSpinner />
            </div>
          ) : error ? (
            <div className="text-center py-16 text-red-600">{error}</div>
          ) : displayedItems.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <p className="text-base font-medium">No items found.</p>
              <p className="text-sm mt-1">Try adjusting your filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {displayedItems.map((item) => (
                <ItemCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-3 px-6">
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400">© 2025 FoundIt Fulbright. All rights reserved.</p>
          <div className="flex items-center gap-3 text-gray-400">
            <Twitter size={14} className="hover:text-gray-600 cursor-pointer" />
            <Youtube size={14} className="hover:text-gray-600 cursor-pointer" />
            <Github size={14} className="hover:text-gray-600 cursor-pointer" />
          </div>
        </div>
      </footer>
    </div>
  )
}
