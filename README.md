# OutcomeX

A prediction market platform for crowd intelligence and forecasting.

OutcomeX shows live yes/no questions from public prediction-market data (Polymarket). You enter your own probability first, then see how it compares with the crowd's price and, where available, a model's estimate. When a market resolves, every forecast is scored with the Brier score, so you can see whether you beat the crowd over time. A Practice mode replays markets that have already resolved, so you get scored straight away.

Course project for Full Stack Development 1, IIIT Dharwad.

## Stack

- **Frontend:** React + Vite, React Router, plain CSS
- **Data:** Polymarket public APIs, called from the browser (no backend server)
- **Model (optional):** Python, scikit-learn. It writes static JSON files that the frontend reads.
- **Your data:** stored in the browser (localStorage)

## Repository layout

| Folder | What is in it |
|---|---|
| `client/` | The React app |
| `ml/` | Data collection, evaluation and model code (Python) |
| `docs/` | PRD, user stories, acceptance tests, decision records, the data contract, ML and testing reports. Start at [`docs/README.md`](docs/README.md) |

## Team

| Role | Name | GitHub |
|---|---|---|
| Product Manager | Ayman | [aymanweb3](https://github.com/aymanweb3) |
| AI/ML Engineer | Muhammad Owais | [mdowais-39](https://github.com/mdowais-39) |
| Frontend Engineer 1 | Willis Kipgen | [williskipsjr](https://github.com/williskipsjr) |
| Frontend Engineer 2 | Shreyas | [shreyashell06](https://github.com/shreyashell06) |
| Backend / Data Engineer | Prathyusha | [Prathyusha-dev-hash](https://github.com/Prathyusha-dev-hash) |

## How we work

- `main` is protected. Nobody pushes to it directly.
- Every change gets its own branch, for example `feat/about-page` or `fix/ai-estimate-date`. Bugs found in review are tracked as GitHub issues.
- Changes reach `main` through a pull request with at least one review.
- Commit messages follow the Conventional Commits style, for example `feat(dashboard): add category filter`.
- Each feature has a browser check in [`docs/acceptance-tests.md`](docs/acceptance-tests.md), with the date it was last run.

## Running the project

You need Node.js 20 or newer.

```bash
cd client
npm install
npm run dev
```

Then open http://localhost:5173.

The app reads live data from Polymarket. To work offline with the fixtures in `client/src/mocks` instead:

```bash
npm run dev:mock
```

See `client/src/data/README.md` for the failure switch and the other debug options.

Other commands, all run inside `client/`:

| Command | What it does |
|---|---|
| `npm run lint` | Checks the code with ESLint |
| `npm test` | Runs the unit tests (Vitest) |
| `npm run build` | Builds the production version into `client/dist` |
| `npm run preview` | Serves the production build locally |
| `npm run check:contracts` | Checks the JSON files in `client/public/data` against the data contract |

The AI numbers in `client/public/data` are made offline by the Python pipeline in `ml/`. How to rebuild them is in [`ml/README.md`](ml/README.md).
