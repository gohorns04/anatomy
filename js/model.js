export const SYSTEMS = ['muscle', 'bone'];
export const SIDES = ['front', 'back'];

const TEXT_FIELDS = ['id', 'name_ko', 'name_en', 'name_la', 'summary', 'fact'];

export function validateParts(parts) {
  const errors = [];
  const seen = new Set();
  parts.forEach((part, i) => {
    const label = part?.id || `#${i}`;
    for (const field of TEXT_FIELDS) {
      if (typeof part[field] !== 'string' || part[field].trim() === '') {
        errors.push(`${label}: ${field} must be a non-empty string`);
      }
    }
    if (!SYSTEMS.includes(part.system)) {
      errors.push(`${label}: unknown system "${part.system}"`);
    }
    if (!Array.isArray(part.sides) || part.sides.length === 0) {
      errors.push(`${label}: sides must be a non-empty array`);
    } else {
      for (const side of part.sides) {
        if (!SIDES.includes(side)) errors.push(`${label}: unknown side "${side}"`);
      }
    }
    if (seen.has(part.id)) errors.push(`${label}: duplicate id`);
    seen.add(part.id);
  });
  return errors;
}

export function partsForView(parts, system, side) {
  return parts.filter((p) => p.system === system && p.sides.includes(side));
}

export function findPart(parts, id) {
  return parts.find((p) => p.id === id) ?? null;
}
