import { FileText, Star, Trash2 } from 'natural/icons';
import type { LucideIcon } from 'natural/icons';

export type LibraryScopeId = 'all' | 'starred' | 'trash';

export type LibraryScope = {
  id: LibraryScopeId;
  label: string;
  path: string;
  icon: LucideIcon;
};

export type WorkspaceScope = { kind: 'library'; id: LibraryScopeId };

export const LIBRARY_SCOPES: LibraryScope[] = [
  { id: 'all', label: 'All Notes', path: '/', icon: FileText },
  { id: 'starred', label: 'Starred', path: '/starred', icon: Star },
  { id: 'trash', label: 'Trash', path: '/trash', icon: Trash2 },
];

export const DEFAULT_LIBRARY_SCOPE: LibraryScope = LIBRARY_SCOPES[0]!;
export const DEFAULT_SCOPE: WorkspaceScope = { kind: 'library', id: DEFAULT_LIBRARY_SCOPE.id };

export function libraryScope(id: LibraryScopeId): LibraryScope {
  return LIBRARY_SCOPES.find((s) => s.id === id) ?? DEFAULT_LIBRARY_SCOPE;
}

export function scopeToPath(scope: WorkspaceScope): string {
  return libraryScope(scope.id).path;
}

export function scopesEqual(a: WorkspaceScope, b: WorkspaceScope): boolean {
  return a.kind === b.kind && a.id === b.id;
}

export function parseScope(pathname: string): WorkspaceScope {
  const lib = LIBRARY_SCOPES.find((s) => s.path === pathname);
  return lib ? { kind: 'library', id: lib.id } : DEFAULT_SCOPE;
}
