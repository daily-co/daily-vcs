/**
 * VCS Animation System
 *
 * Provides two types of animations for VCS compositions:
 *
 * 1. Layout animations (automatic, predicate-triggered):
 *    - Animate frame properties (x, y, w, h) when layout changes
 *    - Export a layoutAnimations array from your composition
 *    - Use animationId prop on elements to link them to animation definitions
 *
 * 2. Style animations (manual, time-based):
 *    - Animate style properties (opacity, fillColor, etc.)
 *    - Create with animator.forStyle() and call .at(time) in components
 *
 * Example:
 * ```
 * export const layoutAnimations = [
 *   {
 *     animationId: 'my-container',
 *     properties: ['x', 'y', 'w', 'h'],
 *     predicate: 'frame-change-non-zero',
 *     function: 'ease-out',
 *     duration: 0.3,
 *   },
 * ];
 * ```
 *
 * Available predicates:
 * - 'present': Node appeared or disappeared
 * - 'frame-non-zero': Frame became non-zero or zero
 * - 'frame-change-any': Any frame property changed
 * - 'frame-change-non-zero': Frame changed while both old and new are non-zero (default)
 * - 'frame-change-to-zero': Frame went from non-zero to zero
 *
 * Available easing functions:
 * - 'linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out', 'hold'
 * - ['cubic', x1, y1, x2, y2] for custom bezier curves
 *
 * See ANIMATIONS.md for full documentation.
 */

export { default as makeBezierEasing } from './bezier-easing.js';

export {
  AnimationPredicateType,
  isFrameNonZero,
  areFramesEqual,
  evaluatePredicate,
} from './predicates.js';

export {
  VcsAnimator,
  AnimatorFunctionType,
  AnimatorLoopType,
} from './animator.js';
