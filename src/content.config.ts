import { defineCollection } from "astro:content";
import { tometLoader } from "@tomet/astro";
import { resolve } from "node:path";

// `.tomet/tmtroot` is the documents of the locked tomet revision, linked by the
// dev shell (nix/dev.nix): the same revision that renders them.
const tmtroot = resolve(process.cwd(), ".tomet", "tmtroot");

const allowedSections = ["guide", "spec", "examples", "why"];

export const collections = {
  docs: defineCollection({
    loader: tometLoader({
      base: tmtroot,
      advanced: true,
      filter: (relPath) => {
        if (relPath === "README.tmt" || relPath === "README.tm") return true;
        const parts = relPath.split("/");
        return allowedSections.includes(parts[0]);
      },
    }),
  }),
  samples: defineCollection({
    loader: tometLoader({
      base: resolve(process.cwd(), "src", "samples"),
      advanced: false,
    }),
  }),
};
