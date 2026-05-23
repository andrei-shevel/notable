import { sql } from 'drizzle-orm';
import {
  boolean,
  customType,
  index,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

const citext = customType<{ data: string; driverData: string }>({
  dataType: () => 'citext',
});

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType: () => 'bytea',
});

// Generated column; never written to. Marked notNull because Postgres always
// produces a value, and exposing it as nullable in TS would just litter the
// query layer with `!` assertions.
const tsvector = customType<{ data: string; driverData: string }>({
  dataType: () => 'tsvector',
});

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: citext('email').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('users_email_uniq').on(t.email)],
);

export const authTokens = pgTable('auth_tokens', {
  tokenHash: bytea('token_hash').primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  consumedAt: timestamp('consumed_at', { withTimezone: true }),
});

export const notes = pgTable(
  'notes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull().default(''),
    bodyJson: jsonb('body_json')
      .notNull()
      .default(sql`'{"type":"doc","content":[]}'::jsonb`),
    bodyText: text('body_text').notNull().default(''),
    starred: boolean('starred').notNull().default(false),
    trashedAt: timestamp('trashed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    searchTsv: tsvector('search_tsv')
      .notNull()
      .generatedAlwaysAs(
        sql`to_tsvector('english', coalesce(title,'') || ' ' || coalesce(body_text,''))`,
      ),
  },
  (t) => [
    index('notes_user_updated_idx').on(t.userId, t.updatedAt.desc()),
    index('notes_search_idx').using('gin', t.searchTsv),
    index('notes_trgm_idx').using('gin', sql`body_text gin_trgm_ops`),
  ],
);

export const tags = pgTable(
  'tags',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    color: text('color').notNull().default('slate'),
  },
  (t) => [uniqueIndex('tags_user_name_uniq').on(t.userId, t.name)],
);

export const noteTags = pgTable(
  'note_tags',
  {
    noteId: uuid('note_id')
      .notNull()
      .references(() => notes.id, { onDelete: 'cascade' }),
    tagId: uuid('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.noteId, t.tagId] })],
);
