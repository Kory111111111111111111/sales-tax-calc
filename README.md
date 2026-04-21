# Sales Tax Calculator

I originally built this for internal use while I was working with a USCellular agency. After the T-Mobile acquisition, the old device-specific workflow stopped mattering, so I stripped that out and turned the project into a simple public sales tax calculator.


There is a security check script in this repo. I added it after dealing with malicious PRs that included changes which could have made it to production if they were not caught in review. The script is optional, but it only adds a few seconds to build time and helps catch the kind of supply-chain bullshit that is easy to miss when you are moving fast. If you remove it, just be aware that you are also removing one of the few safeguards in this repo against that kind of headache. 


Live site: https://kory111111111111111111.github.io/sales-tax-calc/


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

Released under the [MIT-Style Attribution License](LICENSE).

Forks, derivative projects, and redistributed versions must credit Kory Drake d/b/a WAVFin Audio as the original creator and link back to the original repository.

See [LICENSE](LICENSE) for the full text.
