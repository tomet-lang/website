/**
 * The tomet revision this build renders: the one locked in flake.lock, set by
 * the dev shell (nix/dev.nix). Refusing to build without it keeps every page
 * traceable to the implementation it describes.
 */
const rev = process.env.TOMET_REV;
if (!rev) {
  throw new Error(
    "TOMET_REV is not set: build inside the Nix dev shell (direnv or `nix develop`).",
  );
}

const isCommit = /^[0-9a-f]{40}(-dirty)?$/.test(rev);

export const tometRev = {
  /** Short form for display: `115afe9`, `115afe9-dirty` or `local`. */
  label: isCommit ? rev.slice(0, 7) + (rev.endsWith("-dirty") ? "-dirty" : "") : rev,
  /** The commit on GitHub, when the revision is a clean one. */
  url:
    isCommit && !rev.endsWith("-dirty")
      ? `https://github.com/tomet-lang/tomet/commit/${rev}`
      : undefined,
};
