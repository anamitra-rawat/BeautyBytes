import { useState, useRef, useEffect } from 'react'

interface Message {
  text: string
  isUser: boolean
}

export default function FollowUpPanel({
  isOpen,
  onClose,
  currentContext
}: {
  isOpen: boolean
  onClose: () => void
  currentContext: string
}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Clear chat if context changes heavily (optional), but let's keep it simple

  const sendMessage = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    const text = input.trim()
    if (!text || loading) return

    setMessages(prev => [...prev, { text, isUser: true }])
    setInput('')
    setLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, current_context: currentContext }),
      })

      if (!response.ok) {
        const data = await response.json()
        setMessages(prev => [...prev, { text: 'Error: ' + (data.error || response.status), isUser: false }])
        setLoading(false)
        return
      }

      let assistantText = ''
      setMessages(prev => [...prev, { text: '', isUser: false }])
      setLoading(false)

      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              
              if (data.content !== undefined) {
                assistantText += data.content
                setMessages(prev => [
                  ...prev.slice(0, -1),
                  { text: assistantText, isUser: false }
                ])
              }

              if (data.error) {
                setMessages(prev => [
                  ...prev.slice(0, -1),
                  { text: 'Error: ' + data.error, isUser: false }
                ])
                return
              }
            } catch { /* skip malformed SSE lines */ }
          }
        }
      }
    } catch {
      setMessages(prev => [...prev, { text: 'Something went wrong. Check the console.', isUser: false }])
      setLoading(false)
    }
  }

  return (
    <>
      <div className={`chat-panel${isOpen ? ' open' : ''}`}>
        <div className="chat-panel-header">
          <h3>💬 Ask AI Follow-Up</h3>
          <button className="chat-panel-close" onClick={onClose}>✕</button>
        </div>

        <div className="chat-container">
          <div className="chat-messages">
            {messages.length === 0 && (
              <div className="chat-empty-state">
                <span className="chat-empty-icon">🤖</span>
                <p>Ask me anything about these recommended products!</p>
                <div className="chat-suggestions">
                  {[
                    "Which of these is best for sensitive skin?",
                    "Are any of these cruelty-free?",
                    "What's the difference between the top two?",
                  ].map(s => (
                    <button key={s} className="chat-suggestion-chip" onClick={() => setInput(s)}>{s}</button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`chat-message ${msg.isUser ? 'user' : 'assistant'}`}>
                <div className="chat-message-bubble">
                  <p>{msg.text}</p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="chat-message assistant">
                <div className="chat-message-bubble loading-bubble">
                  <span className="loading-dot" />
                  <span className="loading-dot" />
                  <span className="loading-dot" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <form className="chat-input-bar" onSubmit={sendMessage}>
            <input
              type="text"
              className="chat-input"
              placeholder="Ask a follow-up question..."
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={loading}
              autoComplete="off"
            />
            <button type="submit" className="chat-send-btn" disabled={loading || !input.trim()}>
              Send
            </button>
          </form>
        </div>
      </div>
      {isOpen && <div className="chat-backdrop" onClick={onClose} />}
    </>
  )
}
