/**
 * Unit tests for animator and easing functions.
 *
 * Run with: node --test src/animation/animator.test.js
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';

import makeBezierEasing from './bezier-easing.js';
import {
  VcsAnimator,
  AnimatorFunctionType,
  AnimatorLoopType,
} from './animator.js';

describe('makeBezierEasing', () => {
  test('linear bezier returns input value', () => {
    const linear = makeBezierEasing(0, 0, 1, 1);
    assert.ok(Math.abs(linear(0) - 0) < 0.001);
    assert.ok(Math.abs(linear(0.5) - 0.5) < 0.001);
    assert.ok(Math.abs(linear(1) - 1) < 0.001);
  });

  test('ease-out starts fast and slows down', () => {
    // ease-out: cubic-bezier(0, 0, 0.58, 1)
    const easeOut = makeBezierEasing(0, 0, 0.58, 1);

    // At t=0.5, ease-out should be ahead of linear (> 0.5)
    assert.ok(easeOut(0.5) > 0.5, 'ease-out at 0.5 should be > 0.5');

    // Endpoints should be exact
    assert.ok(Math.abs(easeOut(0) - 0) < 0.001);
    assert.ok(Math.abs(easeOut(1) - 1) < 0.001);
  });

  test('ease-in starts slow and speeds up', () => {
    // ease-in: cubic-bezier(0.42, 0, 1, 1)
    const easeIn = makeBezierEasing(0.42, 0, 1, 1);

    // At t=0.5, ease-in should be behind linear (< 0.5)
    assert.ok(easeIn(0.5) < 0.5, 'ease-in at 0.5 should be < 0.5');

    // Endpoints should be exact
    assert.ok(Math.abs(easeIn(0) - 0) < 0.001);
    assert.ok(Math.abs(easeIn(1) - 1) < 0.001);
  });
});

describe('VcsAnimator', () => {
  test('exposes property types', () => {
    const animator = new VcsAnimator();
    assert.ok(animator.property.TOGGLED_PRESENT);
    assert.ok(animator.property.CHANGED_FRAME_ONLY_NONZERO);
  });

  test('exposes function types', () => {
    const animator = new VcsAnimator();
    assert.strictEqual(animator.function.LINEAR, 'linear');
    assert.strictEqual(animator.function.EASE_OUT, 'ease-out');
  });

  test('predicate() creates predicate descriptor', () => {
    const animator = new VcsAnimator();
    const pred = animator.predicate('.', animator.property.CHANGED_FRAME_ONLY_NONZERO);

    assert.strictEqual(pred.queryPath, '.');
    assert.strictEqual(pred.propertyType, 'frameChangeNonZero');
  });

  test('forLayoutProperty() creates animator', () => {
    const animator = new VcsAnimator();
    const propAnim = animator.forLayoutProperty('x', {
      inT: 0,
      duration: 1,
      function: AnimatorFunctionType.LINEAR,
      startWith: 0,
      endWith: 100,
    });

    assert.strictEqual(propAnim.propName, 'x');
    assert.strictEqual(propAnim.duration, 1);
    assert.strictEqual(propAnim.startWith, 0);
    assert.strictEqual(propAnim.endWith, 100);
  });
});

describe('LayoutPropertyAnimator', () => {
  const animator = new VcsAnimator();

  describe('linear interpolation', () => {
    test('returns start value at t=0', () => {
      const propAnim = animator.forLayoutProperty('x', {
        inT: 0,
        duration: 1,
        function: AnimatorFunctionType.LINEAR,
        startWith: 0,
        endWith: 100,
      });

      assert.strictEqual(propAnim.at(0), 0);
    });

    test('returns end value at t=duration', () => {
      const propAnim = animator.forLayoutProperty('x', {
        inT: 0,
        duration: 1,
        function: AnimatorFunctionType.LINEAR,
        startWith: 0,
        endWith: 100,
      });

      assert.strictEqual(propAnim.at(1), 100);
    });

    test('returns midpoint at t=0.5*duration', () => {
      const propAnim = animator.forLayoutProperty('x', {
        inT: 0,
        duration: 1,
        function: AnimatorFunctionType.LINEAR,
        startWith: 0,
        endWith: 100,
      });

      assert.strictEqual(propAnim.at(0.5), 50);
    });

    test('handles non-zero start time', () => {
      const propAnim = animator.forLayoutProperty('x', {
        inT: 5,
        duration: 1,
        function: AnimatorFunctionType.LINEAR,
        startWith: 0,
        endWith: 100,
      });

      // Before animation starts
      assert.strictEqual(propAnim.at(4), 0);
      // At start
      assert.strictEqual(propAnim.at(5), 0);
      // Midpoint
      assert.strictEqual(propAnim.at(5.5), 50);
      // At end
      assert.strictEqual(propAnim.at(6), 100);
    });

    test('handles delay', () => {
      const propAnim = animator.forLayoutProperty('x', {
        inT: 0,
        duration: 1,
        delay: 0.5,
        function: AnimatorFunctionType.LINEAR,
        startWith: 0,
        endWith: 100,
      });

      // Before delay
      assert.strictEqual(propAnim.at(0), 0);
      assert.strictEqual(propAnim.at(0.25), 0);
      // At delay end (animation start)
      assert.strictEqual(propAnim.at(0.5), 0);
      // Midpoint of animation
      assert.strictEqual(propAnim.at(1), 50);
      // End of animation
      assert.strictEqual(propAnim.at(1.5), 100);
    });
  });

  describe('eased interpolation', () => {
    test('ease-out is faster at start', () => {
      const propAnim = animator.forLayoutProperty('x', {
        inT: 0,
        duration: 1,
        function: AnimatorFunctionType.EASE_OUT,
        startWith: 0,
        endWith: 100,
      });

      // At t=0.5, ease-out should be ahead of linear midpoint (50)
      assert.ok(propAnim.at(0.5) > 50, `ease-out at 0.5 should be > 50, got ${propAnim.at(0.5)}`);
    });

    test('ease-in is slower at start', () => {
      const propAnim = animator.forLayoutProperty('x', {
        inT: 0,
        duration: 1,
        function: AnimatorFunctionType.EASE_IN,
        startWith: 0,
        endWith: 100,
      });

      // At t=0.5, ease-in should be behind linear midpoint (50)
      assert.ok(propAnim.at(0.5) < 50, `ease-in at 0.5 should be < 50, got ${propAnim.at(0.5)}`);
    });

    test('hold stays at start until end', () => {
      const propAnim = animator.forLayoutProperty('x', {
        inT: 0,
        duration: 1,
        function: AnimatorFunctionType.HOLD,
        startWith: 0,
        endWith: 100,
      });

      assert.strictEqual(propAnim.at(0), 0);
      assert.strictEqual(propAnim.at(0.5), 0);
      assert.strictEqual(propAnim.at(0.99), 0);
      assert.strictEqual(propAnim.at(1), 100);
    });

    test('custom cubic bezier', () => {
      const propAnim = animator.forLayoutProperty('x', {
        inT: 0,
        duration: 1,
        function: [AnimatorFunctionType.CUBIC, 0.25, 0.1, 0.25, 1],
        startWith: 0,
        endWith: 100,
      });

      // Should work without errors and produce reasonable values
      assert.ok(propAnim.at(0) >= 0);
      assert.ok(propAnim.at(0.5) > 0 && propAnim.at(0.5) < 100);
      assert.ok(propAnim.at(1) <= 100);
    });
  });

  describe('looping', () => {
    test('once mode stops at end value', () => {
      const propAnim = animator.forLayoutProperty('x', {
        inT: 0,
        duration: 1,
        function: AnimatorFunctionType.LINEAR,
        startWith: 0,
        endWith: 100,
      });

      // After duration, should stay at end value
      assert.strictEqual(propAnim.at(1.5), 100);
      assert.strictEqual(propAnim.at(2), 100);
    });

    test('repeat mode loops from start', () => {
      const propAnim = animator.forLayoutProperty('x', {
        inT: 0,
        duration: 1,
        function: AnimatorFunctionType.LINEAR,
        startWith: 0,
        endWith: 100,
        repeat: true,
      });

      // First cycle
      assert.strictEqual(propAnim.at(0.5), 50);
      // Second cycle (t=1.5 is like t=0.5 in the cycle)
      assert.strictEqual(propAnim.at(1.5), 50);
    });

    test('pingpong mode alternates direction', () => {
      const propAnim = animator.forLayoutProperty('x', {
        inT: 0,
        duration: 1,
        function: AnimatorFunctionType.LINEAR,
        startWith: 0,
        endWith: 100,
        repeat: true,
        loopBackwards: true,
      });

      // First cycle forward
      assert.strictEqual(propAnim.at(0.5), 50);
      // Second cycle backward (t=1.5 should be going back, at 50)
      assert.strictEqual(propAnim.at(1.5), 50);
      // But t=1.25 should be at 75 (going backward from 100)
      assert.strictEqual(propAnim.at(1.25), 75);
    });
  });

  describe('edge cases', () => {
    test('handles zero duration', () => {
      const propAnim = animator.forLayoutProperty('x', {
        inT: 0,
        duration: 0,
        function: AnimatorFunctionType.LINEAR,
        startWith: 0,
        endWith: 100,
      });

      // At t=0, still at start (t <= startT check happens first)
      assert.strictEqual(propAnim.at(0), 0);
      // Any time after should be at end
      assert.strictEqual(propAnim.at(0.001), 100);
    });

    test('handles non-finite values gracefully', () => {
      const propAnim = animator.forLayoutProperty('x', {
        inT: 0,
        duration: 1,
        function: AnimatorFunctionType.LINEAR,
        startWith: NaN,
        endWith: 100,
      });

      // Should return endWith when startWith is NaN
      assert.strictEqual(propAnim.at(0.5), 100);
    });

    test('handles negative values', () => {
      const propAnim = animator.forLayoutProperty('x', {
        inT: 0,
        duration: 1,
        function: AnimatorFunctionType.LINEAR,
        startWith: -100,
        endWith: 100,
      });

      assert.strictEqual(propAnim.at(0), -100);
      assert.strictEqual(propAnim.at(0.5), 0);
      assert.strictEqual(propAnim.at(1), 100);
    });

    test('handles reverse animation (end < start)', () => {
      const propAnim = animator.forLayoutProperty('x', {
        inT: 0,
        duration: 1,
        function: AnimatorFunctionType.LINEAR,
        startWith: 100,
        endWith: 0,
      });

      assert.strictEqual(propAnim.at(0), 100);
      assert.strictEqual(propAnim.at(0.5), 50);
      assert.strictEqual(propAnim.at(1), 0);
    });
  });
});
