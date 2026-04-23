export interface SVDTheme {
  dimension: number
  sign: '+' | '-'
  words: string[]
  weight: number
}

export interface Product {
  id: number
  name: string
  brand: string
  category: string
  price: number
  rating: number | null
  num_reviews: number | null
  details: string
  ingredients: string
  url: string
  size: string
  online_only: boolean
  score?: number
  base_score?: number
  matched_keywords?: string[]
  good_ingredients?: string[]
  bad_ingredients?: string[]
  ai_reasoning?: string
  is_top_recommendation?: boolean
  svd_shared_themes?: SVDTheme[]
}

export interface AIOverview {
  search_query: string
  overview: string
  recommended_product_ids: number[]
  svd_query_themes?: SVDTheme[]
}

export interface QueryInfo {
  original_query: string
  expanded_query: string
  expansion_labels: string[]
  vocab_tokens: string[]
  skin_concerns: string[]
  svd_query_themes?: SVDTheme[]
}

export type SortOption = 'relevance' | 'price_asc' | 'price_desc' | 'rating'
export type ViewMode = 'rows' | 'grid'

export interface CartItem {
  product: Product
  quantity: number
}