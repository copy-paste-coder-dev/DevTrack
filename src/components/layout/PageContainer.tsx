import type { PropsWithChildren } from 'react'
export function PageContainer({
  children,
  className = '',
}: PropsWithChildren<{ className?: string }>) {
  return (
    <main id="main-content" className={`page-container ${className}`}>
      {children}
    </main>
  )
}
