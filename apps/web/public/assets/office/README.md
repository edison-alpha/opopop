# OPERRA office assets

80 original pixel-art sprites inspired by the supplied virtual-office reference.

- `individual/`: separate transparent PNG files, named by asset.
- `furniture.png`: packed 512 × 2560 transparent texture atlas.
- `source-*.png`: five original 4 × 4 source sheets.
- Frame coordinates: `apps/web/src/office/game/sprite-frames.json`.
- Preview: `/dev/map` → **Asset library**. Room selector and 2× zoom show the map details.
- Regenerate the atlas, frame manifest and individual files with `pnpm assets:office`.

The game preloads the atlas before rendering. Sprite positions follow the editable map's tile footprints and collision rules. Existing procedural artwork remains the fallback if image loading fails.

The set includes seating in multiple directions, desks, reception, cubby shelves, bookcases, plants, trees, pantry appliances, aquarium, arcade, display, whiteboard, table accessories, windows, doors, bench and koi pond. The architecture sheet includes source variants for future room layouts.
