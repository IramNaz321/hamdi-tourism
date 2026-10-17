ASSETS-LICENSING.md
==============

This project uses a two-license structure. Please read this before
redistributing or forking.


CODE — under GPLv3 or later
---------------------------
Everything under `cli/`, `scripts/`, `.github/`, plus files at the
repo root that are not listed under ASSETS below — is licensed under
the GNU General Public License, version 3 or later.

Full text: see the `LICENSE` file at the repo root.

Additional attribution requirements under GPLv3 § 7(b) are recorded
in the `NOTICE` file, which must be preserved with all redistributions.


ASSETS — each image has its own free-license
--------------------------------------------
The following are NOT under GPLv3:

  - `assets/images/*.png`      — car photos
  - `assets/ansi/*.txt`        — pre-rendered ANSI derivatives of those photos
  - `assets/licenses/*.json`   — per-image attribution records

Every image was sourced from Wikimedia Commons or a similar free-
culture repository, and each carries its own individual free-license,
one of:

  - Creative Commons Zero (CC0)
  - Creative Commons Attribution (CC BY, any version)
  - Creative Commons Attribution-ShareAlike (CC BY-SA, any version)
  - GNU Free Documentation License (GFDL)
  - Public Domain
  - Free Art License
  - Copyrighted Free Use

The exact license, author, source URL, and license URL for each
image is stored in `assets/licenses/<slug>.json`. A human-readable
summary of all image credits is in `CREDITS.md` at the repo root.


WHAT THIS MEANS FOR REDISTRIBUTION
----------------------------------
If you redistribute this project — fork it, package it, ship a
binary bundling the assets — you MUST:

  1. Include the `LICENSE` file (GPLv3) for the code.
  2. Include the `NOTICE` file so author attribution travels with
     the work.
  3. Keep `assets/licenses/` intact. It is the attribution that
     makes the images redistributable — without it, the images
     lose their license validity.
  4. Preserve `CREDITS.md`.
  5. For any image licensed ShareAlike (CC BY-SA, GFDL), if you
     modify that image, you must release the modified version
     under the same license.

If you're redistributing ONLY the CODE (not the images):
you only need GPLv3 + NOTICE. You don't need to comply with the
image licenses because you aren't distributing the images.


MANIFEST AND DATABASE
---------------------
`manifest.json` and `data/car_database_v2.txt` are original curation
work — the mapping of slugs to metadata, brand groupings, decade
categorization, and the pipeline that produced them. They are under
GPLv3, part of the code. They do not inherit the image licenses.


CONTRIBUTING NEW IMAGES
-----------------------
When adding a new car via `scripts/add_car.py`, the script requires
you to declare the license explicitly. It refuses to accept images
under Fair Use, All Rights Reserved, NC (non-commercial), ND (no
derivatives), or any restrictive license. This is enforced to keep
the project fully redistributable.


CONCERNS
--------
If you believe a specific image's license attribution is incorrect,
please open an issue with the slug and the correct attribution.
Licensing accuracy matters — we'll fix it quickly.
