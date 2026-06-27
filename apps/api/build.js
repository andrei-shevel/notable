// Production build for @notable/api.
//
// We compile the TypeScript in src/ to runnable ESM with esbuild instead of
// running it through tsx at boot. Two entrypoints are emitted: the server and
// the standalone migration runner (the container starts the latter first).
//
// Externalization rule (see the plugin below): keep the api's *own* declared
// npm dependencies external — they're already JS in node_modules and the
// runtime image installs them with pnpm — but bundle everything else. "Else"
// is the @notable/* workspace packages, which ship raw TypeScript node can't
// execute and so must be inlined. Their only runtime dependency (zod) is itself
// one of the api's declared deps, so it stays external too. node builtins are
// left to esbuild's default resolver, which externalizes them for platform node.
//
// The `@/*` path alias is resolved from tsconfig.json.

import { readFile } from 'node:fs/promises';
import { build } from 'esbuild';

const pkg = JSON.parse(await readFile(new URL('./package.json', import.meta.url)));

// The api's declared runtime deps, minus workspace packages (which we bundle).
const externalDeps = new Set(
  Object.keys(pkg.dependencies ?? {}).filter((d) => !d.startsWith('@notable/')),
);

const packageName = (path) => {
  const parts = path.split('/');
  return path.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
};

/** Externalize the api's declared deps; let esbuild bundle/resolve the rest. */
const externalizeDeclaredDeps = {
  name: 'externalize-declared-deps',
  setup(build) {
    // Bare specifiers only (skip ./ ../ / which always bundle normally).
    build.onResolve({ filter: /^[^./]/ }, (args) => {
      if (externalDeps.has(packageName(args.path))) {
        return { path: args.path, external: true };
      }
      // node: builtins and @notable/* fall through to default resolution:
      // builtins get externalized for platform node, workspace TS gets bundled.
      return undefined;
    });
  },
};

await build({
  entryPoints: ['src/server.ts', 'src/db/migrate.ts'],
  outdir: 'dist',
  outbase: 'src',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  sourcemap: true,
  tsconfig: './tsconfig.json',
  plugins: [externalizeDeclaredDeps],
  logLevel: 'info',
});
