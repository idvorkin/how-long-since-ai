# How Long Since AI

**Live: [idvorkin-how-long-since-ai.surge.sh](https://idvorkin-how-long-since-ai.surge.sh)**

A PWA tracking milestones in AI development.

## The data

Every release lives in [`public/events.json`](public/events.json), validated on
each build by `npm run validate`. Each entry needs an `id`, `name`, `date`
(`YYYY-MM-DD`), `description`, `category` (`model` | `tool` | `art`), `vendor`,
`brand`, and `tier` — plus an optional `url` for the deep-dive link.

`vendor` is the company; `brand` is the product family. They differ on purpose:
a lab's chip is labelled by its brand when every release in view shares one
("Kimi" rather than "Moonshot AI", "GLM" rather than "Zhipu AI"), and falls back
to the company name when it ships more than one family — Google ships both
Gemini and Nano Banana.

`tier` decides what shows by default: `flagship` for a new generation, family,
or genuine first — the kind of release someone who doesn't follow AI would still
have heard about — and `incremental` for point releases, previews, GA-of-a-
preview, size or modality variants, and price changes. Incrementals are
collapsed behind an expander.

### Where to find new releases

- **[openrouter.ai/models](https://openrouter.ai/models)** — live catalog across
  every lab. `https://openrouter.ai/api/v1/models` returns the same list as JSON
  with a `created` timestamp per model, which is the quickest way to spot what
  has appeared since the last refresh.
- **[artificialanalysis.ai/models](https://artificialanalysis.ai/models)** —
  independent benchmarks, and the source of most `url` links here.

Prefer the lab's own announcement date over a catalog listing date when they
disagree; catalogs often lag the announcement by days (GLM-5.3 was announced
Aug 14 2026 but listed on OpenRouter Aug 18, because the weights were held
back). Don't guess a date — leave the release out until one can be sourced.

## Deployment

Deployments go to [Surge.sh](https://surge.sh):

| Environment | URL | Trigger |
|-------------|-----|---------|
| **Production** | [idvorkin-how-long-since-ai.surge.sh](https://idvorkin-how-long-since-ai.surge.sh) | Push to `main` |
| **PR Preview** | `pr-{number}-idvorkin-how-long-since-ai.surge.sh` | PR opened/updated |

PR previews are automatically torn down when the PR closes.

### Manual Deploy

```bash
npm run deploy  # deploys to idvorkin-how-long-since-ai.surge.sh
```

## Development

Built with React + TypeScript + Vite. This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
