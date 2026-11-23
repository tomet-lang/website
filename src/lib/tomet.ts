import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

interface CatastoFileLock {
  sha256?: unknown;
  source?: {
    git?: unknown;
    rev?: unknown;
    path?: unknown;
  };
  commit?: unknown;
}

interface CatastoLockFile {
  version?: unknown;
  files?: Record<string, CatastoFileLock>;
}

export interface RepoRev {
  /** Full locked git commit SHA from `catasto.lock`. */
  commit: string;
  /** Short 7-character commit hash for display. */
  label: string;
  /** Commit URL on the upstream git forge. */
  url: string;
  /** Source link templates for files/directories outside published docs. */
  sourceUrl: {
    file: string;
    dir: string;
  };
}

const lockPath = resolve(process.cwd(), "catasto.lock");

function loadCatastoLock(): CatastoLockFile {
  if (!existsSync(lockPath)) {
    throw new Error(
      `Missing catasto.lock at ${lockPath}: run \`catasto sync\` inside the Nix dev shell.`,
    );
  }
  let raw: string;
  try {
    raw = readFileSync(lockPath, "utf8");
  } catch (err) {
    throw new Error(`Failed to read ${lockPath}: ${(err as Error).message}`);
  }
  let parsed: CatastoLockFile;
  try {
    parsed = JSON.parse(raw) as CatastoLockFile;
  } catch (err) {
    throw new Error(`Invalid JSON in ${lockPath}: ${(err as Error).message}`);
  }
  if (
    parsed.version !== 1 ||
    !parsed.files ||
    typeof parsed.files !== "object"
  ) {
    throw new Error(
      `Unsupported or incomplete catasto.lock format in ${lockPath}.`,
    );
  }
  return parsed;
}

const catastoLock = loadCatastoLock();

/**
 * Returns locked revision metadata and GitHub URL templates for a repository
 * prefix under `files` in `catasto.lock` (e.g. `"repos/tomet"`), verifying
 * that all copied entries for that repository share the exact same commit.
 */
export function repoRev(repoPrefix: string): RepoRev {
  const normalizedPrefix = `${repoPrefix.replace(/\/+$/, "")}/`;
  const entries = Object.entries(catastoLock.files ?? {}).filter(
    ([dest]) => dest === repoPrefix || dest.startsWith(normalizedPrefix),
  );

  if (entries.length === 0) {
    throw new Error(
      `Missing "${normalizedPrefix}*" entries in catasto.lock: run \`catasto sync\`.`,
    );
  }

  let sharedCommit: string | null = null;
  let sharedRepoWebUrl: string | null = null;

  for (const [dest, entry] of entries) {
    const sha256 = typeof entry.sha256 === "string" ? entry.sha256.trim() : "";
    if (!/^[0-9a-f]{64}$/.test(sha256)) {
      throw new Error(
        `Invalid or missing sha256 for "${dest}" in catasto.lock (got "${String(entry.sha256)}").`,
      );
    }

    const commit = typeof entry.commit === "string" ? entry.commit.trim() : "";
    if (!/^[0-9a-f]{40}$/.test(commit)) {
      throw new Error(
        `Invalid or missing commit SHA for "${dest}" in catasto.lock (got "${String(entry.commit)}").`,
      );
    }

    const git =
      typeof entry.source?.git === "string" ? entry.source.git.trim() : "";
    const repoWebUrl = git.replace(/\.git$/, "");
    if (!/^https?:\/\//.test(repoWebUrl)) {
      throw new Error(
        `Unsupported git URL "${git}" for "${dest}" in catasto.lock.`,
      );
    }

    if (sharedCommit === null) {
      sharedCommit = commit;
      sharedRepoWebUrl = repoWebUrl;
    } else {
      if (commit !== sharedCommit) {
        throw new Error(
          `Mismatched commits under "${normalizedPrefix}" in catasto.lock: "${dest}" is at ${commit}, expected ${sharedCommit}. Run \`catasto sync --update\`.`,
        );
      }
      if (repoWebUrl !== sharedRepoWebUrl) {
        throw new Error(
          `Mismatched git upstreams under "${normalizedPrefix}" in catasto.lock: "${dest}" points to ${repoWebUrl}, expected ${sharedRepoWebUrl}.`,
        );
      }
    }
  }

  const commit = sharedCommit!;
  const repoWebUrl = sharedRepoWebUrl!;

  return {
    commit,
    label: commit.slice(0, 7),
    url: `${repoWebUrl}/commit/${commit}`,
    sourceUrl: {
      file: `${repoWebUrl}/blob/${commit}/{path}`,
      dir: `${repoWebUrl}/tree/${commit}/{path}`,
    },
  };
}

export const tometRev = repoRev("repos/tomet");
export const atlasRev = repoRev("repos/atlas");
