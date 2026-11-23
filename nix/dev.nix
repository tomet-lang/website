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

  # `.tomet/` exposes the locked `@tomet/astro` and `@tomet/wasm` toolchain
  # packages (`package.json` depends on them via `file:.tomet/*`).
  shellHook = ''
    mkdir -p .tomet
    rm -f .tomet/tmtroot .tomet/vault.config.tmt
    ln -sfn ${tomet.tomet-astro} .tomet/astro
    ln -sfn ${tomet.tomet-wasm} .tomet/wasm
    echo "📖 Tomet toolchain @ ${tomet.rev}"
  '';
}
