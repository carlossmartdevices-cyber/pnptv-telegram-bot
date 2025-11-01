# PNPTV! Animated Logo

A sophisticated, animated SVG logo for PNPTV with smooth transitions and effects. The logo features the text "PNPTV!" with advanced animations including:

- **Sequential letter drawing** with stroke animations
- **Animated stripes** on the "T" letter
- **Gradient effects** on the "V" letter  
- **Pulsing exclamation mark** with bounce effect
- **Hover interactions** with glow effects
- **Accessibility support** (respects `prefers-reduced-motion`)

## 🎯 Features

- **Multiple sizes**: Small (120px), Medium (200px), Large (300px)
- **Color variants**: Light (white), Dark (gray), Brand (purple)
- **Responsive design** with mobile breakpoints
- **Framework agnostic** - works with React, vanilla HTML, or any web framework
- **Performance optimized** with CSS animations
- **Accessibility compliant** with reduced motion support

## 🚀 Quick Start

### For React Applications

```tsx
import AnimatedLogo from './components/AnimatedLogo';

function MyComponent() {
  return (
    <div>
      <AnimatedLogo 
        size="large" 
        variant="light" 
        animate={true}
      />
    </div>
  );
}
```

### For HTML Applications

```html
<!-- Include the CSS -->
<link rel="stylesheet" href="assets/css/pnptv-logo.css">

<!-- Use the logo -->
<div class="pnptv-logo pnptv-logo--medium pnptv-logo--light pnptv-logo--animated">
  <!-- SVG content goes here -->
</div>
```

## 📁 File Structure

```
public/
├── assets/css/pnptv-logo.css         # Standalone CSS for HTML apps
├── pnptv-logo.html                   # Demo page with examples
web/src/components/
├── AnimatedLogo.tsx                  # React component
├── AnimatedLogo.css                  # Component-specific CSS
daimo-payment-app/src/components/
├── AnimatedLogo.tsx                  # Next.js compatible version
```

## 🎨 Usage Examples

### React Component Props

```tsx
interface AnimatedLogoProps {
  className?: string;           // Additional CSS classes
  size?: 'small' | 'medium' | 'large';  // Logo size
  variant?: 'light' | 'dark' | 'brand'; // Color scheme
  animate?: boolean;            // Enable/disable animations
}
```

### HTML CSS Classes

```html
<!-- Size variants -->
<div class="pnptv-logo pnptv-logo--small">...</div>
<div class="pnptv-logo pnptv-logo--medium">...</div>
<div class="pnptv-logo pnptv-logo--large">...</div>

<!-- Color variants -->
<div class="pnptv-logo pnptv-logo--light">...</div>
<div class="pnptv-logo pnptv-logo--dark">...</div>
<div class="pnptv-logo pnptv-logo--brand">...</div>

<!-- Animation -->
<div class="pnptv-logo pnptv-logo--animated">...</div>

<!-- Loading state -->
<div class="pnptv-logo pnptv-logo--loading">...</div>
```

## 🎭 Animation Sequence

1. **0.2s-1.0s**: Letters fade in sequentially (P-N-P-T-V)
2. **0.3s-1.1s**: Letter paths draw with stroke animation
3. **1.2s-1.55s**: T-letter stripes expand horizontally
4. **1.5s**: Exclamation mark pops in with bounce
5. **2s+**: Dot pulses continuously
6. **3s+**: Gradient colors shift subtly

## 🎯 Integration Guide

### 1. Main Web App (`/web/src/App.tsx`)
```tsx
import AnimatedLogo from './components/AnimatedLogo';

// In your header
<div className="flex justify-center mb-4">
  <AnimatedLogo size="large" variant="light" />
</div>
```

### 2. Payment Pages (`/public/payment-daimo.html`)
```html
<link rel="stylesheet" href="assets/css/pnptv-logo.css">
<div class="pnptv-logo pnptv-logo--medium pnptv-logo--dark pnptv-logo--animated">
  <!-- SVG content -->
</div>
```

### 3. Next.js Apps (`/daimo-payment-app`)
```tsx
import AnimatedLogo from '../components/AnimatedLogo';

// In your component
<AnimatedLogo size="medium" variant="brand" />
```

## 🎨 Brand Colors

The logo uses PNPTV's official brand colors:

- **Primary Purple**: `#6A40A7`
- **Accent Magenta**: `#DF00FF`
- **Dark Gray**: `#28282B`
- **Light Gray**: `#C6C6CD`

## 📱 Responsive Behavior

```css
/* Mobile adjustments */
@media (max-width: 768px) {
  .pnptv-logo--large { width: 300px; height: 150px; }
  .pnptv-logo--medium { width: 250px; height: 125px; }
}

@media (max-width: 480px) {
  .pnptv-logo--large { width: 250px; height: 125px; }
  .pnptv-logo--medium { width: 200px; height: 100px; }
}
```

## ♿ Accessibility

The logo respects user preferences:

```css
@media (prefers-reduced-motion: reduce) {
  /* All animations are disabled */
  .pnptv-logo--animated * {
    animation: none;
  }
}

@media (prefers-color-scheme: dark) {
  .pnptv-logo {
    color: #FFFFFF;
  }
}
```

## 🛠️ Customization

### Custom Colors
```css
.pnptv-logo--custom {
  color: #your-color;
}

.pnptv-logo--custom .pnptv-logo__path--v {
  stroke: url(#your-gradient);
}
```

### Custom Sizes
```css
.pnptv-logo--xl {
  width: 500px;
  height: 250px;
}
```

### Custom Animations
```css
.pnptv-logo--slow .pnptv-logo__path {
  animation-duration: 4s; /* Slower drawing */
}
```

## 🚀 Performance Tips

1. **Preload CSS**: Include logo CSS in critical path
2. **Lazy load**: For below-the-fold logos, add animations on scroll
3. **Reduced motion**: Always respect user preferences
4. **SVG optimization**: Paths are already optimized for performance

## 🎬 Demo

Visit `/public/pnptv-logo.html` to see the logo in action with interactive controls:

- Restart animation
- Toggle animation on/off
- Copy HTML template
- View different sizes and variants

## 📦 Export Options

The logo is available in multiple formats:

1. **React Component** - Full TypeScript support
2. **Standalone CSS** - Framework agnostic
3. **HTML Template** - Copy-paste ready
4. **Next.js Component** - Optimized for Next.js

## 🔧 Browser Support

- **Modern browsers**: Full animation support
- **IE11+**: Static version (animations disabled)
- **Mobile browsers**: Optimized performance
- **Screen readers**: Proper ARIA labels

## 📄 License

MIT License - Use freely in your PNPTV applications.

---

**Ready to use!** The animated PNPTV logo is now integrated across all your web applications with sophisticated animations and professional polish.