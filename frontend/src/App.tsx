import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Product, QueryInfo, SortOption, ViewMode, CartItem } from './types'
import Chat from './Chat'
import './App.css'
import perfumeIcon from "./assets/perfume.png"

/* ── Constants ──────────────────────────────────────────────────────── */

const CATEGORY_EMOJIS: Record<string, string | JSX.Element> = {
  Perfume: <img src={perfumeIcon} className="perfume-icon" />,
  Cologne: <img src={perfumeIcon} className="perfume-icon" />,
  Foundation: '💄',
  Lipstick: '💋',
  Moisturizers: '💧',
  default: '💅'
}

const CATEGORY_GROUP_MAP: Record<string, string> = {
  Foundation: 'Base', Primer: 'Base', Concealer: 'Base', 'Setting Spray': 'Base', 'BB & CC Cream': 'Base',
  Eyeshadow: 'Eyes', Eyeliner: 'Eyes', Mascara: 'Eyes', Brow: 'Eyes', 'Eye Palettes': 'Eyes', 'Eye Sets': 'Eyes',
  Lipstick: 'Lips', 'Lip Gloss': 'Lips', 'Lip Liner': 'Lips', 'Lip Stain': 'Lips', 'Lip Sets': 'Lips', 'Lip Balm': 'Lips',
  Blush: 'Cheeks', Bronzer: 'Cheeks', Highlighter: 'Cheeks', 'Face Palettes': 'Cheeks',
  Moisturizers: 'Skincare', Cleanser: 'Skincare', Serum: 'Skincare', Toner: 'Skincare', Mask: 'Skincare',
  Sunscreen: 'Skincare', 'Eye Cream': 'Skincare', 'Face Oil': 'Skincare', 'Face Wash': 'Skincare',
  'Acne Treatment': 'Skincare', Exfoliator: 'Skincare', 'Facial Peel': 'Skincare',
  Perfume: 'Fragrance', Cologne: 'Fragrance', 'Body Mist': 'Fragrance',
  Shampoo: 'Hair', Conditioner: 'Hair', 'Hair Styling': 'Hair', 'Hair Oil': 'Hair', 'Hair Mask': 'Hair',
}

const GROUP_ORDER = ['Base', 'Eyes', 'Lips', 'Cheeks', 'Skincare', 'Fragrance', 'Hair', 'Other']

const GROUP_EMOJIS: Record<string, string> = {
  Base: '💄', Eyes: '👁️', Lips: '💋', Cheeks: '🌸',
  Skincare: '💧', Fragrance: '🌹', Hair: '💇', Other: '💅',
}

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'price_asc', label: 'Price ↑' },
  { value: 'price_desc', label: 'Price ↓' },
  { value: 'rating', label: 'Rating' },
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

const QUICK_SEARCHES = [
  'lipstick for a red carpet event',
  'eyeshadow for a glam look',
  'moisturizer for dry skin',
  'perfume for a date night',
  'foundation for oily skin',
  'anti-aging serum',
]

const BUBBLE_CONFIG = Array.from({ length: 12 }, (_, i) => ({
  id: i,
  size: 20 + Math.random() * 60,
  left: 5 + Math.random() * 90,
  duration: 6 + Math.random() * 9,
  delay: Math.random() * 8,
  opacity: 0.06 + Math.random() * 0.12,
}))

/* ── Helper components ──────────────────────────────────────────────── */

function StarRating({ rating }: { rating: number | null }) {
  if (!rating) return null
  const stars = Math.round(rating)
  return (
    <div className="stars">
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} className={i <= stars ? 'star filled' : 'star'}>{i <= stars ? '★' : '☆'}</span>
      ))}
      <span className="rating-num">{rating.toFixed(1)}</span>
    </div>
  )
}

/* ── Product Card ───────────────────────────────────────────────────── */

function ProductCard({
  product, onClick, quantity, overBudget, onAdd, onDecrement
}: {
  product: Product
  onClick: () => void
  quantity: number
  overBudget: boolean
  onAdd: () => void
  onDecrement: () => void
}) {
  const emoji = CATEGORY_EMOJIS[product.category] || CATEGORY_EMOJIS['default']
  const inCart = quantity > 0
  const cardClass = `product-card${inCart ? ' in-cart' : ''}${overBudget && !inCart ? ' over-budget' : ''}`

  return (
    <div className={cardClass} onClick={onClick}>
      {inCart && <span className="cart-badge in-cart-badge">✓ In Cart</span>}
      {overBudget && !inCart && <span className="cart-badge over-budget-badge">Over Budget</span>}

      <div className="card-emoji">{emoji}</div>
      <div className="card-body">
        <div className="card-category">{product.category}</div>
        <div className="card-name">{product.name}</div>
        <div className="card-brand">{product.brand}</div>
        <StarRating rating={product.rating} />

        {product.score !== undefined && product.score !== null && (
          <div className="card-score">
            <span className="score-label">Relevance:</span>
            <span className="score-bar-wrap">
              <span className="score-bar-fill" style={{ width: `${Math.max(0, Math.min(100, product.score * 100))}%` }} />
            </span>
            <span className="score-value">{(product.score * 100).toFixed(1)}%</span>
          </div>
        )}

        {product.matched_keywords && product.matched_keywords.length > 0 && (
          <div className="card-keywords">
            {product.matched_keywords.slice(0, 5).map(kw => (
              <span key={kw} className="keyword-tag">{kw}</span>
            ))}
          </div>
        )}

        {product.good_ingredients && product.good_ingredients.length > 0 && (
          <div className="card-ingredients-good">
            {product.good_ingredients.slice(0, 3).map(ing => (
              <span key={ing} className="ingredient-tag good">✓ {ing}</span>
            ))}
          </div>
        )}

        {product.bad_ingredients && product.bad_ingredients.length > 0 && (
          <div className="card-ingredients-bad">
            {product.bad_ingredients.slice(0, 2).map(ing => (
              <span key={ing} className="ingredient-tag bad">✗ {ing}</span>
            ))}
          </div>
        )}

        <div className="card-footer">
          <span className="card-price">${product.price.toFixed(2)}</span>
          {product.num_reviews && (
            <span className="card-reviews">{product.num_reviews.toLocaleString()} reviews</span>
          )}
        </div>
      </div>

      {inCart ? (
        <div className="card-quantity-controls" onClick={e => e.stopPropagation()}>
          <button className="qty-btn decrement" onClick={onDecrement}>−</button>
          <span className="qty-value">{quantity}</span>
          <button className={`qty-btn increment${overBudget ? ' disabled' : ''}`} disabled={overBudget} onClick={onAdd}>+</button>
        </div>
      ) : (
        <button
          className={`card-cart-btn add${overBudget ? ' disabled' : ''}`}
          onClick={e => { e.stopPropagation(); onAdd() }}
          disabled={overBudget}
        >
          + Add to Cart
        </button>
      )}
    </div>
  )
}

/* ── Product Modal ──────────────────────────────────────────────────── */

function ProductModal({
  product, onClose, quantity, overBudget, onAdd, onDecrement
}: {
  product: Product
  onClose: () => void
  quantity: number
  overBudget: boolean
  onAdd: () => void
  onDecrement: () => void
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const emoji = CATEGORY_EMOJIS[product.category] || CATEGORY_EMOJIS['default']
  const inCart = quantity > 0

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <div className="modal-emoji">{emoji}</div>
        <div className="modal-category">{product.category}</div>
        <h2 className="modal-name">{product.name}</h2>
        <div className="modal-brand">{product.brand}</div>
        <StarRating rating={product.rating} />

        {product.score !== undefined && product.score !== null && (
          <div className="modal-score">
            Similarity Score: <strong>{(product.score * 100).toFixed(1)}%</strong>
          </div>
        )}

        {product.matched_keywords && product.matched_keywords.length > 0 && (
          <div className="modal-keywords">
            <span className="section-label">Matched Keywords</span>
            <div className="keyword-list">
              {product.matched_keywords.map(kw => (
                <span key={kw} className="keyword-tag">{kw}</span>
              ))}
            </div>
          </div>
        )}

        {product.good_ingredients && product.good_ingredients.length > 0 && (
          <div className="modal-section">
            <div className="section-label">Good For Your Skin</div>
            <div className="ingredient-list">
              {product.good_ingredients.map(ing => (
                <span key={ing} className="ingredient-tag good">✓ {ing}</span>
              ))}
            </div>
          </div>
        )}

        {product.bad_ingredients && product.bad_ingredients.length > 0 && (
          <div className="modal-section">
            <div className="section-label">May Not Be Ideal</div>
            <div className="ingredient-list">
              {product.bad_ingredients.map(ing => (
                <span key={ing} className="ingredient-tag bad">✗ {ing}</span>
              ))}
            </div>
          </div>
        )}

        <div className="modal-meta">
          <div className="meta-pill price">${product.price.toFixed(2)}</div>
          {product.size && <div className="meta-pill">{product.size}</div>}
          {product.online_only && <div className="meta-pill badge">Online Only</div>}
          {product.num_reviews && (
            <div className="meta-pill">{product.num_reviews.toLocaleString()} reviews</div>
          )}
        </div>

        {/* Modal cart button with quantity */}
        {inCart ? (
          <div className="modal-quantity-wrapper">
            <div className="modal-quantity-controls">
              <button className="qty-btn decrement" onClick={onDecrement}>−</button>
              <span className="qty-value">{quantity}</span>
              <button className={`qty-btn increment${overBudget ? ' disabled' : ''}`} disabled={overBudget} onClick={onAdd}>+</button>
            </div>
            <div className="modal-cart-price">Total: ${(product.price * quantity).toFixed(2)}</div>
          </div>
        ) : (
          <button
            className={`modal-cart-btn add${overBudget ? ' disabled' : ''}`}
            onClick={() => onAdd()}
            disabled={overBudget}
          >
            + Add to Cart
            <span className="modal-cart-price"> · ${product.price.toFixed(2)}</span>
          </button>
        )}

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

/* ── Category Row ───────────────────────────────────────────────────── */

function CategoryRow({
  group, products, cart, budget, cartTotal, onCardClick, onAdd, onDecrement
}: {
  group: string
  products: Product[]
  cart: CartItem[]
  budget: number
  cartTotal: number
  onCardClick: (p: Product) => void
  onAdd: (p: Product) => void
  onDecrement: (p: Product) => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return
    const amount = 260
    scrollRef.current.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' })
  }

  return (
    <div className="category-row">
      <div className="category-row-header">
        <span className="category-row-emoji">{GROUP_EMOJIS[group] || '💅'}</span>
        <span className="category-row-title">{group}</span>
        <span className="category-row-count">{products.length}</span>
      </div>
      <div className="category-row-track-wrap">
        <button className="scroll-arrow left" onClick={() => scroll('left')} aria-label="Scroll left">‹</button>
        <div className="category-row-track" ref={scrollRef}>
          {products.map(p => {
            const cartItem = cart.find(c => c.product.id === p.id)
            const quantity = cartItem ? cartItem.quantity : 0
            const wouldExceed = budget > 0 && (cartTotal + p.price) > budget
            return (
              <ProductCard
                key={p.id}
                product={p}
                onClick={() => onCardClick(p)}
                quantity={quantity}
                overBudget={wouldExceed}
                onAdd={() => onAdd(p)}
                onDecrement={() => onDecrement(p)}
              />
            )
          })}
        </div>
        <button className="scroll-arrow right" onClick={() => scroll('right')} aria-label="Scroll right">›</button>
      </div>
    </div>
  )
}

/* ── Cart Panel ─────────────────────────────────────────────────────── */

function CartPanel({
  open, cart, budget, onBudgetChange, onAdd, onDecrement, onClose
}: {
  open: boolean
  cart: CartItem[]
  budget: string
  onBudgetChange: (v: string) => void
  onAdd: (p: Product) => void
  onDecrement: (p: Product) => void
  onClose: () => void
}) {
  const total = cart.reduce((s, item) => s + (item.product.price * item.quantity), 0)
  const budgetNum = parseFloat(budget) || 0
  const pct = budgetNum > 0 ? Math.min((total / budgetNum) * 100, 100) : 0
  const over = budgetNum > 0 && total > budgetNum

  const barColor = () => {
    if (budgetNum <= 0) return 'var(--rose)'
    const ratio = total / budgetNum
    if (ratio < 0.5) return '#22c55e'
    if (ratio < 0.8) return '#eab308'
    if (ratio < 1) return '#f97316'
    return '#ef4444'
  }

  return (
    <div className={`cart-panel${open ? ' open' : ''}`}>
      <div className="cart-panel-header">
        <h3>🛒 Your Cart</h3>
        <button className="cart-panel-close" onClick={onClose}>✕</button>
      </div>

      <div className="cart-budget-section">
        <label className="cart-budget-label">Budget</label>
        <div className="cart-budget-input-wrap">
          <span className="cart-budget-dollar">$</span>
          <input
            className="cart-budget-input"
            type="number"
            placeholder="e.g. 100"
            value={budget}
            onChange={e => onBudgetChange(e.target.value)}
            min="0"
          />
        </div>
        {budgetNum > 0 && (
          <div className="budget-bar-wrap">
            <div className="budget-bar-track">
              <div
                className="budget-bar-fill"
                style={{ width: `${pct}%`, background: barColor() }}
              />
            </div>
            <div className={`budget-bar-label${over ? ' over' : ''}`}>
              ${total.toFixed(2)} / ${budgetNum.toFixed(2)}
              {over && <span className="budget-over-tag">Over!</span>}
            </div>
          </div>
        )}
      </div>

      <div className="cart-items">
        {cart.length === 0 && (
          <div className="cart-empty">No items yet — add some products!</div>
        )}
        {cart.map(({product, quantity}) => (
          <div key={product.id} className="cart-item">
            <div className="cart-item-info">
              <span className="cart-item-name">{product.name}</span>
              <span className="cart-item-brand">{product.brand}</span>
            </div>
            <div className="cart-item-actions">
              <span className="cart-item-price">${(product.price * quantity).toFixed(2)}</span>
              <div className="cart-item-qty-controls">
                <button className="qty-btn decrement" onClick={() => onDecrement(product)}>−</button>
                <span className="qty-value">{quantity}</span>
                <button className={`qty-btn increment${over ? ' disabled' : ''}`} disabled={over} onClick={() => onAdd(product)}>+</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="cart-total">
        <span>Total</span>
        <span className="cart-total-price">${total.toFixed(2)}</span>
      </div>
    </div>
  )
}

/* ── Main App ───────────────────────────────────────────────────────── */

export default function App() {
  // Search state
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
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [queryInfo, setQueryInfo] = useState<QueryInfo | null>(null)
  const [skinConcerns, setSkinConcerns] = useState<string[]>([])

  // Cart & budget state
  const [cart, setCart] = useState<CartItem[]>([])
  const [budget, setBudget] = useState('')
  const [cartOpen, setCartOpen] = useState(false)

  // View & sort state
  const [viewMode, setViewMode] = useState<ViewMode>('rows')

  // Chat / RAG state
  const [chatOpen, setChatOpen] = useState(false)
  const [useLlm, setUseLlm] = useState(false)
  const [ragQuery, setRagQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('relevance')

  const budgetNum = parseFloat(budget) || 0
  const cartTotal = cart.reduce((s, item) => s + (item.product.price * item.quantity), 0)
  const cartCount = cart.reduce((s, item) => s + item.quantity, 0)

  // Cart helpers
  const addToCart = (p: Product) => {
    if (budgetNum > 0 && cartTotal + p.price > budgetNum) return
    setCart(prev => {
      const existing = prev.find(item => item.product.id === p.id)
      if (existing) {
        return prev.map(item => item.product.id === p.id ? { ...item, quantity: item.quantity + 1 } : item)
      } else {
        return [...prev, { product: p, quantity: 1 }]
      }
    })
  }
  const decrementFromCart = (p: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === p.id)
      if (!existing) return prev
      if (existing.quantity > 1) {
        return prev.map(item => item.product.id === p.id ? { ...item, quantity: item.quantity - 1 } : item)
      } else {
        return prev.filter(item => item.product.id !== p.id)
      }
    })
  }

  const getQuantity = (p: Product) => {
    const item = cart.find(c => c.product.id === p.id)
    return item ? item.quantity : 0
  }

  const toggleConcern = (key: string) => {
    setSkinConcerns(prev => prev.includes(key) ? prev.filter(c => c !== key) : [...prev, key])
    setPage(1)
  }

  useEffect(() => {
    fetch('/api/categories').then(r => r.json()).then(setCategories).catch(() => {})
    fetch('/api/config').then(r => r.json()).then(cfg => setUseLlm(!!cfg.use_llm)).catch(() => {})
  }, [])

  const hasAnyInput = query || category || minPrice || maxPrice || minRating || skinConcerns.length > 0

  const doSearch = useCallback(async () => {
    if (!hasAnyInput) {
      setResults([]); setTotal(0); setSearched(false); setQueryInfo(null); return
    }
    setLoading(true); setSearched(true)
    try {
      const params = new URLSearchParams()
      if (query) params.set('q', query)
      if (category) params.set('category', category)
      if (minPrice) params.set('min_price', minPrice)
      if (maxPrice) params.set('max_price', maxPrice)
      if (minRating) params.set('min_rating', minRating)
      if (skinConcerns.length > 0) params.set('skin_concerns', skinConcerns.join(','))
      params.set('page', String(page))
      params.set('per_page', '20')
      const res = await fetch(`/api/search?${params.toString()}`)
      const data = await res.json()
      setResults(data.results || []); setTotal(data.total || 0); setQueryInfo(data.query_info || null)
    } catch {
      setResults([]); setTotal(0); setQueryInfo(null)
    } finally { setLoading(false) }
  }, [query, category, minPrice, maxPrice, minRating, skinConcerns, page, hasAnyInput])

  useEffect(() => { doSearch() }, [doSearch])

  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter') setPage(1) }

  const clearAll = () => {
    setQuery(''); setCategory(''); setMinPrice(''); setMaxPrice(''); setMinRating('')
    setPage(1); setTotal(0); setResults([]); setSearched(false); setQueryInfo(null); setSkinConcerns([])
    setRagQuery('')
  }

  // RAG: when the chat returns search results, display them in the main results area
  const handleRagResults = useCallback((ragProducts: Product[], searchQuery: string) => {
    setResults(ragProducts)
    setTotal(ragProducts.length)
    setSearched(true)
    setRagQuery(searchQuery)
    setQueryInfo(null)
  }, [])

  // Sorted results
  const sortedResults = useMemo(() => {
    const arr = [...results]
    switch (sortBy) {
      case 'price_asc': return arr.sort((a, b) => a.price - b.price)
      case 'price_desc': return arr.sort((a, b) => b.price - a.price)
      case 'rating': return arr.sort((a, b) => (b.rating || 0) - (a.rating || 0))
      default: return arr
    }
  }, [results, sortBy])

  // Grouped by category
  const groupedResults = useMemo(() => {
    const groups: Record<string, Product[]> = {}
    for (const p of sortedResults) {
      const group = CATEGORY_GROUP_MAP[p.category] || 'Other'
      if (!groups[group]) groups[group] = []
      groups[group].push(p)
    }
    return GROUP_ORDER.filter(g => groups[g]?.length).map(g => ({ group: g, products: groups[g] }))
  }, [sortedResults])

  return (
    <div className={`app${cartOpen ? ' cart-open' : ''}`}>
      {/* ── Header with floating bubbles ─────────────────────────────── */}
      <header className="header">
        {BUBBLE_CONFIG.map(b => (
          <div
            key={b.id}
            className="bubble"
            style={{
              width: b.size, height: b.size,
              left: `${b.left}%`,
              animationDuration: `${b.duration}s`,
              animationDelay: `${b.delay}s`,
              opacity: b.opacity,
            }}
          />
        ))}
        <div className="header-inner">
          <div className="header-top-row">
            <div className="logo">
              <span className="logo-icon">🌸</span>
              <span className="logo-text">BeautyBytes</span>
            </div>
            {useLlm && (
              <button
                className={`header-chat-btn ${chatOpen ? 'active' : ''}`}
                onClick={() => setChatOpen(o => !o)}
              >
                💬 Ask AI
              </button>
            )}
            <button
              className="header-cart-btn"
              onClick={() => setCartOpen(o => !o)}
            >
              🛒
              {cartCount > 0 && <span className="cart-count-badge">{cartCount}</span>}
              {budgetNum > 0 && cartCount === 0 && <span className="header-budget-tag">${budgetNum}</span>}
            </button>
          </div>
          <p className="tagline">Search Sephora products</p>
        </div>
      </header>

      <main className="main">
        {/* ── Search box ────────────────────────────────────────────── */}
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
              {query && <button className="clear-input" onClick={() => setQuery('')}>✕</button>}
            </div>
            <button className="search-btn" onClick={() => setPage(1)}>Search</button>
          </div>

          <div className="quick-searches">
            <span className="quick-label">Try:</span>
            {QUICK_SEARCHES.map(q => (
              <button key={q} className="quick-chip" onClick={() => { setQuery(q); setPage(1) }}>{q}</button>
            ))}
          </div>

          <div className="filter-row">
            <button className={`filter-toggle ${showFilters ? 'active' : ''}`} onClick={() => setShowFilters(f => !f)}>
              ⚙ Filters {showFilters ? '▲' : '▼'}
            </button>
            {(category || minPrice || maxPrice || minRating || skinConcerns.length > 0) && (
              <button className="clear-filters" onClick={clearAll}>Clear all</button>
            )}
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
                <input type="number" placeholder="0" value={minPrice} onChange={e => setMinPrice(e.target.value)} min="0" />
              </div>
              <div className="filter-group">
                <label>Max Price ($)</label>
                <input type="number" placeholder="500" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} min="0" />
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

          <div className="skin-concerns-section">
            <div className="skin-concerns-label">Skin Concerns (optional)</div>
            <div className="skin-concerns-chips">
              {SKIN_CONCERN_OPTIONS.map(({ key, label, icon }) => (
                <button key={key} className={`concern-chip ${skinConcerns.includes(key) ? 'active' : ''}`} onClick={() => toggleConcern(key)}>
                  <span className="concern-icon">{icon}</span>
                  {label}
                </button>
              ))}
            </div>
            {skinConcerns.length > 0 && (
              <div className="concern-note">Results will prioritize products with ingredients suited for your concerns</div>
            )}
          </div>
        </div>

        {loading && (
          <div className="loading">
            <div className="loading-dots"><span /><span /><span /></div>
            <p>Searching products...</p>
          </div>
        )}

        {/* RAG query banner */}
        {!loading && searched && ragQuery && (
          <div className="expansion-banner rag-banner">
            <span className="expansion-icon">🤖</span>
            <span>
              AI searched for: <strong className="expansion-label">"{ragQuery}"</strong>
              {' '}— showing retrieved products below
            </span>
          </div>
        )}

        {/* Expansion banner */}
        {!loading && searched && queryInfo && queryInfo.expansion_labels && queryInfo.expansion_labels.length > 0 && (
          <div className="expansion-banner">
            <span className="expansion-icon">✨</span>
            <span>
              Detected context: {queryInfo.expansion_labels.map(label => (
                <strong key={label} className="expansion-label">"{label}"</strong>
              ))}
              {' '}— expanded search to include related product terms
            </span>
          </div>
        )}

        {/* ── Results toolbar ───────────────────────────────────────── */}
        {!loading && searched && (
          <div className="results-toolbar">
            <div className="results-header">
              <span className="results-count">
                {results.length > 0
                  ? `${total} products found`
                  : 'No products found. Try another search.'}
              </span>
              {query && <span className="results-query">for "{query}"</span>}
            </div>
            <div className="toolbar-controls">
              <select
                className="sort-select"
                value={sortBy}
                onChange={e => setSortBy(e.target.value as SortOption)}
              >
                {SORT_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <button
                className={`view-toggle-btn ${viewMode === 'rows' ? 'active' : ''}`}
                onClick={() => setViewMode('rows')}
                title="Category rows"
              >☰</button>
              <button
                className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
                title="Grid view"
              >⊞</button>
              <button
                className="cart-toggle-btn"
                onClick={() => setCartOpen(o => !o)}
              >
                🛒
                {cartCount > 0 && <span className="cart-count-badge">{cartCount}</span>}
              </button>
            </div>
          </div>
        )}

        {/* ── Results: Row view ─────────────────────────────────────── */}
        {!loading && sortedResults.length > 0 && viewMode === 'rows' && (
          <div className="category-rows">
            {groupedResults.map(({ group, products }) => (
              <CategoryRow
                key={group}
                group={group}
                products={products}
                cart={cart}
                budget={budgetNum}
                cartTotal={cartTotal}
                onCardClick={setSelected}
                onAdd={addToCart}
                onDecrement={decrementFromCart}
              />
            ))}
          </div>
        )}

        {/* ── Results: Grid view ────────────────────────────────────── */}
        {!loading && sortedResults.length > 0 && viewMode === 'grid' && (
          <div className="product-grid">
            {sortedResults.map(p => {
              const quantity = getQuantity(p)
              const wouldExceed = budgetNum > 0 && (cartTotal + p.price) > budgetNum
              return (
                <ProductCard
                  key={p.id}
                  product={p}
                  onClick={() => setSelected(p)}
                  quantity={quantity}
                  overBudget={wouldExceed}
                  onAdd={() => addToCart(p)}
                  onDecrement={() => decrementFromCart(p)}
                />
              )
            })}
          </div>
        )}

        {/* Pagination */}
        {!loading && total > 20 && (
          <div className="pagination">
            <button className="page-btn" onClick={() => setPage(page - 1)} disabled={page === 1}>Previous</button>
            <span className="page-info">Page {page} of {Math.ceil(total / 20)}</span>
            <button className="page-btn" onClick={() => setPage(page + 1)} disabled={page >= Math.ceil(total / 20)}>Next</button>
          </div>
        )}

        {!loading && !searched && (
          <div className="empty-state">
            <div className="empty-flowers">🌸 💄 ✨ 🌹 💅</div>
            <h3>Search the catalog</h3>
            <p>Browse 500+ Sephora products with natural language.<br />
              Try situational searches like "lipstick for a red carpet event"<br />
              or "moisturizer for dry skin".</p>
          </div>
        )}
      </main>

      {/* ── Chat panel (RAG) ───────────────────────────────────────── */}
      {useLlm && (
        <div className={`chat-panel${chatOpen ? ' open' : ''}`}>
          <div className="chat-panel-header">
            <h3>💬 AI Assistant</h3>
            <button className="chat-panel-close" onClick={() => setChatOpen(false)}>✕</button>
          </div>
          <Chat onSearchResults={handleRagResults} />
        </div>
      )}
      {chatOpen && <div className="chat-backdrop" onClick={() => setChatOpen(false)} />}

      {/* ── Cart panel ────────────────────────────────────────────── */}
      <CartPanel
        open={cartOpen}
        cart={cart}
        budget={budget}
        onBudgetChange={setBudget}
        onAdd={addToCart}
        onDecrement={decrementFromCart}
        onClose={() => setCartOpen(false)}
      />

      {/* ── Backdrop when cart is open ────────────────────────────── */}
      {cartOpen && <div className="cart-backdrop" onClick={() => setCartOpen(false)} />}

      {/* ── Product Modal ─────────────────────────────────────────── */}
      {selected && (
        <ProductModal
          product={selected}
          onClose={() => setSelected(null)}
          quantity={getQuantity(selected)}
          overBudget={budgetNum > 0 && (cartTotal + selected.price) > budgetNum}
          onAdd={() => addToCart(selected)}
          onDecrement={() => decrementFromCart(selected)}
        />
      )}
    </div>
  )
}