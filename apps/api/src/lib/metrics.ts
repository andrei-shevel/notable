import client from 'prom-client';

// Custom domain metrics. They're created against prom-client's *global* default
// registry — the same one fastify-metrics scrapes for its default Node metrics
// (event-loop lag, heap, GC) and per-route `http_request_duration_seconds`
// histogram — so everything shows up in the single `/metrics` exposition.
//
// These live in a plain module (not the DI container) and are imported directly
// by the services that emit them, mirroring how the services already import the
// `mail/*` helpers. Incrementing a counter is process-local and side-effect
// free, so it stays safe to call from unit tests with faked repositories.

// Login funnel + verification outcomes. The `outcome` label makes the
// brute-force defense measurable: a surge of {event="verify",outcome="failure"}
// is exactly what the per-token attempt cap and per-IP rate limit guard against.
export const authEventsTotal = new client.Counter({
  name: 'notable_auth_events_total',
  help: 'Authentication events by type and outcome.',
  labelNames: ['event', 'outcome'] as const,
});

export const notesCreatedTotal = new client.Counter({
  name: 'notable_notes_created_total',
  help: 'Notes created.',
});

// `kind` separates a fresh upload from a server-side clone (paste across notes),
// which have very different cost profiles (stream-through vs. S3 copy).
export const fileUploadsTotal = new client.Counter({
  name: 'notable_file_uploads_total',
  help: 'Files written to object storage by kind.',
  labelNames: ['kind'] as const,
});

// Buckets span small inline images up to the 25 MB request cap enforced in
// server.ts, so the histogram captures the realistic upload-size distribution.
export const fileUploadBytes = new client.Histogram({
  name: 'notable_file_upload_bytes',
  help: 'Size of files written to object storage, in bytes.',
  buckets: [
    16 * 1024,
    128 * 1024,
    1024 * 1024,
    4 * 1024 * 1024,
    16 * 1024 * 1024,
    25 * 1024 * 1024,
  ],
});
