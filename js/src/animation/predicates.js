/**
 * Animation predicate types for VCS layout animations.
 *
 * Predicates define conditions that trigger animations. They are evaluated
 * by comparing the current layout state with the previous frame's state.
 */

/**
 * Predicate types that can trigger animations.
 */
export const AnimationPredicateType = {
  // Node presence predicates
  /** Node appeared or disappeared from the layout tree */
  TOGGLED_PRESENT: 'present',

  // Frame change predicates
  /** Frame became non-zero (appeared) or zero (hidden) */
  TOGGLED_FRAME_NONZERO: 'frame-non-zero',

  /** Any frame property (x, y, w, h) changed */
  CHANGED_FRAME_ANY: 'frame-change-any',

  /** Frame changed while both old and new frames are non-zero */
  CHANGED_FRAME_ONLY_NONZERO: 'frame-change-non-zero',

  /** Frame went from non-zero to zero (hiding) */
  CHANGED_FRAME_TO_ZERO: 'frame-change-to-zero',
};

/**
 * Query path syntax for predicates:
 *
 * '.'     - current node
 * '/'     - root node
 * '<'     - immediate parent
 * '*'     - all nodes
 * '*​/id'  - node with given id anywhere in tree
 *
 * @typedef {string} QueryPath
 */

/**
 * Checks if a frame has non-zero dimensions.
 * @param {Object} frame - Frame object with x, y, w, h
 * @returns {boolean}
 */
export function isFrameNonZero(frame) {
  if (!frame) return false;
  return frame.w > 0 && frame.h > 0;
}

/**
 * Checks if two frames are equal.
 * @param {Object} a - First frame
 * @param {Object} b - Second frame
 * @returns {boolean}
 */
export function areFramesEqual(a, b) {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;
}

/**
 * Evaluates a single predicate against current and previous node states.
 *
 * @param {string} propertyType - One of AnimationPredicateType values
 * @param {Object} currentFrame - Current animatable frame {x, y, w, h}
 * @param {Object} prevFrame - Previous animatable frame {x, y, w, h}
 * @param {boolean} isPresent - Whether node exists in current tree
 * @param {boolean} wasPresent - Whether node existed in previous tree
 * @returns {boolean} True if predicate is triggered
 */
export function evaluatePredicate(
  propertyType,
  currentFrame,
  prevFrame,
  isPresent,
  wasPresent
) {
  switch (propertyType) {
    case AnimationPredicateType.TOGGLED_PRESENT:
      return isPresent !== wasPresent;

    case AnimationPredicateType.TOGGLED_FRAME_NONZERO: {
      const wasNonZero = isFrameNonZero(prevFrame);
      const isNonZero = isFrameNonZero(currentFrame);
      return wasNonZero !== isNonZero;
    }

    case AnimationPredicateType.CHANGED_FRAME_ANY:
      return !areFramesEqual(currentFrame, prevFrame);

    case AnimationPredicateType.CHANGED_FRAME_ONLY_NONZERO: {
      if (!isFrameNonZero(prevFrame) || !isFrameNonZero(currentFrame)) {
        return false;
      }
      return !areFramesEqual(currentFrame, prevFrame);
    }

    case AnimationPredicateType.CHANGED_FRAME_TO_ZERO: {
      const wasNonZero = isFrameNonZero(prevFrame);
      const isNonZero = isFrameNonZero(currentFrame);
      return wasNonZero && !isNonZero;
    }

    default:
      return false;
  }
}
