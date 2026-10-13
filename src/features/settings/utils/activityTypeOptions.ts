import { activityTypes, type ActivityType } from '../../activities/types/activity.ts'

export function getActivityTypeOptions(
  enabledTypes: readonly ActivityType[],
  currentType?: ActivityType,
) {
  return activityTypes
    .filter((type) => enabledTypes.includes(type) || type === currentType)
    .map((type) => ({ type, isDisabled: !enabledTypes.includes(type) }))
}

export function getDefaultActivityType(enabledTypes: readonly ActivityType[]): ActivityType {
  return enabledTypes.includes('development') ? 'development' : (enabledTypes[0] ?? 'other')
}
