import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveEventPreview } from '../utils/eventUtils.js';

test('resolveEventPreview: resolves venue name from venueId and venuesList', () => {
  const venuesList = [
    { id: '101', name: 'Arts Council of Pakistan', cityId: '1' },
    { id: '102', name: 'Alhamra Arts Council', cityId: '2' }
  ];
  const citiesList = [
    { id: '1', name: 'Karachi' },
    { id: '2', name: 'Lahore' }
  ];
  const eventForm = {
    title: 'Garbar Family',
    cityId: '1',
    venueId: '101',
    startingPrice: 1500
  };

  const preview = resolveEventPreview({ eventForm, venuesList, citiesList });
  assert.equal(preview.venue, 'Arts Council of Pakistan');
  assert.equal(preview.venueName, 'Arts Council of Pakistan');
  assert.equal(preview.city, 'Karachi');
  assert.equal(preview.cityName, 'Karachi');
});

test('resolveEventPreview: resolves category tags from tagIds and tagsList', () => {
  const tagsList = [
    { id: 1, name: 'Theatre, Arts & Culture', slug: 'theatre' },
    { id: 2, name: 'Music & Concerts', slug: 'music' }
  ];
  const eventForm = {
    tagIds: [1],
    venueId: 'v1'
  };

  const preview = resolveEventPreview({ eventForm, tagsList });
  assert.equal(preview.tags.length, 1);
  assert.equal(preview.tags[0].name, 'Theatre, Arts & Culture');
  assert.equal(preview.category, 'Theatre, Arts & Culture');
});

test('resolveEventPreview: falls back cleanly when venue or city not found', () => {
  const eventForm = {
    title: 'Unknown Venue Event'
  };

  const preview = resolveEventPreview({ eventForm });
  assert.equal(preview.venue, 'Venue Location Name');
  assert.equal(preview.city, 'Karachi');
  assert.deepEqual(preview.tags, ['Event']);
});
