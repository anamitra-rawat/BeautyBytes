import { useState, useCallback, useEffect, useMemo } from 'react'
import { Product, AIOverview, CartItem } from './types'

// Modular Components
import StartPage from './components/StartPage'
import SearchBar from './components/SearchBar'
import AIOverviewCard from './components/AIOverviewCard'
import SVDAnalysisCard from './components/SVDAnalysisCard'
import ProductGrid from './components/ProductGrid'
import ProductCard from './components/ProductCard'
import FollowUpPanel from './components/FollowUpPanel'

import './App.css'
import perfumeIcon from "./assets/perfume.png"

const CATEGORY_EMOJIS: Record<string, string | JSX.Element> = {
  Perfume: <img src={perfumeIcon} className="perfume-icon" alt="" />,
  Cologne: <img src={perfumeIcon} className="perfume-icon" alt="" />,
  Foundation: '💄',
  Lipstick: '💋',
  Moisturizers: '💧',
  default: '💅'
}

/* ── Inline Helpers & Components (kept for brevity) ─────────────────── */
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

        {product.ai_reasoning && (
          <div className="modal-section" style={{ background: 'var(--rose-pale)', padding: '12px', borderRadius: '8px' }}>
            <div className="section-label">✨ AI Reasoning</div>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text)' }}>{product.ai_reasoning}</p>
          </div>
        )}

        <div className="modal-meta">
          <div className="meta-pill price">${product.price.toFixed(2)}</div>
          {product.size && <div className="meta-pill">{product.size}</div>}
          {product.online_only && <div className="meta-pill badge">Online Only</div>}
        </div>

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
          <button className={`modal-cart-btn add${overBudget ? ' disabled' : ''}`} onClick={() => onAdd()} disabled={overBudget}>
            + Add to Cart
            <span className="modal-cart-price"> · ${product.price.toFixed(2)}</span>
          </button>
        )}
      </div>
    </div>
  )
}

function CartPanel({
  open, cart, budget, onBudgetChange, onAdd, onDecrement, onClose
}: {
  open: boolean, cart: CartItem[], budget: string, onBudgetChange: (v: string) => void
  onAdd: (p: Product) => void, onDecrement: (p: Product) => void, onClose: () => void
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
          <input className="cart-budget-input" type="number" value={budget} onChange={e => onBudgetChange(e.target.value)} />
        </div>
        {budgetNum > 0 && (
          <div className="budget-bar-wrap">
            <div className="budget-bar-track">
              <div className="budget-bar-fill" style={{ width: `${pct}%`, background: barColor() }} />
            </div>
            <div className={`budget-bar-label${over ? ' over' : ''}`}>${total.toFixed(2)} / ${budgetNum.toFixed(2)}</div>
          </div>
        )}
      </div>
      <div className="cart-items">
        {cart.length === 0 && <div className="cart-empty">No items yet</div>}
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
    </div>
  )
}

/* ── Main App ───────────────────────────────────────────────────────── */

export default function App() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [minRating, setMinRating] = useState('')
  const [skinConcerns, setSkinConcerns] = useState<string[]>([])
  
  const [results, setResults] = useState<Product[]>([])
  const [aiOverview, setAiOverview] = useState<AIOverview | null>(null)
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [started, setStarted] = useState(false)
  const [selected, setSelected] = useState<Product | null>(null)
  
  const [showFilters, setShowFilters] = useState(false)
  const [useLlm, setUseLlm] = useState(false)
  const [searchMode, setSearchMode] = useState<'svd' | 'tfidf'>('svd')

  // Cart & budget state
  const [cart, setCart] = useState<CartItem[]>([])
  const [budget, setBudget] = useState('')
  const [cartOpen, setCartOpen] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)

  const budgetNum = parseFloat(budget) || 0
  const cartTotal = cart.reduce((s, item) => s + (item.product.price * item.quantity), 0)
  const cartCount = cart.reduce((s, item) => s + item.quantity, 0)
  
  const hasAnyInput = Boolean(query || category || minPrice || maxPrice || minRating || skinConcerns.length > 0)

  useEffect(() => {
    fetch('/api/categories').then(r => r.json()).then(setCategories).catch(() => {})
    fetch('/api/config').then(r => r.json()).then(cfg => setUseLlm(!!cfg.use_llm)).catch(() => {})
  }, [])

  const doSearch = useCallback(async () => {
    if (!hasAnyInput) return
    setLoading(true)
    setSearched(true)
    setAiOverview(null)

    // Compile filters
    const filtersArr = []
    if (category) filtersArr.push(`Category: ${category}`)
    if (minPrice) filtersArr.push(`Min Price: $${minPrice}`)
    if (maxPrice) filtersArr.push(`Max Price: $${maxPrice}`)
    if (minRating) filtersArr.push(`Min Rating: ${minRating}`)
    if (skinConcerns.length) filtersArr.push(`Concerns: ${skinConcerns.join(', ')}`)
    const filtersText = filtersArr.join(' | ')

    try {
      if (useLlm) {
         const response = await fetch('/api/search_ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: query, filters: filtersText, search_mode: searchMode })
        })
        const data = await response.json()
        
        // Enrich products with LLM reasoning and top recommendation flag
        const enrichedResults = (data.search_results || []).map((p: any) => ({
          ...p,
          ai_reasoning: data.product_reasoning?.[p.id?.toString()],
          is_top_recommendation: data.recommended_product_ids?.includes(p.id)
        }))
        
        setResults(enrichedResults)
        setAiOverview({
          search_query: data.search_query,
          overview: data.overview,
          recommended_product_ids: data.recommended_product_ids,
          svd_query_themes: data.query_info?.svd_query_themes
        })

      } else {
        // Fallback standard search
        const qParams = new URLSearchParams()
        if (query) qParams.set('q', query)
        if (category) qParams.set('category', category)
        if (minPrice) qParams.set('min_price', minPrice)
        if (maxPrice) qParams.set('max_price', maxPrice)
        if (minRating) qParams.set('min_rating', minRating)
        skinConcerns.forEach(c => qParams.append('concerns', c))
        qParams.set('search_mode', searchMode)

        const res = await fetch(`/api/search?${qParams.toString()}`)
        const data = await res.json()
        setResults(data.results || [])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [query, category, minPrice, maxPrice, minRating, skinConcerns, hasAnyInput, useLlm, searchMode])

  const clearAll = () => {
    setQuery(''); setCategory(''); setMinPrice(''); setMaxPrice(''); setMinRating(''); setSkinConcerns([])
    setResults([]); setSearched(false); setAiOverview(null)
  }

  const toggleConcern = (key: string) => setSkinConcerns(p => p.includes(key) ? p.filter(c => c !== key) : [...p, key])

  // Cart operations
  const addToCart = (p: Product) => {
    if (budgetNum > 0 && cartTotal + p.price > budgetNum) return
    setCart(prev => {
      const existing = prev.find(item => item.product.id === p.id)
      return existing 
        ? prev.map(item => item.product.id === p.id ? { ...item, quantity: item.quantity + 1 } : item)
        : [...prev, { product: p, quantity: 1 }]
    })
  }

  const decrementFromCart = (p: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === p.id)
      if (!existing) return prev
      return existing.quantity > 1
        ? prev.map(item => item.product.id === p.id ? { ...item, quantity: item.quantity - 1 } : item)
        : prev.filter(item => item.product.id !== p.id)
    })
  }
  const getQuantity = (p: Product) => cart.find(c => c.product.id === p.id)?.quantity || 0

  // Derive Current Context String for Follow-Up
  const currentContextString = useMemo(() => {
    if (!results.length) return "No products retrieved currently."
    return results.slice(0, 10).map(p => 
      `[${p.id}] ${p.name} (${p.brand}) - $${p.price}`
    ).join('\n')
  }, [results])

  if (!started) {
    return <StartPage onStart={() => setStarted(true)} />
  }

  return (
    <div className={`app${cartOpen ? ' cart-open' : ''}`}>
      <header className="header">
        <div className="header-inner">
          <div className="header-top-row">
            <div className="logo" onClick={() => { setSearched(false); clearAll(); }} style={{cursor: 'pointer'}}>
              <span className="logo-icon">🌸</span>
              <span className="logo-text">BeautyBytes</span>
            </div>
            
            {searched && useLlm && results.length > 0 && (
              <button className={`header-chat-btn pulse-animation ${chatOpen ? 'active' : ''}`} onClick={() => setChatOpen(o => !o)}>
                💬 Ask Follow-Up
              </button>
            )}

            <button className="header-cart-btn" onClick={() => setCartOpen(o => !o)}>
              🛒
              {cartCount > 0 && <span className="cart-count-badge">{cartCount}</span>}
              {budgetNum > 0 && cartCount === 0 && <span className="header-budget-tag">${budgetNum}</span>}
            </button>
          </div>
        </div>
      </header>

      <main className="main">

        <SearchBar
          query={query} setQuery={setQuery}
          onSearch={doSearch} loading={loading}
          categories={categories} category={category} setCategory={setCategory}
          minPrice={minPrice} setMinPrice={setMinPrice}
          maxPrice={maxPrice} setMaxPrice={setMaxPrice}
          minRating={minRating} setMinRating={setMinRating}
          skinConcerns={skinConcerns} toggleConcern={toggleConcern}
          clearAll={clearAll}
          showFilters={showFilters} setShowFilters={setShowFilters}
          hasAnyInput={hasAnyInput}
          searchMode={searchMode} setSearchMode={setSearchMode}
        />

        {loading && (
          <div className="loading">
            <div className="loading-dots"><span/><span/><span/></div>
            <p>AI is analyzing the catalog...</p>
          </div>
        )}

        {!loading && searched && (
          <div className="results-layout">
            <div className="results-main">
              <AIOverviewCard data={aiOverview} />
              
              {results.length > 0 ? (
                 <>
                   {aiOverview && aiOverview.recommended_product_ids?.length > 0 && (
                     <div style={{ marginBottom: '16px', fontSize: '0.85rem', color: '#16a34a', fontWeight: 600 }}>
                       <span style={{ marginRight: '6px' }}>✨</span> Legend: Items glowing green are the top AI recommendations.
                     </div>
                   )}
                   <ProductGrid>
                     {results.map(p => {
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
                   </ProductGrid>
                 </>
              ) : (
                 <div style={{textAlign: 'center', marginTop: '40px', color: 'var(--text-muted)'}}>
                   <p>No products found for this search.</p>
                 </div>
              )}
            </div>
            
            <div className="results-sidebar">
              {searchMode === 'svd' && <SVDAnalysisCard data={aiOverview} />}
              {searchMode === 'tfidf' && (
                <div className="ai-overview-card" style={{ height: 'fit-content' }}>
                  <div className="ai-overview-header" style={{ marginBottom: '12px' }}>
                    <span className="ai-icon">📄</span>
                    <h3 className="ai-title">TF-IDF Search</h3>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                    Results are ranked by raw TF-IDF cosine similarity — exact keyword matching without latent semantic analysis.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <FollowUpPanel
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        currentContext={currentContextString}
      />

      <CartPanel open={cartOpen} cart={cart} budget={budget} onBudgetChange={setBudget} 
        onAdd={addToCart} onDecrement={decrementFromCart} onClose={() => setCartOpen(false)} />
      {cartOpen && <div className="cart-backdrop" onClick={() => setCartOpen(false)} />}

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

