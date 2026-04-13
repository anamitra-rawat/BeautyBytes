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
}

export interface QueryInfo {
  original_query: string
  expanded_query: string
  expansion_labels: string[]
  vocab_tokens: string[]
  skin_concerns: string[]
}