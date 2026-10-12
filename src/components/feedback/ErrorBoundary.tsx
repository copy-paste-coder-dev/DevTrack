import { Component, type ErrorInfo, type ReactNode } from 'react'
import { RouteError } from './RouteError'

export class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) console.error('DevTrack render error', error, info)
  }
  render() {
    return this.state.hasError ? <RouteError /> : this.props.children
  }
}
