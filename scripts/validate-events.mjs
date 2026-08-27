#!/usr/bin/env node
/**
 * Validates public/events.json against the schema App.tsx expects.
 *
 * This exists because events.json is fetched at runtime, so TypeScript can't
 * check it. Without this, a missing `tier` or a typo'd `category` ships silently
 * and the event just quietly vanishes from the page. Runs as part of `npm run
 * build`, so CI catches it.
 *
 * No dependencies — plain Node.
 */
import { readFileSync } from 'node:fs';

const CATEGORIES = new Set(['model', 'tool', 'art']);
const TIERS = new Set(['flagship', 'incremental']);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const REQUIRED_STRINGS = ['id', 'name', 'date', 'description', 'category', 'vendor', 'brand', 'tier'];

const path = new URL('../public/events.json', import.meta.url);
const errors = [];
const warnings = [];

let parsed;
try {
  parsed = JSON.parse(readFileSync(path, 'utf8'));
} catch (err) {
  console.error(`✗ events.json is not valid JSON: ${err.message}`);
  process.exit(1);
}

if (!Array.isArray(parsed?.events)) {
  console.error('✗ events.json must have a top-level "events" array');
  process.exit(1);
}

const { events } = parsed;
const seenIds = new Map();
// Tolerate a day of timezone slop before calling a date "in the future".
const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);

events.forEach((event, i) => {
  const label = `events[${i}]${event?.id ? ` (${event.id})` : ''}`;
  const at = (msg) => errors.push(`${label}: ${msg}`);

  if (typeof event !== 'object' || event === null) {
    at('is not an object');
    return;
  }

  for (const field of REQUIRED_STRINGS) {
    const value = event[field];
    if (typeof value !== 'string' || value.trim() === '') {
      at(`missing or empty required field "${field}"`);
    }
  }

  if (typeof event.id === 'string' && event.id !== '') {
    if (seenIds.has(event.id)) {
      at(`duplicate id — also used by events[${seenIds.get(event.id)}]`);
    } else {
      seenIds.set(event.id, i);
    }
  }

  if (typeof event.category === 'string' && !CATEGORIES.has(event.category)) {
    at(`category "${event.category}" is not one of ${[...CATEGORIES].join(' | ')}`);
  }

  if (typeof event.tier === 'string' && !TIERS.has(event.tier)) {
    at(`tier "${event.tier}" is not one of ${[...TIERS].join(' | ')}`);
  }

  if (typeof event.date === 'string') {
    if (!DATE_RE.test(event.date)) {
      at(`date "${event.date}" is not YYYY-MM-DD`);
    } else {
      const parsedDate = new Date(`${event.date}T00:00:00Z`);
      if (Number.isNaN(parsedDate.getTime())) {
        at(`date "${event.date}" is not a real calendar date`);
      } else if (parsedDate > tomorrow) {
        // "How long since" only makes sense for the past — a future date
        // renders as a negative duration.
        at(`date "${event.date}" is in the future`);
      }
    }
  }

  if ('url' in event) {
    if (typeof event.url !== 'string' || !event.url.startsWith('https://')) {
      at(`url must be an https:// string when present (got ${JSON.stringify(event.url)})`);
    }
  } else {
    warnings.push(`${label}: no url — row will render without a deep-dive link`);
  }

  const unknown = Object.keys(event).filter(
    (k) => !REQUIRED_STRINGS.includes(k) && k !== 'url'
  );
  if (unknown.length > 0) {
    warnings.push(`${label}: unrecognized field(s): ${unknown.join(', ')}`);
  }
});

for (const w of warnings) console.warn(`  ! ${w}`);

if (errors.length > 0) {
  console.error(`\n✗ events.json failed validation (${errors.length} error(s)):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

const flagship = events.filter((e) => e.tier === 'flagship').length;
console.log(
  `✓ events.json OK — ${events.length} events (${flagship} flagship, ${events.length - flagship} incremental), ${warnings.length} warning(s)`
);
