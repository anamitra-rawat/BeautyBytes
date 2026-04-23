import { useEffect, useState } from 'react'

export default function StartPage({ onStart }: { onStart: () => void }) {
  const [bubbles, setBubbles] = useState<any[]>([])

  useEffect(() => {
    // Generate bubbles once on mount
    const newBubbles = Array.from({ length: 15 }, (_, i) => ({
      id: i,
      size: 30 + Math.random() * 80, // Larger bubbles
      left: 5 + Math.random() * 90,
      duration: 3 + Math.random() * 5, // Faster animation
      delay: Math.random() * 2, // Quicker start
      opacity: 0.1 + Math.random() * 0.15,
    }))
    setBubbles(newBubbles)
  }, [])

  return (
    <div className="start-page">
      {/* Background Bubbles directly bound to this visual component */}
      {bubbles.map(b => (
        <div
          key={b.id}
          className="fast-bubble"
          style={{
            width: b.size, height: b.size,
            left: `${b.left}%`,
            animationDuration: `${b.duration}s`,
            animationDelay: `${b.delay}s`,
            opacity: b.opacity,
          }}
        />
      ))}
      
      <div className="start-content">
        <div className="start-logo">🌸</div>
        <h1>Welcome to Beauty Bytes</h1>
        <p className="start-subtitle">
          Your AI-powered Sephora catalog assistant.
        </p>
        <p className="start-guidance">
          Enter a situation, a skin concern, or a product type, and let our AI 
          cross-reference ingredients, reviews, and catalog data to find your perfect match.
        </p>
        <div className="start-hints">
          <span className="hint-pill">"Lipstick for a red carpet event"</span>
          <span className="hint-pill">"Dry skin winter moisturizer"</span>
          <span className="hint-pill">"Acne-safe foundation"</span>
        </div>
        
        <button className="start-btn" onClick={onStart}>
          Find Your Perfect Match ✨
        </button>
      </div>
    </div>
  )
}
