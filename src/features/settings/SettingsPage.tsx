import { useEffect, useId, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Clock3, Info, Plus, SlidersHorizontal, Tag } from 'lucide-react'
import { toast } from 'sonner'
import { PageContainer } from '../../components/layout/PageContainer'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input, Select } from '../../components/ui/Input'
import { activityTypes } from '../activities/types/activity'
import { activityMeta } from '../activities/config/presentation'
import { SettingsSkeleton } from '../../components/feedback/LoadingState'
import { ErrorState } from '../../components/feedback/ErrorState'
import { Toggle } from '../../components/ui/Toggle'
import { useUserPreferences } from './hooks/useUserPreferences'
import { userPreferencesSchema } from './validation/preferences.schema'
import { getDefaultUserPreferences } from './config/defaultPreferences'
import type { UserPreferences } from './types/preferences'
import { calculateWorkdayMinutes } from './utils/workday'
import { formatTimeString } from './utils/timeFormat'
import { formatDuration } from '../../utils/duration'
import { getPreferencesErrorMessage } from './utils/preferencesError'

export function SettingsPage() {
  const context = useUserPreferences()
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
      {context.isLoading ? (
        <SettingsSkeleton />
      ) : context.error ? (
        <Card>
          <ErrorState
            title="Unable to load your settings."
            description={context.error}
            onRetry={context.retry}
          />
        </Card>
      ) : (
        <PreferencesForm />
      )}
    </PageContainer>
  )
}

function PreferencesForm() {
  const { preferences, updatePreferences, isSaving } = useUserPreferences()
  const [saveError, setSaveError] = useState<string | null>(null)
  const typesErrorId = useId()
  const {
    register,
    control,
    setValue,
    reset,
    handleSubmit,
    formState: { errors, isDirty, isValid },
  } = useForm<UserPreferences>({
    resolver: zodResolver(userPreferencesSchema),
    defaultValues: preferences,
    mode: 'onChange',
  })
  // A clean form follows realtime values; a dirty form retains the user's unsaved draft.
  useEffect(() => {
    if (!isDirty) reset(preferences)
  }, [preferences, isDirty, reset])
  const values = useWatch({ control })
  const enabled = values.enabledActivityTypes ?? []
  const parsed = userPreferencesSchema.safeParse(values)
  async function submit(input: UserPreferences) {
    setSaveError(null)
    try {
      const saved = await updatePreferences(input)
      reset(saved)
      toast.success('Settings saved.')
    } catch (cause) {
      setSaveError(getPreferencesErrorMessage(cause))
    }
  }
  return (
    <form onSubmit={handleSubmit(submit)} noValidate className="settings-grid">
      <fieldset className="settings-panels settings-fieldset" disabled={isSaving}>
        <legend className="sr-only">Personal preferences</legend>
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
              required
              error={errors.dayStartTime?.message}
              {...register('dayStartTime')}
            />
          </div>
          <div className="settings-row">
            <div>
              <h3>Default day end</h3>
              <p>Defines your daily logged-time target.</p>
            </div>
            <Input
              label="Default day end time"
              type="time"
              required
              error={errors.dayEndTime?.message}
              {...register('dayEndTime')}
            />
          </div>
          <div className="settings-row">
            <div>
              <h3>Time format</h3>
              <p>Choose how times will appear.</p>
            </div>
            <Select
              label="Time display format"
              error={errors.timeFormat?.message}
              {...register('timeFormat')}
            >
              <option value="24h">24 hour (14:30)</option>
              <option value="12h">12 hour (2:30 PM)</option>
            </Select>
          </div>
          <div className="workday-preview" role="status">
            {parsed.success ? (
              <>
                <strong>
                  {formatTimeString(parsed.data.dayStartTime, parsed.data.timeFormat)} →{' '}
                  {formatTimeString(parsed.data.dayEndTime, parsed.data.timeFormat)}
                </strong>
                <span>
                  {formatDuration(
                    calculateWorkdayMinutes(parsed.data.dayStartTime, parsed.data.dayEndTime),
                  )}{' '}
                  work window
                </span>
              </>
            ) : (
              <span>Choose a valid workday and at least one activity type.</span>
            )}
          </div>
        </Card>
        <Card className="settings-card">
          <div className="settings-card-heading">
            <span className="settings-icon tone-purple">
              <Tag size={19} />
            </span>
            <div>
              <h2>Activity types</h2>
              <p>Choose the categories available for new activities.</p>
            </div>
            <span className="count-badge">{enabled.length}</span>
          </div>
          <div
            className="type-list"
            role="group"
            aria-label="Enabled activity types"
            aria-describedby={errors.enabledActivityTypes ? typesErrorId : undefined}
          >
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
                    checked={enabled.includes(type)}
                    onChange={() =>
                      setValue(
                        'enabledActivityTypes',
                        enabled.includes(type)
                          ? enabled.filter((item) => item !== type)
                          : activityTypes.filter((item) => enabled.includes(item) || item === type),
                        { shouldDirty: true, shouldValidate: true },
                      )
                    }
                  />
                </div>
              )
            })}
          </div>
          {errors.enabledActivityTypes && (
            <p id={typesErrorId} className="field-error" role="alert">
              {errors.enabledActivityTypes.message}
            </p>
          )}
          <Button variant="ghost" className="add-type-button" disabled>
            <Plus size={16} />
            Custom types · Coming later
          </Button>
        </Card>
        {saveError && (
          <p className="auth-error" role="alert">
            {saveError}
          </p>
        )}
        <div className="settings-actions">
          <Button
            variant="ghost"
            onClick={() => {
              reset(getDefaultUserPreferences(), { keepDefaultValues: true })
              setSaveError(null)
            }}
          >
            Reset to defaults
          </Button>
          <Button type="submit" disabled={!isDirty || !isValid} loading={isSaving}>
            {isSaving ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </fieldset>
      <aside className="settings-aside">
        <div className="settings-tip">
          <Info size={20} />
          <h2>A day that works for you</h2>
          <p>Saved preferences apply across your devices and sessions.</p>
          <p>
            Disabling a type keeps existing activities visible and editable. Reset changes this
            form; choose Save changes to apply it.
          </p>
        </div>
        <div className="settings-version">
          <span className="online-dot" />
          DevTrack · Personal preferences
        </div>
      </aside>
    </form>
  )
}
