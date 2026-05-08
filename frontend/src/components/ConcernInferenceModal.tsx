export default function ConcernInferenceModal({
  concerns, onAccept, onDecline
}: {
  concerns: string[]
  onAccept: () => void
  onDecline: () => void
}) {
  const concernLabels: Record<string, string> = {
    acne: '🔴 Acne',
    dry_skin: '🏜️ Dry Skin',
    oily_skin: '💧 Oily Skin',
    sensitive: '🌸 Sensitive',
    aging: '⏳ Aging',
    dark_spots: '🔵 Dark Spots',
    redness: '🩹 Redness'
  }

  return (
    <div className="modal-overlay" style={{ zIndex: 10000 }}>
      <div className="modal" style={{ textAlign: 'center', padding: '32px' }}>
        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>✨</div>
        <h2 style={{ marginBottom: '12px', color: 'var(--text)' }}>Enhance Your Search?</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '24px', lineHeight: 1.5 }}>
          AI is inferring you have these skin concerns based on your query:<br /><br />
          <strong style={{ fontSize: '1.1rem', color: 'var(--rose-dark)' }}>{concerns.map(c => concernLabels[c] || c).join('  ·  ')}</strong>
        </p>
        <p style={{ color: 'var(--text)', marginBottom: '24px', fontWeight: 500 }}>
          Would you like to apply them as filters?
        </p>
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
          <button className="modal-cart-btn" onClick={onDecline} style={{ background: 'var(--surface-sunken)', color: 'var(--text)' }}>
            No Thanks
          </button>
          <button className="modal-cart-btn add" onClick={onAccept}>
            Yes, Apply Filters
          </button>
        </div>
      </div>
    </div>
  )
}
