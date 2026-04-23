import { Product } from '../types'

const CATEGORY_EMOJIS: Record<string, string> = {
  Foundation: '💄',
  Lipstick: '💋',
  Moisturizers: '💧',
  default: '💅'
}

export default function ProductCard({
  product, 
  onClick, 
  quantity, 
  overBudget, 
  onAdd, 
  onDecrement
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
  
  // Highlighting logically overrides base card class
  let cardClass = `product-card${inCart ? ' in-cart' : ''}${overBudget && !inCart ? ' over-budget' : ''}`
  if (product.is_top_recommendation) {
    cardClass += ' top-recommendation'
  }

  return (
    <div className={cardClass} onClick={onClick}>
      {inCart && <span className="cart-badge in-cart-badge">✓ In Cart</span>}
      {overBudget && !inCart && <span className="cart-badge over-budget-badge">Over Budget</span>}

      <div className="card-emoji">{emoji}</div>
      <div className="card-body">
        <div className="card-category">{product.category}</div>
        <div className="card-name">{product.name}</div>
        <div className="card-brand">{product.brand}</div>
        
        {/* Basic Rendering of star ratings (could abstract this, for now keep inline) */}
        {product.rating && (
          <div className="stars">
            {[1, 2, 3, 4, 5].map(i => (
              <span key={i} className={i <= Math.round(product.rating!) ? 'star filled' : 'star'}>
                {i <= Math.round(product.rating!) ? '★' : '☆'}
              </span>
            ))}
            <span className="rating-num">{product.rating.toFixed(1)}</span>
          </div>
        )}

        <div className="card-footer">
          <span className="card-price">${product.price.toFixed(2)}</span>
          {product.num_reviews && (
            <span className="card-reviews">{product.num_reviews.toLocaleString()} reviews</span>
          )}
        </div>

        {product.ai_reasoning && (
          <div className="ai-reasoning-section">
            <div className="ai-reasoning-label">✨ Why this was recommended</div>
            <div className="ai-reasoning-text">{product.ai_reasoning}</div>
          </div>
        )}

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
