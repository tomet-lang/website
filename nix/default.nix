{
  flake-parts,
  ...
}@inputs:
flake-parts.lib.mkFlake { inherit inputs; } {
  systems = [
    "x86_64-linux"
    "aarch64-linux"
    "aarch64-darwin"
  ];
  imports = [
    inputs.treefmt-nix.flakeModule
  ];

  perSystem =
    { pkgs, ... }:
    let
      system = pkgs.stdenv.hostPlatform.system;
      sisho = inputs.sisho.packages.${system};
      sishoLib = inputs.sisho.legacyPackages.${system};
      tometPkgs = inputs.tomet.packages.${system};
    in
    {
      devShells.default = pkgs.callPackage ./dev.nix {
        # sisho, tomet and twrit, with the language server.
        tools = sishoLib.combine [
          sisho.toolchain
          sisho.tomet-lsp
        ];
        tomet = {
          inherit (tometPkgs) tomet-astro tomet-wasm;
          inherit (inputs.tomet) outPath;
          # A locked input has `rev`; a dirty git checkout (`just dev-local`) has
          # `dirtyRev`; a `path:` override has neither.
          rev = inputs.tomet.rev or inputs.tomet.dirtyRev or "local";
        };
      };

      treefmt = import ./formatter.nix {
        inherit (sisho) tomet;
      };
    };
}
