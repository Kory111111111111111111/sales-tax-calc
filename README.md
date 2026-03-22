# Sales Tax Calculator

A modern, responsive web application for calculating sales tax across all 50 US states. Built with Next.js, React, TailwindCSS, and Shadcn/ui components.

## 🚀 Features

- **State Sales Tax Calculator**: Calculate tax for all 50 US states with current 2024 rates
- **Device Catalog**: Pre-loaded with popular mobile devices and their MSRP/prepaid prices
- **Smart Search**: Advanced device search with autocomplete functionality
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile devices
- **Modern UI**: Built with Shadcn/ui components and TailwindCSS
- **GitHub Pages Ready**: Optimized for static deployment

## 🛠️ Technology Stack

- **Next.js 15** - React framework for production
- **React 19** - Modern React with latest features
- **TypeScript** - Type-safe development
- **TailwindCSS 4** - Utility-first CSS framework
- **Shadcn/ui** - High-quality, accessible UI components
- **Lucide React** - Beautiful, customizable icons

## 📱 What You Can Do

1. **Manual Calculation**: Enter any amount and select a state to calculate sales tax
2. **Device Selection**: Choose from popular devices or search the entire catalog
3. **Price Options**: Toggle between MSRP and prepaid pricing where available
4. **Real-time Results**: See instant calculations with detailed breakdowns
5. **Mobile Friendly**: Use on any device with responsive design

## 🏗️ Installation & Development

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd sales-tax-calc
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run development server**
   ```bash
   npm run dev
   ```

4. **Open in browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🌐 Deployment

This app is configured for GitHub Pages deployment:

1. **Build for production**
   ```bash
   npm run build
   ```

2. **Deploy to GitHub Pages**
   - Push to your main branch
   - GitHub Actions will automatically build and deploy
   - Enable GitHub Pages in repository settings

## 📊 Sales Tax Information

- **Coverage**: All 50 US states
- **Accuracy**: State-level sales tax rates (local taxes not included)
- **Currency**: 2024 rates, updated annually
- **No Tax States**: Alaska, Delaware, Montana, New Hampshire, Oregon

## 🎨 UI Components

Built with Shadcn/ui components:
- Cards for layout structure
- Select dropdowns for state selection
- Input fields with proper validation
- Buttons with hover states
- Badges for price display
- Command palette for device search
- Responsive grid system

## 🔧 Configuration

The app is pre-configured with:
- Static export for GitHub Pages
- TypeScript for type safety
- ESLint for code quality
- Responsive breakpoints
- Dark mode support
- Optimized images

## 🔒 Security Guardrails

This repository includes defense-in-depth controls to reduce supply-chain tampering risk:

- **Automated security scanner**: `npm run security:check`
   - Blocks risky npm lifecycle scripts (`preinstall`, `postinstall`, `install`, `prepare`, etc.) in root `package.json`
   - Detects suspicious hook-like root files (`preinstall.js`, `postinstall.js`, etc.)
   - Scans executable/config files for high-risk patterns (e.g., `eval`, runtime decryption primitives, hidden variation selectors)
- **CI enforcement**:
   - Security check runs in GitHub Actions on push and pull requests
   - Deployment workflow installs with `npm ci --ignore-scripts` to prevent lifecycle-script execution in CI
- **Optional local pre-commit guard**:
   - Enable once per clone: `npm run security:hooks:enable`
   - Disable if needed: `npm run security:hooks:disable`

### Maintainer recommendation

Use branch protection in GitHub settings with required pull request reviews and required status checks (including `Security Check`) for `master`.

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 🌟 Acknowledgments

- Original Python Flask application for the core calculation logic
- Shadcn/ui for the beautiful component library
- Next.js team for the excellent framework
- TailwindCSS for the utility-first CSS approach
