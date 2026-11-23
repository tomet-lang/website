import {
  getCollection,
  getEntry,
  type CollectionEntry,
  type CollectionKey,
} from "astro:content";
import type { DocEntry } from "./sections";

export type PublishedDocEntry =
  | CollectionEntry<"atlas">
  | CollectionEntry<"docs">;

/**
 * Loads a content collection and throws if it is empty.
 */
export async function requireCollection<C extends CollectionKey>(
  collection: C,
): Promise<CollectionEntry<C>[]> {
  const entries = await getCollection(collection);
  if (entries.length === 0) {
    throw new Error(`Content collection "${collection}" is empty.`);
  }
  return entries;
}

/**
 * Loads both `atlas` and `docs` collections and verifies that no route slug
 * collides across them.
 */
export async function loadPublishedDocs(): Promise<{
  entries: PublishedDocEntry[];
  docs: DocEntry[];
}> {
  const [atlasEntries, specEntries] = await Promise.all([
    requireCollection("atlas"),
    requireCollection("docs"),
  ]);

  const entries: PublishedDocEntry[] = [...atlasEntries, ...specEntries];
  const seenSlugs = new Map<string, string>();
  for (const entry of entries) {
    const slug = entry.data.slug;
    const existing = seenSlugs.get(slug);
    if (existing) {
      throw new Error(
        `Duplicate document slug "${slug}" in collections "${existing}" and "${entry.collection}" (${entry.data.sourcePath}).`,
      );
    }
    if (entry.id !== slug) {
      throw new Error(
        `Document entry id "${entry.id}" does not match slug "${slug}" (${entry.data.sourcePath}).`,
      );
    }
    seenSlugs.set(slug, entry.collection);
  }

  const docs: DocEntry[] = entries.map((entry) => ({
    collection: entry.collection,
    slug: entry.data.slug,
    title: entry.data.title,
    sourcePath: entry.data.sourcePath,
    description: entry.data.description,
  }));

  return { entries, docs };
}

/**
 * Loads a single content entry and throws if it is missing or lacks rendered
 * HTML when `isDataOnly` is false.
 */
export async function requireEntry<C extends CollectionKey>(
  collection: C,
  id: CollectionEntry<C>["id"],
): Promise<CollectionEntry<C>> {
  const entry = (await getEntry(collection, id)) as
    | CollectionEntry<C>
    | undefined;
  if (!entry) {
    throw new Error(
      `Missing required entry "${String(id)}" in collection "${collection}".`,
    );
  }
  const isDataOnly =
    "isDataOnly" in entry.data && entry.data.isDataOnly === true;
  if (!isDataOnly && !entry.rendered?.html) {
    throw new Error(
      `Entry "${String(id)}" in collection "${collection}" produced no rendered HTML.`,
    );
  }
  return entry;
}

/**
 * Extracts rendered HTML from a non-data-only entry, throwing if absent.
 */
export function requireRenderedHtml<C extends CollectionKey>(
  entry: CollectionEntry<C>,
): string {
  const html = entry.rendered?.html;
  if (!html) {
    throw new Error(
      `Entry "${entry.id}" in collection "${entry.collection}" produced no rendered HTML.`,
    );
  }
  return html;
}
