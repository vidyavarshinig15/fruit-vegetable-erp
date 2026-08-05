// Unit mapper helper to map UI units safely to PostgreSQL Enum limits
export const mapUnitToEnum = (unit) => {
    const u = unit.toLowerCase().trim();
    if (u === 'kg' || u === 'gram' || u === 'litre' || u === 'millilitre')
        return 'KG';
    if (u === 'crate' || u === 'tray')
        return 'CRATE';
    if (u === 'bag' || u === 'bundle')
        return 'BAG';
    if (u === 'box' || u === 'packet')
        return 'BOX';
    if (u === 'piece' || u === 'no.')
        return 'PIECE';
    if (u === 'dozen')
        return 'DOZEN';
    if (u === 'quintal')
        return 'QUINTAL';
    // Enforce standard uppercase enum types
    const upper = unit.toUpperCase();
    if (['KG', 'CRATE', 'BAG', 'QUINTAL', 'BOX', 'PIECE', 'DOZEN'].includes(upper)) {
        return upper;
    }
    return 'KG';
};
