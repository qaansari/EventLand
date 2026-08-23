// Auditorium Blueprint Schema Parser & Utilities

export function parseAuditoriumLayout(layoutJson) {
  if (!layoutJson) return null;
  if (typeof layoutJson === 'object') return layoutJson;
  try {
    return JSON.parse(layoutJson);
  } catch {
    return null;
  }
}

export function createBlankLayoutJson(rowCount = 10, seatsPerRow = 20) {
  return JSON.stringify({
    type: "two_block_center_aisle",
    rows: Array.from({ length: rowCount }, (_, idx) => {
      const rowChar = String.fromCharCode(65 + idx);
      const half = Math.floor(seatsPerRow / 2);
      return {
        rowChar,
        left: Array.from({ length: half }, (_, i) => i + 1),
        right: Array.from({ length: seatsPerRow - half }, (_, i) => i + half + 1)
      };
    })
  }, null, 2);
}
