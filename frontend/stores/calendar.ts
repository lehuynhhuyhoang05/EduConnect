import { defineStore } from 'pinia'

export interface CalendarEvent {
  id: number
  title: string
  description?: string
  eventType: 'live_session' | 'assignment_due' | 'quiz' | 'exam' | 'holiday' | 'class_event' | 'personal' | 'reminder'
  startTime: string
  endTime?: string
  allDay: boolean
  location?: string
  color: string
  recurrence: 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly'
  recurrenceEndDate?: string
  reminders?: string[]
  createdById: number
  classId?: number
  linkedResourceId?: number
  linkedResourceType?: string
  isPublic: boolean
  createdAt: string
}

export interface CreateEventData {
  title: string
  description?: string
  eventType: CalendarEvent['eventType']
  startTime: string
  endTime?: string
  allDay?: boolean
  location?: string
  color?: string
  recurrence?: CalendarEvent['recurrence']
  recurrenceEndDate?: string
  reminders?: string[]
  classId?: number
  isPublic?: boolean
}

interface CalendarState {
  events: CalendarEvent[]
  todayEvents: CalendarEvent[]
  upcomingEvents: CalendarEvent[]
  selectedDate: Date
  isLoading: boolean
}

export const useCalendarStore = defineStore('calendar', {
  state: (): CalendarState => ({
    events: [],
    todayEvents: [],
    upcomingEvents: [],
    selectedDate: new Date(),
    isLoading: false,
  }),

  getters: {
    eventsByDate: (state) => {
      const grouped: Record<string, CalendarEvent[]> = {}
      state.events.forEach(event => {
        const dateKey = new Date(event.startTime).toISOString().split('T')[0]
        if (!grouped[dateKey]) {
          grouped[dateKey] = []
        }
        grouped[dateKey].push(event)
      })
      return grouped
    },
    
    eventsByType: (state) => {
      const grouped: Record<string, CalendarEvent[]> = {}
      state.events.forEach(event => {
        if (!grouped[event.eventType]) {
          grouped[event.eventType] = []
        }
        grouped[event.eventType].push(event)
      })
      return grouped
    },

    eventsForSelectedDate: (state) => {
      const dateKey = state.selectedDate.toISOString().split('T')[0]
      return state.events.filter(event => 
        new Date(event.startTime).toISOString().split('T')[0] === dateKey
      )
    },
  },

  actions: {
    async fetchEvents(params?: { startDate?: string; endDate?: string; classId?: number; eventType?: string }) {
      this.isLoading = true
      const api = useApi()
      
      try {
        const events = await api.get<CalendarEvent[]>('/calendar', params)
        this.events = events
        return events
      } finally {
        this.isLoading = false
      }
    },

    async fetchTodayEvents() {
      const api = useApi()
      const events = await api.get<CalendarEvent[]>('/calendar/today')
      this.todayEvents = events
      return events
    },

    async fetchUpcomingEvents(limit = 10) {
      const api = useApi()
      const events = await api.get<CalendarEvent[]>('/calendar/upcoming', { limit })
      this.upcomingEvents = events
      return events
    },

    async fetchClassEvents(classId: number, params?: { startDate?: string; endDate?: string }) {
      const api = useApi()
      const events = await api.get<CalendarEvent[]>(`/calendar/class/${classId}`, params)
      return events
    },

    async createEvent(data: CreateEventData) {
      const api = useApi()
      const event = await api.post<CalendarEvent>('/calendar', data)
      this.events.push(event)
      return event
    },

    async updateEvent(id: number, data: Partial<CreateEventData>) {
      const api = useApi()
      const event = await api.put<CalendarEvent>(`/calendar/${id}`, data)
      
      const index = this.events.findIndex(e => e.id === id)
      if (index !== -1) {
        this.events[index] = event
      }
      
      return event
    },

    async deleteEvent(id: number) {
      const api = useApi()
      await api.delete(`/calendar/${id}`)
      this.events = this.events.filter(e => e.id !== id)
    },

    setSelectedDate(date: Date) {
      this.selectedDate = date
    },

    // Get month events for calendar view
    async fetchMonthEvents(year: number, month: number, classId?: number) {
      const startDate = new Date(year, month, 1).toISOString()
      const endDate = new Date(year, month + 1, 0).toISOString()
      
      return this.fetchEvents({ startDate, endDate, classId })
    },
  },
})
