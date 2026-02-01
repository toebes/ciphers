/**
 * Picks `count` random distinct elements from the array (without replacement).
 * Uses modern Fisher–Yates partial shuffle – O(n) time, very fast in practice.
 *
 * @param items   Source array (not modified)
 * @param count   How many items to pick (default 1)
 * @returns       New array with `count` random elements (or fewer if source is smaller)
 */
export function pickRandom<T>(items: readonly T[], count: number = 1): T[] {
    if (count <= 0 || items.length === 0) {
        return [];
    }

    const n = items.length;
    if (count >= n) {
        return [...items];           // or return Array.from(items) if you prefer
    }

    // Work on a copy – never mutate input
    const copy = items.slice();      // or [...items] – slice() is usually fastest

    // Partial Fisher–Yates: only shuffle the first `count` positions
    for (let i = 0; i < count; i++) {
        const j = i + Math.floor(Math.random() * (n - i));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }

    return copy.slice(0, count);
}