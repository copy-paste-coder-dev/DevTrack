import { useSearchParams } from 'react-router-dom'

// Deliberate URL fixtures for reviewing async UI without network requests.
export function usePreviewState() {
  const [params, setParams] = useSearchParams()
  const value = params.get('preview')
  const state = value === 'loading' || value === 'error' ? value : 'ready'
  function retry() {
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous)
        next.delete('preview')
        return next
      },
      { replace: true },
    )
  }
  return { state, retry }
}
