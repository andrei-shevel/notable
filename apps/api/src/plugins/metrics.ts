import fp from 'fastify-plugin';
import metricsPlugin from 'fastify-metrics';

// Prometheus instrumentation. fastify-metrics collects:
//   - default Node process metrics (event-loop lag, heap, GC, handles), and
//   - a per-route `http_request_duration_seconds` histogram labelled by the
//     low-cardinality route pattern (e.g. /api/notes/:id, not the raw URL) —
//     giving latency (p50/p95/p99), throughput and error rate per endpoint.
// Custom domain metrics (see lib/metrics.ts) ride the same global registry and
// appear in the same exposition.
//
// The string `endpoint` registers GET /metrics at logLevel 'fatal', so the
// frequent scrape never floods the request log (same intent as the warn-level
// /api/health route). In production the endpoint should be reachable only from
// the metrics scraper's network, not the public edge.
export default fp(async (app) => {
  await app.register(metricsPlugin, {
    endpoint: '/metrics',
  });
});
