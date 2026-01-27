# VCS Animation System

VCS provides two types of animations:

1. **Layout animations** - Automatic animations for frame properties (x, y, w, h) and opacity, triggered by layout changes
2. **Style animations** - Manual time-based animations for style properties (opacity, fillColor, etc.)

---

## Layout Animations

Layout animations automatically interpolate frame properties when elements move or resize. They can also animate opacity when elements appear or disappear. You declare animations statically, and the layout engine applies them automatically.

### Quick Start

**1. Export a `layoutAnimations` array from your composition:**

```javascript
export const layoutAnimations = [
  {
    animationId: 'grid-item',
    properties: ['x', 'y', 'w', 'h'],
    predicate: 'frame-change-non-zero',
    function: 'ease-out',
    duration: 0.3,
    opacity: {
      appear: { duration: 0.3 },
      disappear: { duration: 0.3 },
    },
  },
];
```

**2. Add the `animationId` prop to elements:**

```jsx
<Box animationId="grid-item" layout={gridItemLayout}>
  <Video src={videoId} />
</Box>
```

When the layout changes, the element animates smoothly to its new position and size. When it appears, it fades in; when removed, it fades out before being deleted.

### Animation Descriptor

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `animationId` | `string` | required | Links to elements with matching `animationId` prop |
| `properties` | `string[]` | `[]` | Frame properties to animate: `'x'`, `'y'`, `'w'`, `'h'` |
| `predicate` | `string` | `'frame-change-non-zero'` | When to trigger frame animations (see below) |
| `function` | `string\|Array` | `'ease'` | Easing function |
| `duration` | `number` | `0.3` | Duration in seconds |
| `delay` | `number` | `0` | Delay before animation starts |
| `opacity` | `object` | - | Opacity transitions for appear/disappear (see below) |

### Opacity Transitions

The `opacity` property enables automatic fade-in and fade-out when elements appear or disappear:

```javascript
opacity: {
  appear: { duration: 0.3 },      // fade in when element appears
  disappear: { duration: 0.3 },   // fade out before element is removed
}
```

Each transition can specify:

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `from` | `number` | `0` (appear) / `1` (disappear) | Starting opacity |
| `to` | `number` | `1` (appear) / `0` (disappear) | Ending opacity |
| `duration` | `number` | `0.3` | Duration in seconds |
| `function` | `string` | parent's function or `'ease-out'` | Easing function |

When an element with a `disappear` animation is removed from the React tree, it stays visible while fading out, then is actually deleted.

### Predicates

| Predicate | Triggers When |
|-----------|---------------|
| `'frame-change-non-zero'` | Frame changes while both old and new are non-zero (most common) |
| `'frame-change-any'` | Any frame property changes |
| `'frame-non-zero'` | Frame becomes non-zero or zero |
| `'frame-change-to-zero'` | Frame goes from non-zero to zero |
| `'present'` | Node appears or disappears |

### Easing Functions

| Function | Description |
|----------|-------------|
| `'linear'` | Constant speed |
| `'ease'` | Slow start/end, fast middle |
| `'ease-in'` | Slow start |
| `'ease-out'` | Slow end |
| `'ease-in-out'` | Slow start and end |
| `'hold'` | Stays at start, then jumps to end |
| `['cubic', x1, y1, x2, y2]` | Custom cubic bezier |

### Child Inheritance

Children automatically follow parent animations. You typically only need `animationId` on container elements:

```jsx
<Box animationId="panel" layout={panelLayout}>
  {/* These children follow automatically */}
  <Image src="icon" />
  <Text>Label</Text>
</Box>
```

### Baseline Composition Example

The `daily-baseline` composition uses layout animations for video grid repositioning with fade transitions:

```javascript
// In daily-baseline/index.jsx
export const layoutAnimations = [
  {
    animationId: 'grid-item',
    properties: ['x', 'y', 'w', 'h'],
    predicate: 'frame-change-non-zero',
    function: 'ease-out',
    duration: 0.3,
    opacity: {
      appear: { duration: 0.3 },
      disappear: { duration: 0.3 },
    },
  },
  {
    animationId: 'chiclet',
    properties: ['x', 'y', 'w', 'h'],
    predicate: 'frame-change-non-zero',
    function: 'ease-out',
    duration: 0.3,
    opacity: {
      appear: { duration: 0.3 },
      disappear: { duration: 0.3 },
    },
  },
];
```

The `VideoGrid` and `VideoDominant` components conditionally enable animations via the `enableLayoutAnims` prop:

```jsx
<Box
  animationId={enableLayoutAnims ? 'grid-item' : undefined}
  layout={itemLayout}
>
  <Video src={videoId} />
</Box>
```

---

## Style Animations (Manual)

For animations that aren't tied to layout changes (e.g., continuous color pulses, custom timing), use the style animator API.

### Style Animator API

Use `animator.forStyle()` to create manual style animations:

```javascript
import { useVideoTime } from '#vcs-react/hooks';

function MyComponent({ animator }) {
  const t = useVideoTime();

  const fadeIn = animator.forStyle('opacity', {
    duration: 0.5,
    startWith: 0,
    endWith: 1,
    function: animator.function.EASE_OUT,
  });

  return <Box style={fadeIn.at(t)}>Content</Box>;
}
```

### Style Animator Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `inT` | `number` | `0` | Start time in seconds |
| `duration` | `number` | `0` | Duration in seconds |
| `delay` | `number` | `0` | Delay before start |
| `startWith` | `number\|Array` | - | Start value (scalar or RGBA) |
| `endWith` | `number\|Array` | - | End value |
| `function` | `string\|Array` | `'linear'` | Easing function |
| `repeat` | `boolean` | `false` | Loop the animation |
| `loopBackwards` | `boolean` | `false` | Pingpong loop |

### Color Animation

```javascript
const colorPulse = animator.forStyle('fillColor', {
  duration: 1.0,
  startWith: [255, 0, 0, 1],   // Red
  endWith: [0, 0, 255, 1],     // Blue
  repeat: true,
  loopBackwards: true,
});
```

### Looping

```javascript
// Repeat from start
const blink = animator.forStyle('opacity', {
  duration: 0.5,
  startWith: 1,
  endWith: 0,
  repeat: true,  // 1→0, 1→0, 1→0...
});

// Pingpong
const pulse = animator.forStyle('opacity', {
  duration: 0.5,
  startWith: 0.5,
  endWith: 1,
  repeat: true,
  loopBackwards: true,  // 0.5→1→0.5→1...
});
```

---

## Running Tests

### Unit Tests

```bash
node --test src/animation/predicates.test.js src/animation/animator.test.js
```

### Scenario Test

```bash
cd ../server-render/test && ./run_scenario.sh stretchbox-animation
```
