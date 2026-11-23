{
  pkgs,
  mkShell,

  tools,
  tomet,
  ...
}:
mkShell {
  buildInputs = with pkgs; [
    #= Develop
    tools
    just
    deno

    #= Runtime
    nodejs
  ];

  # Read by src/lib/tomet.ts; the site refuses to build without it.
  TOMET_REV = tomet.rev;

  # `.tomet/` is the only way the site reaches tomet: package.json depends on
  # `file:.tomet/astro` and `file:.tomet/wasm`, the content loader reads
  # `.tomet/tmtroot` and `.tomet/vault.config.tmt`. Every link points into the
  # same locked revision, and the store paths stay alive as long as this shell does.
  shellHook = ''
    mkdir -p .tomet
    ln -sfn ${tomet.tomet-astro} .tomet/astro
    ln -sfn ${tomet.tomet-wasm} .tomet/wasm
    ln -sfn ${tomet.outPath}/tmtroot .tomet/tmtroot
    ln -sfn ${tomet.outPath}/vault.config.tmt .tomet/vault.config.tmt
    echo "📖 Tomet @ ${tomet.rev}"
  '';
}
