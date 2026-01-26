# Next.js Production Build & Deployment Instruction Set (Bun)

Here's a comprehensive pre-deployment checklist with detailed commands and steps:

## Phase 1: Environment & Dependencies

First, verify your environment is production-ready. Run `bun audit` to check for security vulnerabilities in your dependencies. Address any critical or high-severity issues before proceeding. Ensure your `.env.production` file exists with all necessary environment variables, and confirm no sensitive data is committed to version control by checking your `.gitignore` includes `.env*` files.

## Phase 2: Code Quality & Linting

Navigate to your project root and run `bunx eslint . --ext .js,.jsx,.ts,.tsx --max-warnings 0` to enforce zero ESLint warnings. If you need to check specific directories, run `bunx eslint ./src/components --ext .js,.jsx,.ts,.tsx` for each directory. To see the active ESLint configuration, use `bunx eslint --print-config src/components/SomeComponent.tsx`. For auto-fixable issues, run `bunx eslint . --fix --ext .js,.jsx,.ts,.tsx`.

If you're using TypeScript, run `bunx tsc --noEmit` to catch type errors without generating output files. This ensures type safety across your entire codebase.

## Phase 3: Testing & Validation

Run your full test suite with `bun test`. Ensure all unit tests, integration tests, and end-to-end tests pass. If using Playwright or Cypress, run `bunx playwright test` or `bunx cypress run` for E2E tests. Check test coverage with `bun test --coverage` and aim for at least 80% coverage on critical paths.

## Phase 4: Accessibility & Interface Guidelines

For Apple Human Interface Guidelines compliance, manually review components for proper semantic HTML, touch target sizes (minimum 44x44 points), color contrast ratios (WCAG AA minimum), and proper focus management. Run `bunx @axe-core/cli http://localhost:3000` on your development build to catch automated accessibility issues. Consider using `eslint-plugin-jsx-a11y` in your ESLint config to catch accessibility issues during development.

## Phase 5: Build Verification

Run `bun run build` to create your production build. This will trigger Next.js optimization, tree-shaking, and bundle creation. Pay attention to bundle size warnings. After the build completes, analyze the output in `.next/analyze` if you have `@next/bundle-analyzer` configured, or add it by running `bun add @next/bundle-analyzer` and adding it to your `next.config.js`.

Test the production build locally with `bun run start` and verify all routes, API endpoints, and functionality work as expected. Check for console errors in your browser developer tools.

## Phase 6: Performance & Optimization

Run Lighthouse audits using Chrome DevTools on key pages to ensure Performance, Accessibility, Best Practices, and SEO scores are above 90. Address any Critical or High priority issues. Verify your images are using Next.js Image component with proper width, height, and alt attributes. Check that fonts are optimized using `next/font`.

## Phase 7: Security Checks

Verify Content Security Policy headers are configured in your `next.config.js`. Ensure no API keys or secrets are exposed in client-side code. Run `bun run build` and inspect the output for any accidentally bundled environment variables. Check that your API routes have proper authentication and rate limiting.

## Additional Items You May Have Forgotten

Confirm your `robots.txt` and `sitemap.xml` are properly configured for SEO. Verify social media meta tags (Open Graph, Twitter Cards) are present on relevant pages. Test your application in multiple browsers (Chrome, Safari, Firefox, Edge) and ensure your error boundaries are working by deliberately triggering errors in development. Set up proper logging and monitoring (Sentry, LogRocket, etc.) before deployment. Verify your database migrations are up to date and backup procedures are in place.

## Final Build Command

Once all checks pass, your final build and deployment sequence should be:

```bash
bun run lint && bun run type-check && bun test && bun run build
```

Or create a custom script in your `package.json`:

```json
"scripts": {
  "pre-deploy": "bun run lint && tsc --noEmit && bun test",
  "deploy": "bun run pre-deploy && bun run build"
}
```

Then simply run `bun run deploy` to execute all checks before building.

Does your project use TypeScript, and what deployment platform are you targeting (Vercel, AWS, Docker, etc.)? This would help me tailor more specific recommendations.
