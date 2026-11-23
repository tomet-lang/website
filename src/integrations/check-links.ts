import type { AstroIntegration } from "astro";
import { promises as fs } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

interface PageRecord {
  relPath: string;
  urlBase: string;
  ids: Set<string>;
  hrefs: string[];
}

interface BrokenLink {
  source: string;
  href: string;
  reason: string;
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/gi, "'")
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCodePoint(parseInt(hex, 16)),
    );
}

function safeDecodeUri(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function stripNonContent(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "");
}

function extractIds(html: string): Set<string> {
  const ids = new Set<string>();
  const re = /<[^!/?][^>]*?\bid\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    const raw = match[1] ?? match[2] ?? match[3] ?? "";
    const id = decodeHtmlEntities(raw).trim();
    if (id) ids.add(id);
  }
  return ids;
}

function extractHrefs(html: string): string[] {
  const hrefs: string[] = [];
  const re =
    /<(?:a|area|link)\b[^>]*?\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    const raw = match[1] ?? match[2] ?? match[3] ?? "";
    hrefs.push(decodeHtmlEntities(raw).trim());
  }
  return hrefs;
}

async function collectFiles(dir: string, baseDir: string = dir): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(fullPath, baseDir)));
    } else if (entry.isFile()) {
      files.push(relative(baseDir, fullPath).split("\\").join("/"));
    }
  }
  return files;
}

function registerPageRoutes(
  routes: Map<string, PageRecord>,
  relPath: string,
  page: PageRecord,
): void {
  const slashPath = `/${relPath}`;
  routes.set(slashPath, page);
  if (relPath === "index.html") {
    routes.set("/", page);
  } else if (relPath.endsWith("/index.html")) {
    const dirRoute = `/${relPath.slice(0, -"/index.html".length)}`;
    routes.set(dirRoute, page);
    routes.set(`${dirRoute}/`, page);
  } else if (relPath.endsWith(".html")) {
    routes.set(`/${relPath.slice(0, -".html".length)}`, page);
  }
}

function lookupPage(
  routes: Map<string, PageRecord>,
  pathname: string,
): PageRecord | undefined {
  const decoded = safeDecodeUri(pathname);
  for (const candidate of [pathname, decoded]) {
    const direct = routes.get(candidate);
    if (direct) return direct;
    if (candidate.length > 1 && candidate.endsWith("/")) {
      const trimmed = routes.get(candidate.slice(0, -1));
      if (trimmed) return trimmed;
    }
  }
  return undefined;
}

function hasAssetFile(allFiles: ReadonlySet<string>, pathname: string): boolean {
  const decoded = safeDecodeUri(pathname);
  return allFiles.has(pathname) || allFiles.has(decoded);
}

/**
 * Verifies every internal link and `#fragment` anchor in the built static
 * output (`dist/`). Fails the build with a complete list if any link is broken.
 */
export default function checkLinks(): AstroIntegration {
  return {
    name: "tomet-website-check-links",
    hooks: {
      "astro:build:done": async ({ dir, logger }) => {
        const outDir = fileURLToPath(dir);
        const relFiles = await collectFiles(outDir);
        const allFiles = new Set(relFiles.map((f) => `/${f}`));
        const routes = new Map<string, PageRecord>();
        const pages: PageRecord[] = [];

        for (const relPath of relFiles) {
          if (!relPath.endsWith(".html")) continue;
          const rawHtml = await fs.readFile(join(outDir, relPath), "utf8");
          const html = stripNonContent(rawHtml);
          const urlBase =
            relPath === "index.html"
              ? "/"
              : relPath.endsWith("/index.html")
                ? `/${relPath.slice(0, -"index.html".length)}`
                : `/${relPath}`;
          const page: PageRecord = {
            relPath,
            urlBase,
            ids: extractIds(html),
            hrefs: extractHrefs(html),
          };
          pages.push(page);
          registerPageRoutes(routes, relPath, page);
        }

        if (pages.length === 0) {
          throw new Error(`No HTML pages found in build output (${outDir}).`);
        }

        const broken: BrokenLink[] = [];
        let checked = 0;

        for (const page of pages) {
          for (const href of page.hrefs) {
            // Skip external URLs, protocol-relative URLs, and non-file schemes
            // (mailto:, tel:, data:, javascript:, etc.); builds run offline.
            if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(href) || href.startsWith("//")) {
              continue;
            }
            checked++;

            if (href === "") {
              broken.push({
                source: page.relPath,
                href,
                reason: "empty href",
              });
              continue;
            }

            if (href.startsWith("#")) {
              const fragment = href.slice(1);
              if (
                fragment.length > 0 &&
                !page.ids.has(fragment) &&
                !page.ids.has(safeDecodeUri(fragment))
              ) {
                broken.push({
                  source: page.relPath,
                  href,
                  reason: `missing anchor "#${fragment}" in ${page.relPath}`,
                });
              }
              continue;
            }

            const hashIdx = href.indexOf("#");
            const pathAndQuery = hashIdx === -1 ? href : href.slice(0, hashIdx);
            const fragment = hashIdx === -1 ? "" : href.slice(hashIdx + 1);
            const queryIdx = pathAndQuery.indexOf("?");
            const pathPart =
              queryIdx === -1 ? pathAndQuery : pathAndQuery.slice(0, queryIdx);

            const resolvedPath = new URL(
              pathPart,
              `https://site.invalid${page.urlBase}`,
            ).pathname;

            const targetPage = lookupPage(routes, resolvedPath);
            if (targetPage) {
              if (
                fragment.length > 0 &&
                !targetPage.ids.has(fragment) &&
                !targetPage.ids.has(safeDecodeUri(fragment))
              ) {
                broken.push({
                  source: page.relPath,
                  href,
                  reason: `missing anchor "#${fragment}" in ${targetPage.relPath}`,
                });
              }
              continue;
            }

            if (hasAssetFile(allFiles, resolvedPath)) {
              if (fragment.length > 0) {
                broken.push({
                  source: page.relPath,
                  href,
                  reason: `fragment "#${fragment}" on non-HTML asset ${resolvedPath}`,
                });
              }
              continue;
            }

            broken.push({
              source: page.relPath,
              href,
              reason: `missing target "${resolvedPath}"`,
            });
          }
        }

        if (broken.length > 0) {
          const lines = broken.map(
            (b) => `  ${b.source}: href="${b.href}" (${b.reason})`,
          );
          throw new Error(
            `${broken.length} broken internal link(s) found in build output:\n${lines.join("\n")}`,
          );
        }

        logger.info(
          `Verified ${checked} internal link(s) across ${pages.length} HTML page(s).`,
        );
      },
    },
  };
}
