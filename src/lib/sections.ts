/**
 * Topic metadata and grouping helpers for the published `spec/` documentation.
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
  slug: string;
  title: string;
  sourcePath: string;
  description?: string | null;
}

export interface SpecGroup extends SpecTopic {
  entries: DocEntry[];
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
