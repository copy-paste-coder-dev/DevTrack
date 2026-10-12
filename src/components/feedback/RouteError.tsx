import { AlertTriangle } from 'lucide-react'

export function RouteError({ notFound = false }: { notFound?: boolean }) {
  return <main className="error-page"><AlertTriangle size={36} /><h1>{notFound ? 'Page not found' : 'Something went wrong'}</h1><p>{notFound ? 'This page is outside your workspace.' : 'Reload your workspace to try again.'}</p><a className="button button-primary" href="/app">Back to workspace</a></main>
}
