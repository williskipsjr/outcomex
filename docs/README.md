# OutcomeX documentation

Start with the [PRD](PRD.md): what OutcomeX is, what it was planned to deliver and what it delivers today.

## Product (Product Manager)

| Document | What it answers |
|---|---|
| [PRD.md](PRD.md) | What the product is for, who it is for, the planned scope next to what is built, decisions, limitations and the release plan |
| [user-stories.md](user-stories.md) | The 14 user stories, their acceptance criteria and what each one does today |
| [acceptance-tests.md](acceptance-tests.md) | How to check each feature in the browser, and which checks have been recorded |
| [decisions/](decisions/) | Decision records: [001 data gate G1](decisions/001-data-gate-g1.md), [002 AI level (G2)](decisions/002-ai-level-g2.md), [003 news evidence](decisions/003-news-evidence-stays-out.md) |

## Data (Backend / Data Engineer)

| Document | What it answers |
|---|---|
| [contracts/data.md](contracts/data.md) | The data contract: every data-layer function, the shapes it returns and its errors |

## AI layer (AI/ML Engineer)

| Document | What it answers |
|---|---|
| [ml/feasibility.md](ml/feasibility.md) | Is there enough clean data? (gate G1) |
| [ml/evaluation.md](ml/evaluation.md) | Does the model earn its place on screen? (gate G2) |
| [ml/model-card.md](ml/model-card.md) | What the AI is, what it may and may not be used for |
| [ml/news-sources.md](ml/news-sources.md) | Can a news source work from the browser? (stretch S1) |

## Testing

| Document | What it answers |
|---|---|
| [testing/data-failure-tests.md](testing/data-failure-tests.md) | What happens when a data source or file fails |

## Not here yet

Planned in the master plan but not written yet: wireframes (`wireframes/`), the copy deck (`copy-deck.md`), the scoring hand-check sheet (`scoring-check.csv`), meeting notes (`meetings/`), checkpoint reports (`checkpoints/`), the risk log (`risks.md`) and the usability findings (`usability.md`).
