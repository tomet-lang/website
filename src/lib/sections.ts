/**
 * Topic metadata and grouping helpers for published `atlas` and `spec/` documentation.
 */
export interface SpecTopic {
  /** Subdirectory under `spec/`, or `""` for top-level `spec/*.tmt` files. */
  dir: string;
  label: string;
  blurb: string;
}

export const SPEC_TOPICS: readonly SpecTopic[] = [
  { dir: "", label: "基本概念", blurb: "設計原則・階層構造・用語" },
  { dir: "syntax", label: "構文", blurb: "アドレス・エスケープ・基本文法" },
  { dir: "forms", label: "フォーム", blurb: "hole / slot の構文形式" },
  { dir: "expressions", label: "式", blurb: "アドレス・フィルタ・マクロ・include" },
  { dir: "declarations", label: "宣言", blurb: "::meta / ::profile / ::format などの文書宣言" },
  { dir: "elements", label: "要素", blurb: "組み込み @ 要素の仕様" },
  { dir: "features", label: "機能", blurb: "語彙・ブループリント・設定・ルール" },
  { dir: "division", label: "区分", blurb: "セクション・構造の単位" },
  { dir: "cli", label: "CLI", blurb: "tomet コマンドの仕様" },
  { dir: "lsp", label: "LSP", blurb: "tomet-lsp の診断と編集支援" },
  { dir: "bindings", label: "バインディング", blurb: "各言語向け API と検証" },
];

export interface DocEntry {
  collection: "atlas" | "docs";
  slug: string;
  title: string;
  sourcePath: string;
  description?: string | null;
}

export interface SpecGroup extends SpecTopic {
  entries: DocEntry[];
}

export interface DocGroup extends SpecGroup {
  /** Stable HTML anchor id for index and ToC links. */
  id: string;
}

/**
 * Extracts the topic directory from a `spec/...` slug.
 * e.g. `spec/cli/overview` -> `cli`, `spec/design` -> `""`.
 */
export function docTopic(slug: string): string {
  const rest = slug.startsWith("spec/") ? slug.slice("spec/".length) : slug;
  const slash = rest.indexOf("/");
  return slash === -1 ? "" : rest.slice(0, slash);
}

/**
 * Short navigation label for a doc slug within its topic.
 * e.g. (`spec/cli/overview`, `cli`) -> `overview`.
 */
export function docLabel(slug: string, topicDir: string): string {
  const prefix = topicDir ? `spec/${topicDir}/` : "spec/";
  return slug.startsWith(prefix) ? slug.slice(prefix.length) : slug;
}

/**
 * Display label for a document inside its group (title for `atlas` guides,
 * short topic-relative slug for `spec/` references).
 */
export function entryLabel(entry: DocEntry, topicDir: string): string {
  return entry.collection === "atlas"
    ? entry.title
    : docLabel(entry.slug, topicDir);
}

/**
 * Groups `spec/` entries by topic in `SPEC_TOPICS` order, appending any
 * unknown subdirectories alphabetically so new spec topics are never dropped.
 */
export function groupSpecDocs(docs: readonly DocEntry[]): SpecGroup[] {
  const byTopic = new Map<string, DocEntry[]>();
  for (const doc of docs) {
    const topic = docTopic(doc.slug);
    const list = byTopic.get(topic);
    if (list) {
      list.push(doc);
    } else {
      byTopic.set(topic, [doc]);
    }
  }

  const sortEntries = (entries: DocEntry[]) =>
    [...entries].sort((a, b) => a.slug.localeCompare(b.slug));

  const groups: SpecGroup[] = [];
  for (const topic of SPEC_TOPICS) {
    const entries = byTopic.get(topic.dir);
    if (entries && entries.length > 0) {
      groups.push({ ...topic, entries: sortEntries(entries) });
      byTopic.delete(topic.dir);
    }
  }

  for (const [dir, entries] of [...byTopic.entries()].sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    groups.push({
      dir,
      label: dir,
      blurb: `${dir} に関する仕様`,
      entries: sortEntries(entries),
    });
  }

  return groups;
}

/**
 * Groups all published docs with `atlas` ecosystem guides first,
 * followed by `tomet` specification topics.
 */
export function groupAllDocs(docs: readonly DocEntry[]): DocGroup[] {
  const atlasDocs = docs
    .filter((d) => d.collection === "atlas")
    .sort((a, b) => a.slug.localeCompare(b.slug));
  const specDocs = docs.filter((d) => d.collection === "docs");

  const groups: DocGroup[] = [];
  if (atlasDocs.length > 0) {
    groups.push({
      id: "ecosystem",
      dir: "",
      label: "エコシステム",
      blurb: "Tomet エコシステムの全体像と各リポジトリの役割分担",
      entries: atlasDocs,
    });
  }

  for (const specGroup of groupSpecDocs(specDocs)) {
    groups.push({
      ...specGroup,
      id: `topic-${specGroup.dir || "general"}`,
    });
  }

  return groups;
}
