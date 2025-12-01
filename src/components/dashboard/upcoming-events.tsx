'use client';

import { useEffect } from 'react';
import { Calendar, Clock, MapPin } from 'lucide-react';
import moment from 'moment';
import { useEventsStore } from '@/store/events-store';
import { Event } from '@/types';

export function UpcomingEvents() {
  const { events, fetchEvents } = useEventsStore();

  // Get upcoming events with better date filtering
  const upcomingEvents = events.data
    .filter(event => {
      // Show all events from today onwards (using current local date)
      const eventDate = new Date(event.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset time to start of day
      return eventDate >= today;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 8);

  // Load events on component mount
  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);



  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'orientation':
        return 'bg-green-500';
      case 'assessment':
        return 'bg-amber-500';
      case 'workshop':
        return 'bg-purple-500';
      case 'lesson':
        return 'bg-blue-500';
      default:
        return 'bg-red-500';
    }
  };

  const formatDate = (dateString: string) => {
    // Format to: December 1, 2025
    return moment(dateString).format('MMMM D, YYYY');
  };

  const formatDayName = (dateString: string) => {
    return moment(dateString).format('dddd').toUpperCase();
  };

  const getRelativeDate = (dateString: string) => {
    const eventDate = moment(dateString);
    const today = moment(); // Using current local date
    const tomorrow = moment().add(1, 'day');

    if (eventDate.isSame(today, 'day')) {
      return 'TODAY';
    } else if (eventDate.isSame(tomorrow, 'day')) {
      return 'TOMORROW';
    } else {
      return formatDayName(dateString);
    }
  };

  return (
    <div className="events-container bg-white dark:bg-slate-800 rounded-lg shadow-lg border-4 border-green-500 dark:border-green-400 h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-green-500 dark:bg-green-600 text-white p-3 sm:p-4 flex-shrink-0">
        <div className="text-center">
          <h2 className="text-lg sm:text-xl font-bold">UPCOMING EVENTS</h2>
          <p className="text-xs sm:text-sm">
            TODAY: {moment().format('MMMM D, YYYY')}
          </p>
        </div>
      </div>

      {/* Events List - Scrollable */}
      <div className="flex-1 overflow-hidden">
        <div className="events-content p-3 sm:p-4 h-full overflow-y-auto dashboard-scrollable">
          <div className="space-y-4">
            {events.loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Loading events...</p>
              </div>
            ) : events.error ? (
              <div className="text-center py-8">
                <p className="text-sm text-red-500">{events.error}</p>
              </div>
            ) : upcomingEvents.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-gray-500 dark:text-gray-400">No upcoming events</p>
              </div>
            ) : (
          (() => {
            // Group events by date
            const eventsByDate = upcomingEvents.reduce((acc, event) => {
              const date = event.date;
              if (!acc[date]) {
                acc[date] = [];
              }
              acc[date].push(event);
              return acc;
            }, {} as Record<string, Event[]>);

            return Object.entries(eventsByDate).map(([date, dateEvents], dateIndex) => (
              <div key={date} className={dateIndex > 0 ? "pt-3 sm:pt-4 border-t border-gray-200 dark:border-gray-600" : ""}>
                <div className="font-bold text-xs sm:text-sm text-gray-800 dark:text-white mb-2 sm:mb-3">
                  {getRelativeDate(date)} {formatDate(date)}
                </div>
                <div className="space-y-2 sm:space-y-3">
                  {dateEvents.map((event) => (
                    <div key={event._id}>
                      <div className="flex items-center space-x-2 mb-1 sm:mb-2">
                        <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full ${getEventTypeColor(event.type)}`}></div>
                        <span className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white">{event.time}</span>
                      </div>
                      <div className="ml-4 sm:ml-5 text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                        <div className="font-medium leading-tight">{event.title}</div>
                        <div className="text-xs flex items-center space-x-2 sm:space-x-3 mt-1">
                          <div className="flex items-center space-x-1">
                            <MapPin className="h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0" />
                            <span className="truncate">{event.location}</span>
                          </div>
                        </div>
                        <div className="text-xs mt-1 leading-tight">
                          <span className="sm:hidden">
                            {event.description.length > 40
                              ? `${event.description.substring(0, 40)}... see more`
                              : event.description
                            }
                          </span>
                          <span className="hidden sm:inline">
                            {event.description.length > 60
                              ? `${event.description.substring(0, 60)}... see more`
                              : event.description
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ));
          })()
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
