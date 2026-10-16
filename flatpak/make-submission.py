#!/usr/bin/env python3
"""Turn the CI manifest into the one Flathub can build.

The manifest in this directory sources rigseed from ``type: dir, path: ..``,
the checkout sitting beside it. That is deliberate: it is what makes every
pull request build the code in that pull request rather than the code in the
last tag. Flathub has no such directory, so its copy needs a ``git`` source
pinned to a tag and a commit.

Doing that by hand is where this goes wrong. The vendored ``cargo-sources``
and ``node-sources`` are generated from ``Cargo.lock`` and ``pnpm-lock.yaml``,
and if they are generated from the working tree while the source stanza names
a tag that has drifted from it, the result builds here and fails there, or
builds there against dependencies nobody reviewed. The two facts have to come
from one revision, so this script takes that revision as an argument and the
workflow around it generates the lists from the same checkout.

It only rewrites. It does not resolve tags, reach the network, or guess: the
commit is passed in, because a script that looks up "whatever the tag points
at now" reintroduces the drift it exists to prevent.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path


def rewrite(manifest: str, url: str, tag: str, commit: str) -> str:
    """Replace the rigseed module's directory source with a git one.

    Deliberately textual rather than a YAML round trip. The manifest is dense
    with comments that explain decisions nobody should have to rediscover, and
    every YAML library in Python drops them on write. A rewrite that silently
    deletes the reasoning is a worse outcome than one that refuses to run.
    """
    needle = "      - type: dir\n        path: ..\n"
    if manifest.count(needle) != 1:
        raise SystemExit(
            f"expected exactly one 'type: dir, path: ..' source, found "
            f"{manifest.count(needle)}. The manifest has changed shape; fix "
            f"this script rather than the manifest."
        )

    replacement = (
        "      # Rewritten by make-submission.py from the local directory\n"
        "      # source the CI manifest uses.\n"
        "      #\n"
        "      # The commit is pinned beside the tag because a tag can be moved\n"
        "      # and a commit cannot, and Flathub builds whatever it finds.\n"
        f"      - type: git\n"
        f"        url: {url}\n"
        f"        tag: {tag}\n"
        f"        commit: {commit}\n"
    )
    return manifest.replace(needle, replacement)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("manifest", type=Path)
    parser.add_argument("--url", required=True)
    parser.add_argument("--tag", required=True)
    parser.add_argument("--commit", required=True)
    parser.add_argument("-o", "--output", type=Path, required=True)
    args = parser.parse_args()

    if len(args.commit) != 40 or not all(
        c in "0123456789abcdef" for c in args.commit
    ):
        raise SystemExit(
            f"--commit must be a full 40 character sha, got {args.commit!r}. "
            f"An abbreviated one is ambiguous and Flathub rejects it."
        )

    out = rewrite(
        args.manifest.read_text(encoding="utf-8"),
        args.url,
        args.tag,
        args.commit,
    )
    args.output.write_text(out, encoding="utf-8")

    # The list item, not the bare words. Checking for the words alone matched
    # the comment this script writes about what it replaced, so the guard
    # failed on its own output and reported a manifest that was in fact fine.
    if "- type: dir" in out:
        raise SystemExit(
            "a directory source survived the rewrite, which means Flathub "
            "would be handed a manifest it cannot build"
        )

    print(f"wrote {args.output}")
    print(f"  url    {args.url}")
    print(f"  tag    {args.tag}")
    print(f"  commit {args.commit}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
