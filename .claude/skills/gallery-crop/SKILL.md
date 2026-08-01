---
name: gallery-crop
description: Crop and circular-mask a photo for the Probaho gallery/homepage grid, matching the existing quality11.png / DurgaImg*.png style (623x733, center-cropped, soft anti-aliased circular alpha mask). Use whenever the user provides or names a new source image (jpg/jpeg/png) and asks to add it, use it, or process it for the gallery, homepage gallery grid, or as a thumbnail — even if they don't spell out the crop steps.
---

# Gallery circular crop

This site's gallery/homepage thumbnails (`images/quality11.png`,
`images/DurgaImg1.png`...`DurgaImg8.png`) all share one visual treatment:
center-cropped to a 623x733 portrait aspect ratio, then masked with a soft
anti-aliased circle so the corners are transparent. New photos must match
this exactly or they'll look inconsistent in the grid.

## Steps

1. Confirm the source image exists (ask the user where it is if it's not
   already in `images/`, like past DurgaImg* sources).
2. Run the existing script — do not hand-roll the crop/mask logic inline:

   ```
   python scripts/crop_for_gallery.py images/<source-file>
   ```

   This writes `images/<source-file-basename>.png` (623x733, circular
   alpha mask), overwriting any existing file of that name. Pass multiple
   paths at once to batch-process several images in one call.

3. Render a quick preview (composite over a solid color background, since
   the output PNG's transparent corners look identical to a white page
   background otherwise) and show it to the user before wiring it in:

   ```python
   from PIL import Image
   im = Image.open('images/<output>.png')
   bg = Image.new('RGBA', im.size, (44, 104, 150, 255))
   bg.alpha_composite(im)
   bg.convert('RGB').save('<scratchpad>/preview.png')
   ```

   Read that preview file back to visually confirm the crop looks
   reasonable (centered on the subject, no awkward cropping) before
   proceeding.

4. Wire the new `.png` into the relevant page(s):
   - Homepage (`index.html`): the 8-slot "Gallery of Past Events" grid
     (search for `quality-box`).
   - Gallery page (`gallery.html`): same `quality-box` grid, each `<img
     class="gallery-thumb">` also has a `data-full` attribute pointing at
     the original full-resolution source (jpg/jpeg) for the lightbox —
     set `data-full` to the original file passed into the script, not the
     generated `.png`.

## Notes

- Default target size is 623x733 (matches `quality11.png`). Only override
  with `--size WxH` if the user explicitly asks for a different grid/shape.
- The script always overwrites the output `.png` — if the user says
  "reprocess" or "redo" an image, just re-run the script on the (possibly
  replaced) source file rather than asking clarifying questions about the
  mechanics.
- If Pillow is missing, install it first: `python -m pip install Pillow`.
