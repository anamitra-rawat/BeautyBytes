import { KeyboardEvent } from 'react'

const QUICK_SEARCHES = [
  'lipstick for a red carpet event',
  'eyeshadow for a glam look',
  'moisturizer for dry skin',
  'perfume for a date night',
  'foundation for oily skin',
  'anti-aging serum',
]

const SKIN_CONCERN_OPTIONS = [
  { key: 'acne', label: 'Acne', icon: '🔴' },
  { key: 'dry_skin', label: 'Dry Skin', icon: '🏜️' },
  { key: 'oily_skin', label: 'Oily Skin', icon: '💧' },
  { key: 'sensitive', label: 'Sensitive', icon: '🌸' },
  { key: 'aging', label: 'Aging', icon: '⏳' },
  { key: 'dark_spots', label: 'Dark Spots', icon: '🔵' },
  { key: 'redness', label: 'Redness', icon: '🩹' },
]

export default function SearchBar({
  query,
  setQuery,
  onSearch,
  loading,
  categories,
  category,
  setCategory,
  minPrice,
  setMinPrice,
  maxPrice,
  setMaxPrice,
  minRating,
  setMinRating,
  skinConcerns,
  toggleConcern,
  clearAll,
  showFilters,
  setShowFilters,
  hasAnyInput,
  searchMode,
  setSearchMode,
}: {
  query: string
  setQuery: (q: string) => void
  onSearch: () => void
  loading: boolean
  categories: string[]
  category: string
  setCategory: (c: string) => void
  minPrice: string
  setMinPrice: (p: string) => void
  maxPrice: string
  setMaxPrice: (p: string) => void
  minRating: string
  setMinRating: (r: string) => void
  skinConcerns: string[]
  toggleConcern: (k: string) => void
  clearAll: () => void
  showFilters: boolean
  setShowFilters: (s: boolean | ((prev: boolean) => boolean)) => void
  hasAnyInput: boolean
  searchMode: 'svd' | 'tfidf'
  setSearchMode: (m: 'svd' | 'tfidf') => void
}) {
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') onSearch()
  }

  return (
    <div className="search-box">
      <div className="search-row">
        <div className="search-input-wrap">
          <span className="search-icon">🔍</span>
          <input
            className="search-input"
            type="text"
            placeholder="Try: 'lipstick for a red carpet event' or 'moisturizer for dry skin'"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          {query && (
            <button className="clear-input" onClick={() => setQuery('')} aria-label="Clear search">✕</button>
          )}
        </div>
        <button
          className="search-btn"
          onClick={onSearch}
          disabled={loading || !hasAnyInput}
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>

      {/* Search Mode Toggle */}
      <div className="search-mode-toggle">
        <span className="search-mode-label">Search Engine:</span>
        <div className="mode-switch">
          <button
            className={`mode-btn ${searchMode === 'svd' ? 'active' : ''}`}
            onClick={() => setSearchMode('svd')}
          >
            🧠 SVD (Semantic)
          </button>
          <button
            className={`mode-btn ${searchMode === 'tfidf' ? 'active' : ''}`}
            onClick={() => setSearchMode('tfidf')}
          >
            📝 TF-IDF (Keyword)
          </button>
        </div>
      </div>

      <div className="quick-searches">
        <span className="quick-label">Try:</span>
        {QUICK_SEARCHES.map(qs => (
          <button
            key={qs}
            className="quick-chip"
            onClick={() => { setQuery(qs); /* Will let user hit Search manually */ }}
          >
            {qs}
          </button>
        ))}
        <button className={`filter-toggle ${showFilters ? 'active' : ''}`} onClick={() => setShowFilters(s => !s)}>
          {showFilters ? 'Hide Filters ▲' : '⚙ Filters ▼'}
        </button>
        {hasAnyInput && (
          <button className="clear-filters" onClick={clearAll}>Clear all</button>
        )}
      </div>

      {/* Skin Concerns (always visible context) */}
      <div className="concerns-row">
        <span className="quick-label">SKIN CONCERNS (OPTIONAL):</span>
        <div className="concern-chips">
          {SKIN_CONCERN_OPTIONS.map(opt => {
            const active = skinConcerns.includes(opt.key)
            return (
              <button
                key={opt.key}
                className={`concern-chip ${active ? 'active' : ''}`}
                onClick={() => toggleConcern(opt.key)}
              >
                {opt.icon} {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      {showFilters && (
        <div className="filters">
          <div className="filter-group">
            <label>Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)}>
              <option value="">All Categories</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="filter-group">
            <label>Min Price ($)</label>
            <input type="number" placeholder="0" value={minPrice} onChange={e => setMinPrice(e.target.value)} />
          </div>
          <div className="filter-group">
            <label>Max Price ($)</label>
            <input type="number" placeholder="Any" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} />
          </div>
          <div className="filter-group">
            <label>Min Rating</label>
            <select value={minRating} onChange={e => setMinRating(e.target.value)}>
              <option value="">Any</option>
              <option value="4">4.0+ Stars</option>
              <option value="4.5">4.5+ Stars</option>
            </select>
          </div>
        </div>
      )}
    </div>
  )
}
