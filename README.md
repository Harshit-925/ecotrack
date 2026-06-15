# 🌍 EcoTrack — Premium Carbon Footprint Calculator

EcoTrack is a client-side web application designed to help individuals calculate, understand, and reduce their personal carbon footprint through interactive tools, dynamic visualizations, and science-backed, personalized insights.

Built as a high-performance web experience, EcoTrack features an organic biophilic dark theme, interactive data visualizations, gamified milestones, and fully responsive layouts.

---

## ✨ Features

### 🎨 Visual WOW & Motion UI
- **Biophilic & Glassmorphic Fusion**: Frosted-glass container cards (`backdrop-filter: blur(20px)`) set over an ultra-dark background with floating, slowly shifting organic background glow blobs.
- **Ambient Particle Canvas**: Active particle background showing slow-drifting eco-particles.
- **Global daily counter**: Displays the estimated real-time global carbon emission metric at a running sub-second refresh.
- **Micro-animations**: Staggered scroll animations, transition sweeps on the wizard, letter grade conic gradient spins, and interactive canvas components.

### 🧮 4-Step Interactive Calculator
- **Step 1: Transportation** (Daily commutes, car fuel types, public transit hours, short/long flights)
- **Step 2: Home Energy** (Monthly electricity, energy sources, primary heating types, living space dimensions)
- **Step 3: Diet & Food** (Eating patterns from heavy-meat to vegan, food waste metrics, local food preferences)
- **Step 4: Lifestyle** (Shopping habits, recycling rate, and digital footprint)

### 📊 Custom Data Visualizations (No External Heavy Libraries)
- **Interactive Donut Chart**: Renders category breakdowns on an HTML5 canvas. Hovering over slices or legend categories dynamically expands segments with custom math sweeps.
- **Benchmark Bar Chart**: Offers immediate contrast matching user metrics against global averages (World, US, EU) and the 2030 Climate targets.

### 🌱 Personalized Insights & Gamification
- **Personalized Action Items**: Suggests custom tasks automatically targeting the user's highest emission areas.
- **Grade Scoring**: Categorizes carbon impact levels with grades from `A+` down to `F`.
- **Milestone Achievements**: Tracks 6 milestone badges (e.g. Diet Champion, Zero Waste, Green Hero) which unlock based on input variables.

---

## 🛠️ Technical Architecture

- **Strict TypeScript**: 100% type-safe codebase compiled via strict settings (`strict: true`).
- **Frontend Core**: ES modules (`type="module"`) with zero runtime overhead or heavy frameworks.
- **Canvas Rendering Engine**: Low-level 2D Context API for high frame-rate animations and charts (pixel-scaled for HiDPI/Retina screens).
- **Security Audit & Mitigations**:
  - **XSS Prevention**: Zero `innerHTML` usage; all elements are generated safely via native DOM APIs.
  - **Content Security Policy (CSP)**: Integrated a strict CSP header to prevent cross-site scripting attacks.
  - **Input Sanitization**: Client-side boundaries and engine clamping to reject decimals, negatives, `NaN`, or outlier numbers.
- **Accessibility & Privacy**:
  - `prefers-reduced-motion` compliance.
  - Skip-to-content navigation links.
  - Screen reader semantic structures (`role`, `aria-live`, `aria-checked`).
  - LocalStorage support to cache calculator inputs on repeat sessions.

---

## 🧮 Carbon Math & Emission Factors

The calculation engine uses verified, science-backed constants (combining EPA, DEFRA, and Our World In Data databases):

| Category | Parameter / Option | Emission Factor |
|---|---|---|
| **Car Fuel** | Gasoline / Diesel / Hybrid / Electric | 0.21 / 0.27 / 0.12 / 0.05 kg CO₂/km |
| **Public Transit** | Average speed passenger-km | 0.089 kg CO₂/passenger-km |
| **Aviation** | Short (<3h) / Long (>3h) flight | 0.255 / 0.195 tonnes CO₂/trip |
| **Grid Electricity** | Monthly grid usage | 0.417 kg CO₂/kWh |
| **Clean Energy** | Solar / Wind / Mixed source | 0.05 / 0.02 / 0.5 multiplier |
| **Diet base** | Meat-Heavy / Average / Pescatarian / Vegetarian / Vegan | 3.3 / 2.5 / 1.7 / 1.5 / 1.0 tonnes CO₂/year |
| **Waste & Recycling**| Food Waste / Recycled portion | +0.02 t per % wasted / -0.015 t per % recycled |

---

## 🚀 Getting Started Locally

### Prerequisites
Make sure you have [Node.js](https://nodejs.org) installed on your machine.

### Quick Start
1. Clone the repository or enter the project directory:
   ```bash
   cd ecotrack
   ```
2. Install devDependencies safely:
   ```bash
   npm install --ignore-scripts --no-audit --no-fund
   ```
3. Compile TypeScript files:
   ```bash
   npm run build
   ```
4. Run automated unit tests:
   ```bash
   npm test
   ```
5. Start a local server:
   ```bash
   # Using Node (NPX)
   npx -y http-server -p 8080
   
   # Or using Python
   python -m http.server 8080
   ```
6. Open http://localhost:8080 or http://127.0.0.1:8080 in your browser.
