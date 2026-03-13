/**
 * Unit tests for animation predicates.
 *
 * Run with: node --test src/animation/predicates.test.js
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';

import {
  AnimationPredicateType,
  isFrameNonZero,
  areFramesEqual,
  evaluatePredicate,
} from './predicates.js';

describe('isFrameNonZero', () => {
  test('returns false for null frame', () => {
    assert.strictEqual(isFrameNonZero(null), false);
  });

  test('returns false for undefined frame', () => {
    assert.strictEqual(isFrameNonZero(undefined), false);
  });

  test('returns false for zero width', () => {
    assert.strictEqual(isFrameNonZero({ x: 0, y: 0, w: 0, h: 100 }), false);
  });

  test('returns false for zero height', () => {
    assert.strictEqual(isFrameNonZero({ x: 0, y: 0, w: 100, h: 0 }), false);
  });

  test('returns true for non-zero dimensions', () => {
    assert.strictEqual(isFrameNonZero({ x: 0, y: 0, w: 100, h: 100 }), true);
  });

  test('returns true even with negative position', () => {
    assert.strictEqual(isFrameNonZero({ x: -50, y: -50, w: 100, h: 100 }), true);
  });
});

describe('areFramesEqual', () => {
  test('returns true for two null frames', () => {
    assert.strictEqual(areFramesEqual(null, null), true);
  });

  test('returns false if first frame is null', () => {
    assert.strictEqual(areFramesEqual(null, { x: 0, y: 0, w: 100, h: 100 }), false);
  });

  test('returns false if second frame is null', () => {
    assert.strictEqual(areFramesEqual({ x: 0, y: 0, w: 100, h: 100 }, null), false);
  });

  test('returns true for identical frames', () => {
    const frame1 = { x: 10, y: 20, w: 100, h: 200 };
    const frame2 = { x: 10, y: 20, w: 100, h: 200 };
    assert.strictEqual(areFramesEqual(frame1, frame2), true);
  });

  test('returns false when x differs', () => {
    const frame1 = { x: 10, y: 20, w: 100, h: 200 };
    const frame2 = { x: 15, y: 20, w: 100, h: 200 };
    assert.strictEqual(areFramesEqual(frame1, frame2), false);
  });

  test('returns false when y differs', () => {
    const frame1 = { x: 10, y: 20, w: 100, h: 200 };
    const frame2 = { x: 10, y: 25, w: 100, h: 200 };
    assert.strictEqual(areFramesEqual(frame1, frame2), false);
  });

  test('returns false when w differs', () => {
    const frame1 = { x: 10, y: 20, w: 100, h: 200 };
    const frame2 = { x: 10, y: 20, w: 150, h: 200 };
    assert.strictEqual(areFramesEqual(frame1, frame2), false);
  });

  test('returns false when h differs', () => {
    const frame1 = { x: 10, y: 20, w: 100, h: 200 };
    const frame2 = { x: 10, y: 20, w: 100, h: 250 };
    assert.strictEqual(areFramesEqual(frame1, frame2), false);
  });
});

describe('evaluatePredicate', () => {
  describe('TOGGLED_PRESENT', () => {
    test('returns true when node appears', () => {
      const result = evaluatePredicate(
        AnimationPredicateType.TOGGLED_PRESENT,
        { x: 0, y: 0, w: 100, h: 100 }, // currentFrame
        null, // prevFrame
        true, // isPresent
        false // wasPresent
      );
      assert.strictEqual(result, true);
    });

    test('returns true when node disappears', () => {
      const result = evaluatePredicate(
        AnimationPredicateType.TOGGLED_PRESENT,
        null, // currentFrame
        { x: 0, y: 0, w: 100, h: 100 }, // prevFrame
        false, // isPresent
        true // wasPresent
      );
      assert.strictEqual(result, true);
    });

    test('returns false when node stays present', () => {
      const result = evaluatePredicate(
        AnimationPredicateType.TOGGLED_PRESENT,
        { x: 0, y: 0, w: 100, h: 100 },
        { x: 0, y: 0, w: 100, h: 100 },
        true,
        true
      );
      assert.strictEqual(result, false);
    });
  });

  describe('TOGGLED_FRAME_NONZERO', () => {
    test('returns true when frame becomes non-zero', () => {
      const result = evaluatePredicate(
        AnimationPredicateType.TOGGLED_FRAME_NONZERO,
        { x: 0, y: 0, w: 100, h: 100 }, // currentFrame (non-zero)
        { x: 0, y: 0, w: 0, h: 0 }, // prevFrame (zero)
        true,
        true
      );
      assert.strictEqual(result, true);
    });

    test('returns true when frame becomes zero', () => {
      const result = evaluatePredicate(
        AnimationPredicateType.TOGGLED_FRAME_NONZERO,
        { x: 0, y: 0, w: 0, h: 0 }, // currentFrame (zero)
        { x: 0, y: 0, w: 100, h: 100 }, // prevFrame (non-zero)
        true,
        true
      );
      assert.strictEqual(result, true);
    });

    test('returns false when frame stays non-zero', () => {
      const result = evaluatePredicate(
        AnimationPredicateType.TOGGLED_FRAME_NONZERO,
        { x: 0, y: 0, w: 100, h: 100 },
        { x: 10, y: 10, w: 200, h: 200 },
        true,
        true
      );
      assert.strictEqual(result, false);
    });
  });

  describe('CHANGED_FRAME_ANY', () => {
    test('returns true when frame changes', () => {
      const result = evaluatePredicate(
        AnimationPredicateType.CHANGED_FRAME_ANY,
        { x: 10, y: 0, w: 100, h: 100 },
        { x: 0, y: 0, w: 100, h: 100 },
        true,
        true
      );
      assert.strictEqual(result, true);
    });

    test('returns false when frame is identical', () => {
      const result = evaluatePredicate(
        AnimationPredicateType.CHANGED_FRAME_ANY,
        { x: 0, y: 0, w: 100, h: 100 },
        { x: 0, y: 0, w: 100, h: 100 },
        true,
        true
      );
      assert.strictEqual(result, false);
    });

    test('returns true even when changing to zero', () => {
      const result = evaluatePredicate(
        AnimationPredicateType.CHANGED_FRAME_ANY,
        { x: 0, y: 0, w: 0, h: 0 },
        { x: 0, y: 0, w: 100, h: 100 },
        true,
        true
      );
      assert.strictEqual(result, true);
    });
  });

  describe('CHANGED_FRAME_ONLY_NONZERO', () => {
    test('returns true when both frames are non-zero and different', () => {
      const result = evaluatePredicate(
        AnimationPredicateType.CHANGED_FRAME_ONLY_NONZERO,
        { x: 10, y: 20, w: 100, h: 100 },
        { x: 0, y: 0, w: 100, h: 100 },
        true,
        true
      );
      assert.strictEqual(result, true);
    });

    test('returns false when prev frame is zero', () => {
      const result = evaluatePredicate(
        AnimationPredicateType.CHANGED_FRAME_ONLY_NONZERO,
        { x: 0, y: 0, w: 100, h: 100 },
        { x: 0, y: 0, w: 0, h: 0 },
        true,
        true
      );
      assert.strictEqual(result, false);
    });

    test('returns false when current frame is zero', () => {
      const result = evaluatePredicate(
        AnimationPredicateType.CHANGED_FRAME_ONLY_NONZERO,
        { x: 0, y: 0, w: 0, h: 0 },
        { x: 0, y: 0, w: 100, h: 100 },
        true,
        true
      );
      assert.strictEqual(result, false);
    });

    test('returns false when frames are identical', () => {
      const result = evaluatePredicate(
        AnimationPredicateType.CHANGED_FRAME_ONLY_NONZERO,
        { x: 0, y: 0, w: 100, h: 100 },
        { x: 0, y: 0, w: 100, h: 100 },
        true,
        true
      );
      assert.strictEqual(result, false);
    });
  });

  describe('CHANGED_FRAME_TO_ZERO', () => {
    test('returns true when frame goes from non-zero to zero', () => {
      const result = evaluatePredicate(
        AnimationPredicateType.CHANGED_FRAME_TO_ZERO,
        { x: 0, y: 0, w: 0, h: 0 },
        { x: 0, y: 0, w: 100, h: 100 },
        true,
        true
      );
      assert.strictEqual(result, true);
    });

    test('returns false when frame goes from zero to non-zero', () => {
      const result = evaluatePredicate(
        AnimationPredicateType.CHANGED_FRAME_TO_ZERO,
        { x: 0, y: 0, w: 100, h: 100 },
        { x: 0, y: 0, w: 0, h: 0 },
        true,
        true
      );
      assert.strictEqual(result, false);
    });

    test('returns false when both frames are non-zero', () => {
      const result = evaluatePredicate(
        AnimationPredicateType.CHANGED_FRAME_TO_ZERO,
        { x: 10, y: 10, w: 100, h: 100 },
        { x: 0, y: 0, w: 100, h: 100 },
        true,
        true
      );
      assert.strictEqual(result, false);
    });
  });

  describe('unknown predicate type', () => {
    test('returns false for unknown predicate', () => {
      const result = evaluatePredicate(
        'unknown_predicate',
        { x: 0, y: 0, w: 100, h: 100 },
        { x: 0, y: 0, w: 50, h: 50 },
        true,
        true
      );
      assert.strictEqual(result, false);
    });
  });
});
