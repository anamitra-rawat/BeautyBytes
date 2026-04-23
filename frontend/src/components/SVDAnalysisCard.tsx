import { getDimensionColor } from '../themeUtils'
import { AIOverview } from '../types'

export default function SVDAnalysisCard({ data }: { data: AIOverview | null }) {
  if (!data || !data.svd_query_themes || data.svd_query_themes.length === 0) return null

  return (
    <div className="ai-overview-card" style={{ height: 'fit-content' }}>
      <div className="ai-overview-header" style={{ marginBottom: '16px' }}>
        <span className="ai-icon">📊</span>
        <h3 className="ai-title">SVD Latent Analysis</h3>
      </div>

      <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '16px', color: 'var(--text-muted)' }}>
        Strongest query latent dimensions:
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {data.svd_query_themes.map((theme) => {
          const color = getDimensionColor(theme.dimension);
          const barWidth = Math.max(theme.weight * 100, 4); // ensures at least some bar is visible
          return (
            <div key={theme.dimension} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{
                  backgroundColor: `${color}15`,
                  color: color,
                  border: `1px solid ${color}30`,
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  whiteSpace: 'nowrap'
                }}>
                  {theme.sign === '+' ? '＋' : '－'} Dim {theme.dimension} ({theme.words.slice(0, 2).join(', ')})
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  wt: {theme.weight.toFixed(3)}
                </span>
              </div>

              {/* The bar graph */}
              <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--border-light)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{
                  width: `${barWidth}%`,
                  height: '100%',
                  backgroundColor: color,
                  borderRadius: '4px',
                  transition: 'width 0.5s ease-out'
                }} />
              </div>

              <span style={{ fontSize: '0.8rem', fontStyle: 'italic', color: 'var(--text-muted)' }}>
                Top themes: {theme.words.join(', ')}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  )
}
