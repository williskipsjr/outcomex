# 003 · News evidence (stretch S1) stays out of the product

**Decided:** 5 Nov 2026 by the PM, on the ML engineer's recommendation · **Status:** accepted

## Context

Version 1.0 of the plan had a news panel in the MVP: recent headlines about each question as evidence (story US-06). Version 1.1 moved it to stretch S1, because the GDELT news API rate-limited the team's first browser test on 23 Oct. S1 could only come back if a news source worked reliably from the browser, since OutcomeX has no server.

The ML engineer's news-source check ([ml/news-sources.md](../ml/news-sources.md), 5 Nov) tested five free sources from a browser page:

| Source | From the browser? |
|---|---|
| GDELT DOC 2.0 | ❌ Failed 3 of 3 tries |
| Google News RSS | ❌ Blocked by CORS |
| Bing News RSS | ❌ Blocked by CORS |
| Hacker News (Algolia) | ✅, but 0 of 10 markets got a recent, relevant headline |
| Wikipedia search | ✅, but returns encyclopedia articles, not headlines |

## Decision

**No news evidence in OutcomeX.** US-06 is closed as "decided against". Nothing in the MVP depended on it.

## Alternatives

- **A keyed news service (NewsAPI, GNews):** a key can't be kept secret on a static site, so it would need a small server proxy. That would be the project's first server, against the "no backend" decision, for a stretch feature. Rejected.
- **Hacker News as the source:** it works, but it is a tech forum, not news, and gave nothing relevant. Rejected.

## Consequences

- The About page says the AI "doesn't read the news", which stays true.
- If a free source that works from the browser appears later, S1 can be reopened with a new decision record.
