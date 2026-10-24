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
| `docs/` | PRD, user stories, wireframes, acceptance tests, decision records |

## Team

| Role | Name | GitHub |
|---|---|---|
| Product Manager | | |
| AI/ML Engineer | | |
| Frontend Engineer 1 | | |
| Frontend Engineer 2 | | |
| Backend / Data Engineer | | |

## How we work

- `main` is protected. Nobody pushes to it directly.
- Every change starts from a GitHub issue and gets its own branch, for example `feat/23-market-card`.
- Changes reach `main` through a pull request with at least one review.
- Commit messages follow the Conventional Commits style, for example `feat(dashboard): add category filter`.
- The product manager checks each feature against its acceptance test before it is merged.

## Running the project

Setup instructions will be added here once the client app is scaffolded.
