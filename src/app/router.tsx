import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import { DashboardPage } from '../features/activities/DashboardPage'
import { CalendarPage } from '../features/calendar/CalendarPage'
import { SettingsPage } from '../features/settings/SettingsPage'
import { RouteError } from '../components/feedback/RouteError'

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/app" replace /> },
  { path: '/app', element: <AppShell />, errorElement: <RouteError />, children: [
    { index: true, element: <DashboardPage /> },
    { path: 'calendar', element: <CalendarPage /> },
    { path: 'settings', element: <SettingsPage /> },
  ] },
  { path: '*', element: <RouteError notFound /> },
])
