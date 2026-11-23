/**
 * Eventland Utility Functions for Event Mapping & Live Preview Resolution
 */

/**
 * Resolves event location (venue, city, auditorium) and tags for preview card display
 * @param {Object} params
 * @param {Object} params.eventForm Form state with venueId, cityId, tagIds, etc.
 * @param {Array} params.venuesList Venues list
 * @param {Array} params.citiesList Cities list
 * @param {Array} params.auditoriumsList Auditoriums list
 * @param {Array} params.tagsList Tags list
 * @returns {Object} Complete preview event object compatible with EventCard and EventDetails
 */
export function resolveEventPreview({
  eventForm = {},
  venuesList = [],
  citiesList = [],
  auditoriumsList = [],
  tagsList = []
}) {
  const selectedVenue = venuesList.find(v => String(v.id) === String(eventForm.venueId));
  const selectedCity = citiesList.find(c => String(c.id) === String(eventForm.cityId));
  const selectedAud = auditoriumsList.find(a => 
    String(a.id) === String(eventForm.auditoriumId) || 
    (eventForm.auditoriumLayout && (a.layoutCode === eventForm.auditoriumLayout || a.name === eventForm.auditoriumLayout))
  );

  const resolvedVenueName = selectedVenue?.name || eventForm.venueName || eventForm.venue || selectedAud?.venue || selectedAud?.name || '';
  const resolvedCityName = selectedCity?.name || eventForm.cityName || eventForm.city || 'Karachi';
  const resolvedAudName = selectedAud?.name || eventForm.auditoriumName || '';

  const selectedTags = tagsList
    .filter(t => (eventForm.tagIds || []).some(id => String(id) === String(t.id) || t.name === id))
    .map(t => ({ id: t.id, name: t.name, slug: t.slug }));

  return {
    id: eventForm.id || 'preview',
    title: eventForm.title || 'Your Event Title Preview',
    category: eventForm.category || (selectedTags[0]?.name || 'Concerts'),
    city: resolvedCityName,
    cityName: resolvedCityName,
    venue: resolvedVenueName || (resolvedAudName ? resolvedAudName : 'Venue Location Name'),
    venueName: resolvedVenueName || (resolvedAudName ? resolvedAudName : 'Venue Location Name'),
    auditoriumName: resolvedAudName,
    banner: eventForm.banner || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200&h=500&fit=crop',
    startingPrice: parseFloat(eventForm.startingPrice) || 1500,
    ticketingType: eventForm.ticketingType || 'categorized',
    status: (eventForm.status || 'Live').toUpperCase(),
    startDateUtc: eventForm.startDateUtc || eventForm.date,
    endDateUtc: eventForm.endDateUtc || eventForm.date,
    tags: selectedTags.length > 0 ? selectedTags : ['Event'],
    eventTags: selectedTags
  };
}
