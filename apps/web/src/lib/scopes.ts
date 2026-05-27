import { FileText, Star, Trash2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type LibraryScopeId = 'all' | 'starred' | 'trash';

export type LibraryScope = {
  id: LibraryScopeId;
  label: string;
  path: string;
  icon: LucideIcon;
};

export type WorkspaceScope = { kind: 'library'; id: LibraryScopeId } | { kind: 'tag'; id: string };

export const LIBRARY_SCOPES: LibraryScope[] = [
  { id: 'all', label: 'All Notes', path: '/', icon: FileText },
  { id: 'starred', label: 'Starred', path: '/starred', icon: Star },
  { id: 'trash', label: 'Trash', path: '/trash', icon: Trash2 },
];

export const DEFAULT_LIBRARY_SCOPE: LibraryScope = LIBRARY_SCOPES[0]!;
export const DEFAULT_SCOPE: WorkspaceScope = { kind: 'library', id: DEFAULT_LIBRARY_SCOPE.id };

const TAG_PATH = /^\/tags\/([^/]+)$/;

export function tagPath(id: string): string {
  return `/tags/${id}`;
}

export function libraryScope(id: LibraryScopeId): LibraryScope {
  return LIBRARY_SCOPES.find((s) => s.id === id) ?? DEFAULT_LIBRARY_SCOPE;
}

export function scopeToPath(scope: WorkspaceScope): string {
  return scope.kind === 'tag' ? tagPath(scope.id) : libraryScope(scope.id).path;
}

export function scopesEqual(a: WorkspaceScope, b: WorkspaceScope): boolean {
  return a.kind === b.kind && a.id === b.id;
}

export function parseScope(pathname: string): WorkspaceScope {
  const tag = TAG_PATH.exec(pathname);
  if (tag) return { kind: 'tag', id: decodeURIComponent(tag[1]!) };
  const lib = LIBRARY_SCOPES.find((s) => s.path === pathname);
  return lib ? { kind: 'library', id: lib.id } : DEFAULT_SCOPE;
}
