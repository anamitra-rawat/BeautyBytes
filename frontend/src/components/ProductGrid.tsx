import { ReactNode } from 'react'

export default function ProductGrid({ children }: { children: ReactNode }) {
  return (
    <div className="product-grid">
      {children}
    </div>
  )
}
