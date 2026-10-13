import { useState } from 'react'
import { Clock3, Info, Plus, SlidersHorizontal, Tag } from 'lucide-react'
import { toast } from 'sonner'
import { PageContainer } from '../../components/layout/PageContainer'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input, Select } from '../../components/ui/Input'
import { activityTypes } from '../activities/types/activity'
import { activityMeta } from '../activities/config/presentation'
import { mockSettings } from '../../mocks/settings.mock'
import { usePreviewState } from '../../mocks/usePreviewState'
import { SettingsSkeleton } from '../../components/feedback/LoadingState'
import { ErrorState } from '../../components/feedback/ErrorState'
import { Toggle } from '../../components/ui/Toggle'

export function SettingsPage() {
  const { state, retry } = usePreviewState()
  const [start, setStart] = useState<string>(mockSettings.dayStart)
  const [end, setEnd] = useState<string>(mockSettings.dayEnd)
  const [timeFormat, setTimeFormat] = useState<string>(mockSettings.timeFormat)
  const [enabled, setEnabled] = useState<Set<string>>(() => new Set(mockSettings.enabledTypes))
  const [customType, setCustomType] = useState('')
  const [customTypes, setCustomTypes] = useState<string[]>([])
  const [addingType, setAddingType] = useState(false)
  function toggle(type: string) {
    setEnabled((previous) => {
      const next = new Set(previous)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }
  function reset() {
    setStart(mockSettings.dayStart)
    setEnd(mockSettings.dayEnd)
    setTimeFormat(mockSettings.timeFormat)
    setEnabled(new Set(mockSettings.enabledTypes))
    setCustomTypes([])
    setCustomType('')
    setAddingType(false)
    toast.info('Preview reset to defaults')
  }
  function addCustomType(event: React.FormEvent) {
    event.preventDefault()
    const value = customType.trim()
    if (!value) return
    const existing = [
      ...activityTypes.map((type) => activityMeta[type].label.toLowerCase()),
      ...customTypes.map((type) => type.toLowerCase()),
    ]
    if (existing.includes(value.toLowerCase())) {
      toast.error('That activity type already exists')
      return
    }
    setCustomTypes((previous) => [...previous, value])
    setEnabled((previous) => new Set(previous).add(value))
    setCustomType('')
    setAddingType(false)
  }
  return (
    <PageContainer className="settings-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">YOUR WORKSPACE, YOUR WAY</span>
          <h1>Settings</h1>
          <p>A few preferences to make your day feel like yours.</p>
        </div>
        <span className="settings-decoration">
          <SlidersHorizontal size={24} />
        </span>
      </div>
      {state === 'loading' ? (
        <SettingsSkeleton />
      ) : state === 'error' ? (
        <Card>
          <ErrorState title="Unable to load your settings." onRetry={retry} />
        </Card>
      ) : (
        <div className="settings-grid">
          <div className="settings-panels">
            <Card className="settings-card">
              <div className="settings-card-heading">
                <span className="settings-icon tone-cyan">
                  <Clock3 size={19} />
                </span>
                <div>
                  <h2>Work hours</h2>
                  <p>Set the rhythm of your working day.</p>
                </div>
              </div>
              <div className="settings-row">
                <div>
                  <h3>Default day start</h3>
                  <p>The starting point for your first activity.</p>
                </div>
                <Input
                  label="Default day start time"
                  type="time"
                  value={start}
                  onChange={(event) => setStart(event.target.value)}
                />
              </div>
              <div className="settings-row">
                <div>
                  <h3>
                    Default day end <span>optional</span>
                  </h3>
                  <p>A gentle boundary for your workday.</p>
                </div>
                <Input
                  label="Default day end time"
                  type="time"
                  value={end}
                  onChange={(event) => setEnd(event.target.value)}
                />
              </div>
              <div className="settings-row">
                <div>
                  <h3>Time format</h3>
                  <p>Choose how times will appear.</p>
                </div>
                <Select
                  label="Time display format"
                  value={timeFormat}
                  onChange={(event) => setTimeFormat(event.target.value)}
                >
                  <option value="24">24 hour (13:00)</option>
                  <option value="12">12 hour (1:00 PM)</option>
                </Select>
              </div>
            </Card>
            <Card className="settings-card">
              <div className="settings-card-heading">
                <span className="settings-icon tone-purple">
                  <Tag size={19} />
                </span>
                <div>
                  <h2>Activity types</h2>
                  <p>Keep the categories that match your work.</p>
                </div>
                <span className="count-badge">{enabled.size}</span>
              </div>
              <div className="type-list">
                {activityTypes.map((type) => {
                  const { label, icon: Icon, color } = activityMeta[type]
                  return (
                    <div className={`type-row tone-${color}`} key={type}>
                      <span className="type-icon">
                        <Icon size={17} />
                      </span>
                      <span>{label}</span>
                      <Toggle
                        label={`Enable ${label}`}
                        checked={enabled.has(type)}
                        onChange={() => toggle(type)}
                      />
                    </div>
                  )
                })}
                {customTypes.map((type) => (
                  <div className="type-row tone-slate" key={type}>
                    <span className="type-icon">
                      <Tag size={17} />
                    </span>
                    <span>{type}</span>
                    <Toggle
                      label={`Enable ${type}`}
                      checked={enabled.has(type)}
                      onChange={() => toggle(type)}
                    />
                  </div>
                ))}
              </div>
              {enabled.size === 0 && (
                <div className="settings-empty" role="status">
                  <h3>No active activity types.</h3>
                  <p>Enable a type above or add one that matches your workflow.</p>
                </div>
              )}
              {addingType ? (
                <form className="custom-type-form" onSubmit={addCustomType}>
                  <Input
                    label="Custom activity type"
                    value={customType}
                    onChange={(event) => setCustomType(event.target.value)}
                    maxLength={40}
                    autoFocus
                    required
                  />
                  <Button variant="secondary" type="submit">
                    Add
                  </Button>
                  <Button variant="ghost" onClick={() => setAddingType(false)}>
                    Cancel
                  </Button>
                </form>
              ) : (
                <Button
                  variant="ghost"
                  className="add-type-button"
                  onClick={() => setAddingType(true)}
                >
                  <Plus size={16} />
                  Add custom type
                </Button>
              )}
            </Card>
            <div className="settings-actions">
              <Button variant="ghost" onClick={reset}>
                Reset preview
              </Button>
              <Button
                onClick={() => {
                  if (!start) {
                    toast.error('Choose a default start time.')
                    return
                  }
                  toast.success('Preferences previewed', {
                    description:
                      'These preview changes are not saved or applied to activity defaults.',
                  })
                }}
              >
                Preview changes
              </Button>
            </div>
          </div>
          <aside className="settings-aside">
            <div className="settings-tip">
              <Info size={20} />
              <h2>A day that works for you</h2>
              <p>Work hours will help set a sensible starting point when you log activities.</p>
              <p>
                For now, explore the controls. Preferences are part of this UI preview and reset
                when you leave.
              </p>
            </div>
            <div className="settings-version">
              <span className="online-dot" />
              DevTrack · Preferences preview
            </div>
          </aside>
        </div>
      )}
    </PageContainer>
  )
}
