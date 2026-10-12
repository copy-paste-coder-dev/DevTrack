import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import { RouteError } from '../components/feedback/RouteError'
import { LoadingIndicator } from '../components/ui/LoadingIndicator'

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/app" replace /> },
  {
    path: '/login',
    hydrateFallbackElement: (
      <div className="route-loading">
        <LoadingIndicator />
      </div>
    ),
    lazy: async () => ({ Component: (await import('../features/auth/LoginPage')).LoginPage }),
  },
  {
    path: '/app',
    element: <AppShell />,
    errorElement: <RouteError />,
    hydrateFallbackElement: (
      <div className="route-loading">
        <LoadingIndicator />
      </div>
    ),
    children: [
      {
        index: true,
        lazy: async () => ({
          Component: (await import('../features/activities/DashboardPage')).DashboardPage,
        }),
      },
      {
        path: 'calendar',
        lazy: async () => ({
          Component: (await import('../features/calendar/CalendarPage')).CalendarPage,
        }),
      },
      {
        path: 'settings',
        lazy: async () => ({
          Component: (await import('../features/settings/SettingsPage')).SettingsPage,
        }),
      },
    ],
  },
  { path: '*', element: <RouteError notFound /> },
])
