import { useState, useRef, useEffect } from 'react'
import { Product } from './types'

interface Message {
  text: string
  isUser: boolean
  searchQuery?: string
}

interface ChatProps {
  onSearchResults: (results: Product[], query: string) => void
}

function Chat({ onSearchResults }: ChatProps): JSX.Element {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

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
        body: JSON.stringify({ message: text }),
      })

      if (!response.ok) {
        const data = await response.json()
        setMessages(prev => [...prev, { text: 'Error: ' + (data.error || response.status), isUser: false }])
        setLoading(false)
        return
      }

      let assistantText = ''
      let currentSearchQuery = ''
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

              // Step 1: LLM-generated search query
              if (data.search_query !== undefined) {
                currentSearchQuery = data.search_query
                setMessages(prev => [
                  ...prev.slice(0, -1),
                  { text: '', isUser: false, searchQuery: currentSearchQuery }
                ])
              }

              // Step 2: IR search results — pass to parent to display as product cards
              if (data.search_results !== undefined) {
                onSearchResults(data.search_results, currentSearchQuery)
              }

              // Step 4: Streamed LLM answer content
              if (data.content !== undefined) {
                assistantText += data.content
                setMessages(prev => [
                  ...prev.slice(0, -1),
                  { text: assistantText, isUser: false, searchQuery: currentSearchQuery }
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
    <div className="chat-container">
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-empty-state">
            <span className="chat-empty-icon">💬</span>
            <p>Ask me anything about beauty products!</p>
            <div className="chat-suggestions">
              {[
                "What's the best moisturizer for dry skin?",
                "Recommend a long-wearing lipstick",
                "What ingredients help with acne?",
              ].map(s => (
                <button key={s} className="chat-suggestion-chip" onClick={() => setInput(s)}>{s}</button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`chat-message ${msg.isUser ? 'user' : 'assistant'}`}>
            {!msg.isUser && msg.searchQuery && (
              <div className="chat-search-badge">
                <span className="search-badge-icon">🔍</span>
                Searched: <em>"{msg.searchQuery}"</em>
              </div>
            )}
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
          placeholder="Ask about products, ingredients, or routines..."
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
  )
}

export default Chat
