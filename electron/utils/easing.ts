/**
 * Ease-in-out cubic easing function.
 * @param t - The time ratio, from 0 to 1.
 * @returns The eased value.
 */
export function easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}