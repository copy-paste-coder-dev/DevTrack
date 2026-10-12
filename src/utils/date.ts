import { format } from 'date-fns'
export const formatDisplayDate = (date: Date) => format(date, 'EEEE, MMMM d, yyyy')
export const formatDisplayTime = (date: Date) => format(date, 'HH:mm')
export const toDateKey = (date: Date) => format(date, 'yyyy-MM-dd')
