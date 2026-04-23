import { AIOverview } from '../types'

export default function AIOverviewCard({ data }: { data: AIOverview | null }) {
  if (!data || !data.overview) return null

  return (
    <div className="ai-overview-card">
      <div className="ai-overview-header">
        <span className="ai-icon">✨</span>
        <h3 className="ai-title">AI Search Overview</h3>
      </div>
      
      {data.search_query && (
        <div className="ai-query-badge">
          Searched for: <strong>"{data.search_query}"</strong>
        </div>
      )}

      <div className="ai-overview-content">
        <p>{data.overview}</p>
      </div>
    </div>
  )
}
