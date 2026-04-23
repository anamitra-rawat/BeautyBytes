import { useEffect, useState } from 'react'

export default function StartPage({ onStart }: { onStart: () => void }) {
  const [bubbles, setBubbles] = useState<any[]>([])
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    // Spread bubbles evenly across horizontal sections
    const count = 20
    const sectionWidth = 100 / count
    const newBubbles = Array.from({ length: count }, (_, i) => ({
      id: i,
      size: 12 + Math.random() * 28,
      left: i * sectionWidth + Math.random() * sectionWidth * 0.6,
      duration: 3 + Math.random() * 4,
      delay: Math.random() * 4,
    }))
    setBubbles(newBubbles)
  }, [])

  const title = "BeautyBytes".split("")

  // Each letter gets a random far-off starting position to converge from
  const letterOffsets = [
    { x: -320, y: -280 },  // B
    { x: 250, y: -350 },   // e
    { x: -400, y: 200 },   // a
    { x: 180, y: -400 },   // u
    { x: -280, y: 300 },   // t
    { x: 350, y: 250 },    // y
    { x: -350, y: -200 },  // B
    { x: 300, y: -300 },   // y
    { x: -250, y: 350 },   // t
    { x: 400, y: 200 },    // e
    { x: -300, y: -350 },  // s
  ]

  const handleStart = () => {
    setIsExiting(true)
    setTimeout(() => onStart(), 800)
  }

  return (
    <div className={`start-page${isExiting ? ' exiting' : ''}`}>
      {bubbles.map(b => (
        <div
          key={b.id}
          className="fast-bubble"
          style={{
            width: b.size, height: b.size,
            left: `${b.left}%`,
            animationDuration: `${b.duration}s`,
            animationDelay: `${b.delay}s`,
          }}
        />
      ))}
      
      <div className="start-content">
        <div className="start-title-container">
          {title.map((letter, i) => {
            const off = letterOffsets[i] || { x: 0, y: -300 }
            return (
              <span 
                key={i} 
                className="drop-letter"
                style={{ 
                  animationDelay: `${0.3 + i * 0.1}s`,
                  // Pass custom start position via CSS custom properties
                  '--start-x': `${off.x}px`,
                  '--start-y': `${off.y}px`,
                } as React.CSSProperties}
              >
                {letter}
                <div 
                  className="letter-bubble"
                  style={{ animationDelay: `${0.3 + i * 0.1}s` }}
                />
              </span>
            )
          })}
        </div>
        
        <p className="start-guidance">
          Discover your perfect routine using AI-powered insights.
        </p>
        
        <button className="start-btn" onClick={handleStart}>
          Find Your Perfect Match ✨
        </button>
      </div>

      {/* Exit bubble overlay */}
      {isExiting && <div className="exit-bubble" />}
    </div>
  )
}
