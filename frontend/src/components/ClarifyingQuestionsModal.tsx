import { useState } from 'react'

export interface ClarifyingQuestion {
  id: string
  text: string
  options: string[]
}

export default function ClarifyingQuestionsModal({
  questions,
  onAccept,
  onDecline
}: {
  questions: ClarifyingQuestion[]
  onAccept: (answers: Record<string, string>) => void
  onDecline: () => void
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({})

  const handleSelect = (qId: string, option: string) => {
    setAnswers(prev => ({ ...prev, [qId]: option }))
  }

  const allAnswered = questions.length > 0 && questions.every(q => answers[q.id] !== undefined)

  return (
    <div className="modal-overlay" onClick={onDecline} style={{ zIndex: 10000 }}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ textAlign: 'center', padding: '32px' }}>
        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>✨</div>
        <h2 style={{ marginBottom: '12px', color: 'var(--text)' }}>Let's refine your search!</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '24px', lineHeight: 1.5 }}>
          To give you the best recommendations for your specific needs, please answer these quick questions:
        </p>

        <div className="inference-concerns">
          {questions.map(q => (
            <div key={q.id} style={{ marginBottom: '24px', textAlign: 'left' }}>
              <h4 style={{ margin: '0 0 12px 0', color: 'var(--text-main)' }}>{q.text}</h4>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {q.options.map(opt => {
                  const isSelected = answers[q.id] === opt
                  return (
                    <button
                      key={opt}
                      onClick={() => handleSelect(q.id, opt)}
                      style={{
                        background: isSelected ? 'var(--rose-deep)' : 'rgba(255, 255, 255, 0.4)',
                        color: isSelected ? '#fff' : 'var(--text-main)',
                        border: `1px solid ${isSelected ? 'var(--rose-deep)' : 'rgba(236, 72, 153, 0.2)'}`,
                        borderRadius: '20px',
                        padding: '8px 16px',
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        backdropFilter: 'blur(10px)',
                      }}
                    >
                      {opt}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '24px' }}>
          <button className="modal-cart-btn" onClick={onDecline} style={{ background: 'var(--surface-sunken)', color: 'var(--text)' }}>
            Skip
          </button>
          <button 
            className="modal-cart-btn add" 
            onClick={() => onAccept(answers)}
            disabled={!allAnswered}
            style={{ opacity: allAnswered ? 1 : 0.5, cursor: allAnswered ? 'pointer' : 'not-allowed' }}
          >
            Find My Matches
          </button>
        </div>
      </div>
    </div>
  )
}
