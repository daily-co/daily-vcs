# VCS Layout Animation System

This document describes the layout animation system for VCS compositions. Layout animations allow smooth transitions when element positions and sizes change.

## Overview

The animation system uses a **predicate-based** approach: you define conditions (predicates) that trigger animations when layout changes occur. When a predicate evaluates to true, an animation is created that interpolates the element's frame properties from their previous values to the new values.

Key features:
- Automatic animation of layout frame properties (x, y, w, h)
- CSS-compatible easing functions (ease, ease-in, ease-out, etc.)
- Child elements automatically follow parent animations
- Reusable animation definitions via `animationId` prop

## Quick Start

### 1. Add the `layoutAnimationFactory` export to your composition

```javascript
// In your composition file (e.g., my-composition.jsx)

export function layoutAnimationFactory(composition, animationId, constants) {
  const anim = composition.animator;

  if (animationId === 'my-container') {
    return [{
      properties: ['x', 'y', 'w', 'h'],
      predicates: [anim.predicate('.', anim.property.CHANGED_FRAME_ONLY_NONZERO)],
      function: anim.function.EASE_OUT,
      duration: 0.3,
    }];
  }

  return [];
}
```

### 2. Add the `animationId` prop to elements you want to animate

```jsx
export default function MyComposition() {
  return (
    <Box id="root">
      <Box
        id="my-container"
        animationId="my-container"
        layout={[myLayoutFunc, { /* params */ }]}
      >
        {/* Children will follow the parent's animation automatically */}
        <Text>Content</Text>
      </Box>
    </Box>
  );
}
```

That's it! When the layout of `my-container` changes (due to parameter changes, content changes, etc.), it will animate smoothly to its new position and size.

## Animation Factory Function

The `layoutAnimationFactory` function is called during layout for each element that has an `animationId` (or falls back to `id` if no `animationId` is set).

### Signature

```javascript
function layoutAnimationFactory(composition, animationId, constants) {
  // Returns: Array of AnimationDescriptor objects, or empty array
}
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `composition` | `Composition` | The VCS composition instance. Access `composition.animator` for animation helpers. |
| `animationId` | `string` | The animation identifier from the element's `animationId` prop (or `id` as fallback). |
| `constants` | `object` | Reserved for future use (currently empty object). |

### Return Value

Return an array of animation descriptors. Each descriptor defines when and how to animate. Return an empty array `[]` for elements that should not animate.

## Animation Descriptor

```typescript
interface AnimationDescriptor {
  // Properties to animate
  properties: ('x' | 'y' | 'w' | 'h')[];

  // Conditions that trigger this animation
  predicates: AnimationPredicate[];

  // Easing function (optional, default: 'ease')
  function?: 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'hold'
           | ['cubic', number, number, number, number];

  // Duration in seconds (optional, default: 0.3)
  duration?: number;

  // Delay before animation starts, in seconds (optional, default: 0)
  delay?: number;
}
```

### Properties

Specify which frame properties to animate:
- `'x'` - Horizontal position
- `'y'` - Vertical position
- `'w'` - Width
- `'h'` - Height

You can animate any combination:
```javascript
properties: ['x', 'y']        // Position only
properties: ['w', 'h']        // Size only
properties: ['x', 'y', 'w', 'h']  // All properties
```

### Easing Functions

| Function | Description | CSS Equivalent |
|----------|-------------|----------------|
| `'linear'` | Constant speed | `linear` |
| `'ease'` | Slow start/end, fast middle | `ease` |
| `'ease-in'` | Slow start, fast end | `ease-in` |
| `'ease-out'` | Fast start, slow end | `ease-out` |
| `'ease-in-out'` | Slow start and end | `ease-in-out` |
| `'hold'` | Stays at start until end, then jumps | Step function |
| `['cubic', x1, y1, x2, y2]` | Custom cubic bezier | `cubic-bezier(x1, y1, x2, y2)` |

Example with custom bezier:
```javascript
function: ['cubic', 0.68, -0.55, 0.265, 1.55]  // "Back" easing with overshoot
```

## Predicates

Predicates define the conditions that trigger an animation. Create them using:

```javascript
anim.predicate(queryPath, propertyType)
```

### Query Paths

| Path | Description |
|------|-------------|
| `'.'` | Current node (most common) |
| `'/'` | Root node |
| `'<'` | Immediate parent |
| `'*'` | All nodes |
| `'*/id'` | Node with given id anywhere in tree |

### Property Types

Access via `anim.property.*`:

| Type | Constant | Triggers When |
|------|----------|---------------|
| `TOGGLED_PRESENT` | `'present'` | Node appears or disappears |
| `TOGGLED_FRAME_NONZERO` | `'frameNonZero'` | Frame becomes zero or non-zero |
| `CHANGED_FRAME_ANY` | `'frameChangeAny'` | Any frame property changes |
| `CHANGED_FRAME_ONLY_NONZERO` | `'frameChangeNonZero'` | Frame changes while both old and new are non-zero |
| `CHANGED_FRAME_TO_ZERO` | `'frameChangeToZero'` | Frame goes from non-zero to zero (hiding) |

### Common Predicate Patterns

```javascript
const anim = composition.animator;

// Animate when element moves or resizes (most common)
anim.predicate('.', anim.property.CHANGED_FRAME_ONLY_NONZERO)

// Animate when element appears (fades in)
anim.predicate('.', anim.property.TOGGLED_FRAME_NONZERO)

// Animate when element is about to hide
anim.predicate('.', anim.property.CHANGED_FRAME_TO_ZERO)

// Animate when a specific other element changes
anim.predicate('*/sidebar', anim.property.CHANGED_FRAME_ONLY_NONZERO)
```

## Child Inheritance

When a parent element animates, its children automatically follow. This is because:

1. Animations are applied during the layout recursion
2. Children receive the animated parent frame as their starting frame
3. Children are positioned relative to the animated parent position

**You typically only need to define animations on container elements.** Child elements will follow automatically.

```jsx
<Box animationId="panel" layout={panelLayout}>
  {/* These children follow the panel's animation - no animationId needed */}
  <Image src="icon" />
  <Text>Label</Text>
</Box>
```

Only add animations to children if they have independent layout changes (e.g., the child's own size changes based on a parameter).

## Animation Reuse

Multiple elements can share the same `animationId` to reuse animation definitions:

```javascript
export function layoutAnimationFactory(composition, animationId, constants) {
  const anim = composition.animator;

  if (animationId === 'grid-item') {
    // This animation applies to ALL elements with animationId="grid-item"
    return [{
      properties: ['x', 'y', 'w', 'h'],
      predicates: [anim.predicate('.', anim.property.CHANGED_FRAME_ONLY_NONZERO)],
      function: anim.function.EASE_OUT,
      duration: 0.35,
    }];
  }

  return [];
}
```

```jsx
// All these items share the same animation behavior
<Box animationId="grid-item" layout={gridItemLayout(0)}><Video src={ids[0]} /></Box>
<Box animationId="grid-item" layout={gridItemLayout(1)}><Video src={ids[1]} /></Box>
<Box animationId="grid-item" layout={gridItemLayout(2)}><Video src={ids[2]} /></Box>
```

## Complete Example

```javascript
import * as React from 'react';
import { Box, Text } from '#vcs-react/components';
import { useParams } from '#vcs-react/hooks';

export const compositionInterface = {
  params: [
    { id: 'expanded', type: 'boolean', defaultValue: false },
  ],
};

// Animation factory
export function layoutAnimationFactory(composition, animationId, constants) {
  const anim = composition.animator;

  switch (animationId) {
    case 'sidebar':
      return [{
        properties: ['x', 'w'],
        predicates: [anim.predicate('.', anim.property.CHANGED_FRAME_ONLY_NONZERO)],
        function: anim.function.EASE_IN_OUT,
        duration: 0.4,
      }];

    case 'content':
      return [{
        properties: ['x', 'w'],
        predicates: [anim.predicate('.', anim.property.CHANGED_FRAME_ONLY_NONZERO)],
        function: anim.function.EASE_IN_OUT,
        duration: 0.4,
        delay: 0.1,  // Slight delay for staggered effect
      }];

    default:
      return [];
  }
}

// Layout functions
const layouts = {
  sidebar: (parentFrame, params, ctx) => {
    const { expanded } = params;
    const sidebarWidth = expanded ? 300 : 80;
    return {
      x: parentFrame.x,
      y: parentFrame.y,
      w: sidebarWidth,
      h: parentFrame.h,
    };
  },

  content: (parentFrame, params, ctx) => {
    const { expanded, sidebarWidth } = params;
    const sw = expanded ? 300 : 80;
    return {
      x: parentFrame.x + sw,
      y: parentFrame.y,
      w: parentFrame.w - sw,
      h: parentFrame.h,
    };
  },
};

// Component
export default function AnimatedLayoutExample() {
  const { expanded } = useParams();

  return (
    <Box id="root">
      <Box
        id="sidebar"
        animationId="sidebar"
        layout={[layouts.sidebar, { expanded }]}
      >
        <Text>Sidebar</Text>
      </Box>
      <Box
        id="content"
        animationId="content"
        layout={[layouts.content, { expanded }]}
      >
        <Text>Main Content</Text>
      </Box>
    </Box>
  );
}
```

## Troubleshooting

### Animation not triggering

1. **Check `animationId`**: Ensure the element has an `animationId` prop (or `id` as fallback) that matches what you check for in `layoutAnimationFactory`.

2. **Check predicate**: Make sure the predicate matches your use case. `CHANGED_FRAME_ONLY_NONZERO` is the most common choice for move/resize animations.

3. **Check return value**: Ensure `layoutAnimationFactory` returns a non-empty array for the animationId.

### Animation stuttering or retriggering

This can happen with content-based layouts (`useContentSize`) if the predicate keeps triggering. The animation system is designed to handle this correctly, but if you see issues:

1. Make sure you're using `CHANGED_FRAME_ONLY_NONZERO` (not `CHANGED_FRAME_ANY`) to avoid triggering when frames go to/from zero.

2. Check that your layout function produces stable values when parameters haven't changed.

### Children not following parent animation

Children automatically follow parent animations. If they're not:

1. Check that the parent's animation is working.
2. Make sure children don't have their own conflicting `animationId` with different timing.

## API Reference

### VcsAnimator

Available via `composition.animator`:

```javascript
// Create a predicate descriptor
animator.predicate(queryPath: string, propertyType: string): PredicateDescriptor

// Access predicate types
animator.property.TOGGLED_PRESENT
animator.property.TOGGLED_FRAME_NONZERO
animator.property.CHANGED_FRAME_ANY
animator.property.CHANGED_FRAME_ONLY_NONZERO
animator.property.CHANGED_FRAME_TO_ZERO

// Access easing function types
animator.function.LINEAR
animator.function.EASE
animator.function.EASE_IN
animator.function.EASE_OUT
animator.function.EASE_IN_OUT
animator.function.HOLD
animator.function.CUBIC
```

## Running Tests

### Unit Tests

The animation system includes unit tests for the core animation primitives:

```bash
node --test src/animation/predicates.test.js src/animation/animator.test.js
```

These unit tests cover predicate evaluation and easing/interpolation functions in isolation. They don't test the full integration with the layout system or React reconciler.

### Scenario Test

For end-to-end verification that animations work correctly in a real composition, there's a scenario test:

```bash
cd ../server-render/test && ./run_scenario.sh stretchbox-animation
```

This test renders the `stretchbox` example composition and captures frames before, during, and after an animation. It verifies that mid-animation frames contain interpolated values (not just the start or end state), proving the animation system is correctly integrated with the layout pass.
