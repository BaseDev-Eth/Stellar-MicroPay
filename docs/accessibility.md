# Accessibility & Reduced Motion Guide (#1468)

Stellar MicroPay is designed to be accessible to all users, including individuals with vestibular disorders, motion sensitivity, and those navigating via assistive technology.

Under **WCAG 2.3.3 (Animation from Interactions)**, non-essential animations triggered by user interaction must be suppressible unless the animation is essential to the functionality or the information being conveyed.

---

## 1. Global CSS Reduced-Motion Layer

A global CSS media query is defined in `frontend/styles/globals.css`:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

### Why `0.01ms` instead of `none`?
- Setting duration to `0.01ms` effectively disables visual motion and makes all transitions instantaneous.
- It ensures DOM events like `transitionend` and `animationend` still fire cleanly without hanging asynchronous promises or callback handlers in third-party libraries.
- `scroll-behavior: auto !important` prevents smooth-scrolling nausea while keeping scroll positioning intact.

---

## 2. JavaScript-Driven Animations (`usePrefersReducedMotion`)

CSS media queries cannot prevent JavaScript timers, `requestAnimationFrame` loops, or imperative scrolling from executing. For JS-driven animation, use the `usePrefersReducedMotion` hook:

```typescript
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";

function MyComponent() {
  const prefersReducedMotion = usePrefersReducedMotion();

  // 1. Immediately render final values for count-ups or data tickers
  // 2. Adjust scrolling behaviors
  // 3. Skip transition delay timers
}
```

### Examples in Codebase

#### A. Number Count-Ups (`lib/useCountUp.ts`)
When `prefersReducedMotion` is true, the hook immediately sets `count` to the target number and terminates the `requestAnimationFrame` loop before it starts:

```typescript
const prefersReducedMotion = usePrefersReducedMotion();
const [count, setCount] = useState(() => (prefersReducedMotion ? target : 0));

useEffect(() => {
  if (prefersReducedMotion) {
    setCount(target);
    return;
  }
  // animate loop...
}, [prefersReducedMotion, target]);
```

#### B. Smooth Scrolling (`components/OnboardingTour.tsx`)
Imperative scrolling should switch from `"smooth"` to `"auto"`:

```typescript
targetElement.scrollIntoView({
  behavior: prefersReducedMotion ? "auto" : "smooth",
  block: "center",
});
```

#### C. Notification Toasts (`components/Toast.tsx`)
Toasts should dismiss immediately without waiting for CSS fade-out timeouts:

```typescript
const timer = setTimeout(() => {
  setVisible(false);
  if (onClose) {
    if (prefersReducedMotion) {
      onClose();
    } else {
      setTimeout(onClose, 300); // Wait for fade out
    }
  }
}, duration);
```

---

## 3. Authoring New Animations (Checklist for Contributors)

When adding new animations or transitions:
1. **Prefer CSS transitions with Tailwind**: Use Tailwind transition classes. The global `globals.css` layer will neutralize them automatically for users with reduced motion enabled.
2. **Use Tailwind variants**:
   - `motion-safe:...` for non-essential decorative animations (e.g. `motion-safe:animate-fade-in`).
   - `motion-reduce:...` to provide alternative static layouts or borders if an animation was providing affordance.
3. **JS animations**: If animating SVG paths, canvas, or numbers with `requestAnimationFrame` or `setInterval`, check `usePrefersReducedMotion()` and jump immediately to the final state.
4. **No layout breakage**: Ensure containers have fixed/min heights or stable flex layouts so disabling animations never causes layout shifts or clipping.
