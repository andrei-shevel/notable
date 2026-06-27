// Module augmentation for the provide/inject channel. Kept in its own ambient
// declaration (rather than inside globalSetup.ts) so the typing applies across
// the whole test program without any file needing to import globalSetup —
// otherwise inject('databaseUrl') sees an empty ProvidedContext and the key
// type collapses to `never`.
export {};

declare module 'vitest' {
  interface ProvidedContext {
    databaseUrl: string;
  }
}
