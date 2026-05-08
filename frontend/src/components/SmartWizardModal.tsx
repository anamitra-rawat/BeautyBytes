import { useState, useEffect } from 'react'
import { ClarifyingQuestion } from './ClarifyingQuestionsModal'

export interface SmartWizardModalProps {
  questions: ClarifyingQuestion[]
  onQuestionsSubmit: (answers: Record<string, string>) => void
  pendingConcerns: string[] | null
  onComplete: (concernsToApply: string[]) => void
  onClose: () => void
}

const CONCERN_LABELS: Record<string, string> = {
  acne: '🔴 Acne',
  dry_skin: '🏜️ Dry Skin',
  oily_skin: '💧 Oily Skin',
  sensitive: '🌸 Sensitive',
  aging: '⏳ Aging',
  dark_spots: '🔵 Dark Spots',
  redness: '🩹 Redness'
}

export default function SmartWizardModal({
  questions,
  onQuestionsSubmit,
  pendingConcerns,
  onComplete,
  onClose
}: SmartWizardModalProps) {
  // If no questions are passed, skip straight to concerns (in case they typed a specific query but it still had concerns)
  const initialStep = questions.length > 0 ? 'QUESTIONS' : (pendingConcerns === null ? 'LOADING' : 'CONCERNS')
  
  const [step, setStep] = useState<'QUESTIONS' | 'LOADING' | 'CONCERNS'>(initialStep)
  const [answers, setAnswers] = useState<Record<string, string>>({})

  useEffect(() => {
    if (step === 'LOADING') {
      const startTime = Date.now()
      const interval = setInterval(() => {
        if (pendingConcerns !== null && Date.now() - startTime > 2500) {
          clearInterval(interval)
          if (pendingConcerns.length > 0) {
            setStep('CONCERNS')
          } else {
            onComplete([]) // skip automatically
          }
        }
      }, 100)
      return () => clearInterval(interval)
    }
  }, [pendingConcerns, step, onComplete])

  const handleSelect = (qId: string, option: string) => {
    setAnswers(prev => ({ ...prev, [qId]: option }))
  }

  const allAnswered = questions.length > 0 && questions.every(q => answers[q.id] !== undefined)

  const handleQuestionsSubmit = () => {
    setStep('LOADING')
    onQuestionsSubmit(answers)
  }

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 10000 }}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ textAlign: 'center', padding: '32px' }}>
        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>✨</div>

        {step === 'QUESTIONS' && (
          <>
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
              <button className="modal-cart-btn" onClick={onClose} style={{ background: 'var(--surface-sunken)', color: 'var(--text)' }}>
                Skip
              </button>
              <button 
                className="modal-cart-btn add" 
                onClick={handleQuestionsSubmit}
                disabled={!allAnswered}
                style={{ opacity: allAnswered ? 1 : 0.5, cursor: allAnswered ? 'pointer' : 'not-allowed' }}
              >
                Next
              </button>
            </div>
          </>
        )}

        {step === 'LOADING' && (
          <div style={{ padding: '40px 0', animation: 'fadeIn 0.3s ease' }}>
            <h2 style={{ marginBottom: '24px', color: 'var(--text)' }}>Thinking...</h2>
            <div className="jumping-loader">
              <div></div>
              <div></div>
              <div></div>
            </div>
            <p style={{ marginTop: '24px', color: 'var(--text-muted)' }}>
              AI is evaluating your preferences...
            </p>
          </div>
        )}

        {step === 'CONCERNS' && pendingConcerns && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            <h2 style={{ marginBottom: '12px', color: 'var(--text)' }}>Enhance Your Search?</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px', lineHeight: 1.5 }}>
              AI is inferring you have these skin concerns based on your query:<br /><br />
              <strong style={{ fontSize: '1.1rem', color: 'var(--rose-dark)' }}>
                {pendingConcerns.map(c => CONCERN_LABELS[c] || c).join('  ·  ')}
              </strong>
            </p>
            <p style={{ color: 'var(--text)', marginBottom: '24px', fontWeight: 500 }}>
              Would you like to apply them as filters?
            </p>
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
              <button className="modal-cart-btn" onClick={() => onComplete([])} style={{ background: 'var(--surface-sunken)', color: 'var(--text)' }}>
                No Thanks
              </button>
              <button className="modal-cart-btn add" onClick={() => onComplete(pendingConcerns)}>
                Yes, Apply Filters
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
