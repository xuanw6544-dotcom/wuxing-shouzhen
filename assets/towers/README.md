# Reference tower sprites

Fifteen local PNG sprites extracted from the two user-provided reference sheets,
with user approval to crop and remove backgrounds. No generated redraws are used.
Metal, wood, water and earth use the four-row sheet; fire uses the three-level
progression at the bottom right of the fire sheet. Interior artwork retains the
original JPEG pixels; background matting changes edge pixels and transparency.

`scripts/extract-towers.cjs` records the source paths, crop coordinates and matte
algorithm. Output is limited by the source JPEG resolution. The game draws each
PNG at its intended display size without changing combat behavior. These are
static sprites: reference glows and swirls are baked into the image.

Local review: `tower-review.html`. Not approved for GitHub publication yet.
