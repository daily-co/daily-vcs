/**
 * VCS Layout Animation System - Animator module
 *
 * Provides the VcsAnimator factory class and LayoutPropertyAnimator
 * for animating layout frame properties (x, y, w, h).
 */

import makeBezierEasing from './bezier-easing.js';
import { AnimationPredicateType } from './predicates.js';

/**
 * Easing function types matching CSS transition timing functions.
 */
export const AnimatorFunctionType = {
  /** Linear interpolation (no easing) */
  LINEAR: 'linear',
  /** Standard ease curve: cubic-bezier(0.25, 0.1, 0.25, 1) */
  EASE: 'ease',
  /** Ease-in curve: cubic-bezier(0.42, 0, 1, 1) */
  EASE_IN: 'ease-in',
  /** Ease-out curve: cubic-bezier(0, 0, 0.58, 1) */
  EASE_OUT: 'ease-out',
  /** Ease-in-out curve: cubic-bezier(0.42, 0, 0.58, 1) */
  EASE_IN_OUT: 'ease-in-out',
  /** Step function: holds at start value until end */
  HOLD: 'hold',
  /** Custom cubic-bezier (specify control points) */
  CUBIC: 'cubic',
};

/**
 * Loop types for animations.
 */
export const AnimatorLoopType = {
  /** Play once and stop */
  ONCE: 'once',
  /** Repeat from start */
  REPEAT: 'repeat',
  /** Alternate direction each iteration */
  PINGPONG: 'pingpong',
};

/**
 * Creates an easing function for the given type.
 * @param {string|Array} functionType - Easing type or ['cubic', x1, y1, x2, y2]
 * @returns {function|null} Easing function or null for linear
 */
function easingFuncForType(functionType) {
  // Handle array format for custom cubic-bezier
  if (Array.isArray(functionType)) {
    const [type, ...args] = functionType;
    if (type === AnimatorFunctionType.CUBIC && args.length === 4) {
      return makeBezierEasing(...args);
    }
    // Fall through to handle type as string
    functionType = type;
  }

  switch (functionType) {
    case AnimatorFunctionType.LINEAR:
    default:
      return null; // linear is the default, no function needed

    case AnimatorFunctionType.EASE:
      return makeBezierEasing(0.25, 0.1, 0.25, 1);

    case AnimatorFunctionType.EASE_IN:
      return makeBezierEasing(0.42, 0, 1, 1);

    case AnimatorFunctionType.EASE_OUT:
      return makeBezierEasing(0, 0, 0.58, 1);

    case AnimatorFunctionType.EASE_IN_OUT:
      return makeBezierEasing(0.42, 0, 0.58, 1);

    case AnimatorFunctionType.HOLD:
      return function hold(x) {
        return x >= 1 ? 1 : 0;
      };
  }
}

/**
 * Linear interpolation with optional easing.
 * @param {number} t - Current time
 * @param {number} startT - Start time
 * @param {number} startV - Start value
 * @param {number} endT - End time
 * @param {number} endV - End value
 * @param {function} easingFn - Optional easing function
 * @param {string} loopType - Loop type (once, repeat, pingpong)
 * @returns {number} Interpolated value
 */
function lerp(t, startT, startV, endT, endV, easingFn, loopType) {
  if (t <= startT) {
    return startV;
  }

  const dur = endT - startT;
  let tx = t - startT;
  let phase = 0;

  if (t >= endT) {
    if (loopType === AnimatorLoopType.ONCE) {
      return endV;
    }
    phase = Math.floor(tx / dur);
    tx = tx - phase * dur;
    if (loopType === AnimatorLoopType.PINGPONG && phase % 2 === 1) {
      tx = dur - tx;
    }
  }

  let pos = tx / dur;
  if (easingFn) {
    pos = easingFn(pos);
  }

  const ipos = 1 - pos;
  return ipos * startV + pos * endV;
}

/**
 * Animator for a single layout property (x, y, w, or h).
 */
class LayoutPropertyAnimator {
  /**
   * @param {string} propName - Property name ('x', 'y', 'w', or 'h')
   * @param {Object} opts - Animation options
   * @param {number} opts.inT - Start time in seconds
   * @param {number} opts.duration - Duration in seconds
   * @param {string|Array} opts.function - Easing function type
   * @param {number} opts.startWith - Start value
   * @param {number} opts.endWith - End value
   * @param {boolean} [opts.repeat] - Whether to loop
   * @param {boolean} [opts.loopBackwards] - Use pingpong loop
   */
  constructor(propName, opts) {
    this.propName = propName;

    this.inT = opts.inT || 0;
    this.duration = opts.duration > 0 ? opts.duration : 0;

    const delay = Number.isFinite(opts.delay) ? opts.delay : 0;
    this.inT += delay;

    this.startWith = opts.startWith;
    this.endWith = opts.endWith;

    this.easingFn = easingFuncForType(opts.function);

    this.loopType = opts.repeat
      ? opts.loopBackwards
        ? AnimatorLoopType.PINGPONG
        : AnimatorLoopType.REPEAT
      : AnimatorLoopType.ONCE;

    // Set by Composition when animation is activated
    this.nodeUuid = null;
  }

  /**
   * Returns the interpolated value at time t.
   * @param {number} t - Current time in seconds
   * @returns {number} Interpolated value
   */
  at(t) {
    const inT = this.inT;
    const outT = this.inT + this.duration;

    if (!Number.isFinite(this.startWith) || !Number.isFinite(this.endWith)) {
      return this.endWith;
    }

    return lerp(
      t,
      inT,
      this.startWith,
      outT,
      this.endWith,
      this.easingFn,
      this.loopType
    );
  }
}

/**
 * Main animator factory class for VCS layout animations.
 *
 * Usage in layoutAnimationFactory:
 * ```
 * function layoutAnimationFactory(composition, animationId, constants) {
 *   const anim = composition.animator;
 *
 *   if (animationId === 'my-element') {
 *     return [{
 *       properties: ['x', 'y'],
 *       predicates: [anim.predicate('.', anim.property.CHANGED_FRAME_ONLY_NONZERO)],
 *       function: anim.function.EASE_OUT,
 *       duration: 0.3,
 *     }];
 *   }
 *   return [];
 * }
 * ```
 */
export class VcsAnimator {
  constructor() {
    // Expose constants for use in animation factory functions
    this.property = AnimationPredicateType;
    this.function = AnimatorFunctionType;
  }

  /**
   * Creates a predicate descriptor for animation triggering.
   * @param {string} queryPath - Query path ('.' for current node, etc.)
   * @param {string} propertyType - Predicate type from AnimationPredicateType
   * @returns {Object} Predicate descriptor
   */
  predicate(queryPath, propertyType) {
    return {
      queryPath,
      propertyType,
    };
  }

  /**
   * Creates a layout property animator.
   * @param {string} propName - Property name ('x', 'y', 'w', or 'h')
   * @param {Object} opts - Animation options
   * @returns {LayoutPropertyAnimator}
   */
  forLayoutProperty(propName, opts) {
    return new LayoutPropertyAnimator(propName, opts);
  }
}
