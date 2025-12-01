import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { Event, EventState, EventFilters, EventStatistics } from '@/types';
import {
  fetchEvents as apiFetchEvents,
  createEvent as apiCreateEvent,
  updateEvent as apiUpdateEvent,
  deleteEvent as apiDeleteEvent
} from '@/services/api';

// Initial state
const initialState: EventState = {
  data: [],
  filteredData: [],
  filters: {},
  statistics: {
    totalEvents: 0,
    upcomingEvents: 0,
    completedEvents: 0,
    typeDistribution: {
      orientation: 0,
      assessment: 0,
      workshop: 0,
      lesson: 0,
    },
    locationDistribution: {},
  },
  loading: false,
  error: null,
};

// Helper function to calculate event statistics
const calculateEventStatistics = (events: Event[]): EventStatistics => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Helper to parse event date string without timezone issues
  const parseEventDate = (dateString: string): Date => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day); // month is 0-indexed
  };

  return {
    totalEvents: events.length,
    upcomingEvents: events.filter(event => parseEventDate(event.date) >= today).length,
    completedEvents: events.filter(event => parseEventDate(event.date) < today).length,
    typeDistribution: events.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    locationDistribution: events.reduce((acc, event) => {
      acc[event.location] = (acc[event.location] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
  };
};

// Helper function to filter events
const filterEvents = (events: Event[], filters: EventFilters): Event[] => {
  return events.filter(event => {
    // Filter by type
    if (filters.type && event.type !== filters.type) {
      return false;
    }

    // Filter by status
    if (filters.status && event.status !== filters.status) {
      return false;
    }

    // Filter by date range
    if (filters.dateFrom && event.date < filters.dateFrom) {
      return false;
    }

    if (filters.dateTo && event.date > filters.dateTo) {
      return false;
    }

    // Filter by location
    if (filters.location && !event.location.toLowerCase().includes(filters.location.toLowerCase())) {
      return false;
    }

    return true;
  });
};

// Create the events store
export const useEventsStore = create<{
  events: EventState;
  // Actions
  fetchEvents: () => Promise<void>;
  setFilters: (filters: EventFilters) => void;
  clearFilters: () => void;
  addEvent: (event: Omit<Event, 'id'>) => Promise<Event>;
  updateEvent: (event: Event) => Promise<Event>;
  deleteEvent: (id: string) => Promise<void>;
  getEventsByDate: (date: string) => Event[];
  getUpcomingEvents: (limit?: number) => Event[];
}>()(
  immer((set, get) => ({
    events: initialState,

    // Fetch events from API
    fetchEvents: async () => {
      set(state => {
        state.events.loading = true;
        state.events.error = null;
      });

      try {
        // Use the API endpoint directly
        const events: Event[] = await apiFetchEvents();

        set(state => {
          state.events.data = events;
          state.events.filteredData = filterEvents(events, state.events.filters);
          state.events.statistics = calculateEventStatistics(events);
          state.events.loading = false;
        });
      } catch (error) {
        set(state => {
          state.events.loading = false;
          state.events.error = error instanceof Error ? error.message : 'Failed to fetch events';
        });
      }
    },

    // Set filters and apply them
    setFilters: (filters: EventFilters) => {
      set(state => {
        state.events.filters = { ...state.events.filters, ...filters };
        state.events.filteredData = filterEvents(state.events.data, state.events.filters);
      });
    },

    // Clear all filters
    clearFilters: () => {
      set(state => {
        state.events.filters = {};
        state.events.filteredData = state.events.data;
      });
    },

    // Add a new event
    addEvent: async (eventData: Omit<Event, 'id'>) => {
      set(state => {
        state.events.loading = true;
        state.events.error = null;
      });

      try {
        const newEvent = await apiCreateEvent(eventData);

        set(state => {
          state.events.data.push(newEvent);
          state.events.filteredData = filterEvents(state.events.data, state.events.filters);
          state.events.statistics = calculateEventStatistics(state.events.data);
          state.events.loading = false;
        });

        return newEvent;
      } catch (error) {
        set(state => {
          state.events.loading = false;
          state.events.error = error instanceof Error ? error.message : 'Failed to add event';
        });
        throw error;
      }
    },

    // Update an existing event
    updateEvent: async (updatedEvent: Event) => {
      set(state => {
        state.events.loading = true;
        state.events.error = null;
      });

      try {
        const result = await apiUpdateEvent(updatedEvent);

        set(state => {
          const index = state.events.data.findIndex(e => e._id === updatedEvent._id);
          if (index !== -1) {
            state.events.data[index] = result;
            state.events.filteredData = filterEvents(state.events.data, state.events.filters);
            state.events.statistics = calculateEventStatistics(state.events.data);
          }
          state.events.loading = false;
        });

        return result;
      } catch (error) {
        set(state => {
          state.events.loading = false;
          state.events.error = error instanceof Error ? error.message : 'Failed to update event';
        });
        throw error;
      }
    },

    // Delete an event
    deleteEvent: async (id: string) => {
      set(state => {
        state.events.loading = true;
        state.events.error = null;
      });

      try {
        await apiDeleteEvent(id);

        set(state => {
          state.events.data = state.events.data.filter(e => e._id !== id);
          state.events.filteredData = filterEvents(state.events.data, state.events.filters);
          state.events.statistics = calculateEventStatistics(state.events.data);
          state.events.loading = false;
        });
      } catch (error) {
        set(state => {
          state.events.loading = false;
          state.events.error = error instanceof Error ? error.message : 'Failed to delete event';
        });
        throw error;
      }
    },

    // Get events for a specific date
    getEventsByDate: (date: string) => {
      const { events } = get();
      return events.data.filter(event => event.date === date);
    },

    // Get upcoming events (sorted by date)
    getUpcomingEvents: (limit = 10) => {
      const { events } = get();
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      // Helper to parse event date string without timezone issues
      const parseEventDate = (dateString: string): Date => {
        const [year, month, day] = dateString.split('-').map(Number);
        return new Date(year, month - 1, day); // month is 0-indexed
      };

      return events.data
        .filter(event => {
          const eventDate = parseEventDate(event.date);
          return eventDate >= today;
        })
        .sort((a, b) => parseEventDate(a.date).getTime() - parseEventDate(b.date).getTime())
        .slice(0, limit);
    },
  }))
);
