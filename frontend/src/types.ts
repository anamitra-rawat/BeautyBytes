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
}