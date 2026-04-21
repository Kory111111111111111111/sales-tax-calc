# Sales Tax Calculator

I originally built this for internal use while I was working with a USCellular agency. After the T-Mobile acquisition, the old device-specific workflow stopped mattering, so I stripped that out and turned the project into a simple public sales tax calculator.

Pick a state, enter an amount, and it will show the estimated tax and total.

## Stack

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS 4
- shadcn/ui

## Local Development

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Useful Scripts

```bash
npm run dev
npm run lint
npm run build
npm run security:check
```

## Notes

- Tax rates are state-level estimates
- Local taxes are not included
- The app is set up for static export / GitHub Pages

## License

[MIT](LICENSE)
