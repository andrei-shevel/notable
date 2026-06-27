import type { FastifyInstance } from 'fastify';
import { sql } from '@/db/client';
import { storage } from '@/lib/storage';

// Create the storage bucket up front so the first upload doesn't fail against a
// fresh MinIO instance (which starts with no buckets). Exits the process on
// failure — there's no point serving traffic that can't store uploads.
export async function ensureBucket(app: FastifyInstance): Promise<void> {
  try {
    await storage.ensureBucket();
  } catch (err) {
    app.log.error(err, 'failed to ensure storage bucket');
    process.exit(1);
  }
}

// Graceful shutdown so the postgres pool drains cleanly when the container
// receives SIGTERM (e.g. docker compose down, k8s rolling deploy).
export function registerGracefulShutdown(app: FastifyInstance): void {
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, async () => {
      app.log.info({ signal }, 'shutting down');
      await app.close();
      await sql.end({ timeout: 5 });
      process.exit(0);
    });
  }
}
