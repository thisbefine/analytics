# Contributing to @thisbefine/analytics

Thanks for your interest in contributing! This document outlines how to get started.

## Development Setup

1. **Clone the repo**
   ```bash
   git clone https://github.com/thisbefine/analytics.git
   cd analytics
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Build the package**
   ```bash
   pnpm build
   ```

4. **Run type checking**
   ```bash
   pnpm typecheck
   ```

## Making Changes

1. Create a new branch from `main`
2. Make your changes
3. Ensure the build passes: `pnpm build`
4. Ensure types are correct: `pnpm typecheck`
5. Submit a pull request

## Code Style

- We use [Biome](https://biomejs.dev/) for linting and formatting
- Run `pnpm format` before committing
- Use TypeScript for all new code
- Follow existing patterns in the codebase

## Commit Messages

Use clear, descriptive commit messages:
- `feat: add new tracking method`
- `fix: resolve session timeout issue`
- `docs: update README examples`
- `chore: update dependencies`

## Pull Requests

- Keep PRs focused on a single change
- Update documentation if needed
- Add changelog entry for user-facing changes
- Ensure CI passes before requesting review

## Reporting Issues

- Use GitHub Issues for bug reports and feature requests
- Include reproduction steps for bugs
- Check existing issues before creating new ones

## Questions?

Feel free to open an issue for any questions about contributing.
