import { useState, useEffect, useCallback } from 'react'
import { Product } from './types'
import './App.css'

const CATEGORY_EMOJIS: Record<string, string> = {
  'Perfume': '🌸', 'Cologne': '✨', 'Foundation': '💄', 'Lipstick': '💋',
  'Moisturizers': '💧', 'Face Serums': '🌿', 'Eye Palettes': '👁️',
  'Mascara': '✨', 'Highlighter': '✨', 'Blush': '🌹', 'Concealer': '🎨',
  'Face Masks': '🧖', 'Shampoo': '🌺', 'Conditioner': '💆',
  'Hair Styling Products': '💇', 'Face Wash & Cleansers': '🫧',
  'Face Primer': '🪄', 'default': '💅'
}

function StarRating({ rating }: { rating: number | null }) {
  if (!rating) return null
  const stars = Math.round(rating)
  return (
    <div className="stars">
      {[1,2,3,4,5].map(i => (
        <span key={i} className={i <= stars ? 'star filled' : 'star'}>{i <= stars ? '★' : '☆'}</span>
      ))}
      <span className="rating-num">{rating.toFixed(1)}</span>
    </div>
  )
}

function ProductCard({ product, onClick }: { product: Product; onClick: () => void }) {
  const emoji = CATEGORY_EMOJIS[product.category] || CATEGORY_EMOJIS['default']
  return (
    <div className="product-card" onClick={onClick}>
      <div className="card-emoji">{emoji}</div>
      <div className="card-body">
        <div className="card-category">{product.category}</div>
        <div className="card-name">{product.name}</div>
        <div className="card-brand">{product.brand}</div>
        <StarRating rating={product.rating} />
        <div className="card-footer">
          <span className="card-price">${product.price.toFixed(2)}</span>
          {product.num_reviews && (
            <span className="card-reviews">{product.num_reviews.toLocaleString()} reviews</span>
          )}
        </div>
      </div>
    </div>
  )
}

function ProductModal({ product, onClose }: { product: Product; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const emoji = CATEGORY_EMOJIS[product.category] || CATEGORY_EMOJIS['default']

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <div className="modal-emoji">{emoji}</div>
        <div className="modal-category">{product.category}</div>
        <h2 className="modal-name">{product.name}</h2>
        <div className="modal-brand">{product.brand}</div>
        <StarRating rating={product.rating} />

        <div className="modal-meta">
          <div className="meta-pill price">${product.price.toFixed(2)}</div>
          {product.size && <div className="meta-pill">{product.size}</div>}
          {product.online_only && <div className="meta-pill badge">Online Only</div>}
          {product.num_reviews && (
            <div className="meta-pill">{product.num_reviews.toLocaleString()} reviews</div>
          )}
        </div>

        {product.details && (
          <div className="modal-section">
            <div className="section-label">About</div>
            <p className="section-text">{product.details}</p>
          </div>
        )}

        {product.ingredients && (
          <div className="modal-section">
            <div className="section-label">Key Ingredients</div>
            <p className="section-text ingredients">{product.ingredients}</p>
          </div>
        )}

        {product.url && (
          <a href={product.url} target="_blank" rel="noreferrer" className="shop-btn">
            View on Sephora →
          </a>
        )}
      </div>
    </div>
  )
}

export default function App() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [minRating, setMinRating] = useState('')
  const [results, setResults] = useState<Product[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [selected, setSelected] = useState<Product | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    fetch('/api/categories')
      .then(r => r.json())
      .then(setCategories)
      .catch(() => {})
  }, [])

  const doSearch = useCallback(async () => {
    setLoading(true)
    setSearched(true)
    try {
      const params = new URLSearchParams()
      if (query) params.set('q', query)
      if (category) params.set('category', category)
      if (minPrice) params.set('min_price', minPrice)
      if (maxPrice) params.set('max_price', maxPrice)
      if (minRating) params.set('min_rating', minRating)
      const res = await fetch(`/api/search?${params}`)
      const data = await res.json()
      setResults(data)
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [query, category, minPrice, maxPrice, minRating])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') doSearch()
  }

  const clearAll = () => {
    setQuery(''); setCategory(''); setMinPrice(''); setMaxPrice(''); setMinRating('')
    setResults([]); setSearched(false)
  }

  const QUICK_SEARCHES = [
    'luminous foundation', 'anti-aging serum', 'floral perfume',
    'matte lipstick', 'shimmery eyeshadow', 'hydrating moisturizer'
  ]

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <div className="logo">
            <span className="logo-icon">🌸</span>
            <span className="logo-text">BeautyBytes</span>
          </div>
          <p className="tagline">Search Sephora products</p>
        </div>
        <div className="header-petal p1" />
        <div className="header-petal p2" />
        <div className="header-petal p3" />
      </header>

      <main className="main">
        <div className="search-box">
          <div className="search-row">
            <div className="search-input-wrap">
              <span className="search-icon">🔍</span>
              <input
                className="search-input"
                type="text"
                placeholder="Search by product, brand, ingredient, or category"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              {query && (
                <button className="clear-input" onClick={() => setQuery('')}>✕</button>
              )}
            </div>
            <button className="search-btn" onClick={doSearch}>
              Search
            </button>
          </div>

          {!searched && (
            <div className="quick-searches">
              <span className="quick-label">Try:</span>
              {QUICK_SEARCHES.map(q => (
                <button key={q} className="quick-chip" onClick={() => {
                  setQuery(q); setTimeout(() => {
                    setQuery(q)
                  }, 0)
                }}>
                  {q}
                </button>
              ))}
            </div>
          )}

          <div className="filter-row">
            <button
              className={`filter-toggle ${showFilters ? 'active' : ''}`}
              onClick={() => setShowFilters(f => !f)}
            >
              ⚙ Filters {showFilters ? '▲' : '▼'}
            </button>
            {(category || minPrice || maxPrice || minRating) && (
              <button className="clear-filters" onClick={clearAll}>Clear all</button>
            )}
          </div>

          {showFilters && (
            <div className="filters">
              <div className="filter-group">
                <label>Category</label>
                <select value={category} onChange={e => setCategory(e.target.value)}>
                  <option value="">All Categories</option>
                  {categories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="filter-group">
                <label>Min Price ($)</label>
                <input type="number" placeholder="0" value={minPrice}
                  onChange={e => setMinPrice(e.target.value)} min="0" />
              </div>
              <div className="filter-group">
                <label>Max Price ($)</label>
                <input type="number" placeholder="500" value={maxPrice}
                  onChange={e => setMaxPrice(e.target.value)} min="0" />
              </div>
              <div className="filter-group">
                <label>Min Rating</label>
                <select value={minRating} onChange={e => setMinRating(e.target.value)}>
                  <option value="">Any Rating</option>
                  <option value="3">3+ ★★★</option>
                  <option value="3.5">3.5+ ★★★½</option>
                  <option value="4">4+ ★★★★</option>
                  <option value="4.5">4.5+ ★★★★½</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {loading && (
          <div className="loading">
            <div className="loading-dots">
              <span /><span /><span />
            </div>
            <p>Searching products...</p>
          </div>
        )}

        {!loading && searched && (
          <div className="results-header">
            <span className="results-count">
              {results.length > 0
                ? `${results.length} products found`
                : 'No products found. Try another search.'}
            </span>
            {query && <span className="results-query">for "{query}"</span>}
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className="product-grid">
            {results.map(p => (
              <ProductCard key={p.id} product={p} onClick={() => setSelected(p)} />
            ))}
          </div>
        )}

        {!loading && !searched && (
          <div className="empty-state">
            <div className="empty-flowers">🌸 💄 ✨ 🌹 💅</div>
            <h3>Search the catalog</h3>
            <p>Browse 500+ Sephora products with natural language.<br />
            Search by product type, ingredient, brand, or use case.</p>
          </div>
        )}
      </main>

      {selected && (
        <ProductModal product={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}
