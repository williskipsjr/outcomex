# News-source check for stretch S1 (ML-03)

**Recommendation: no-go.** No free source we tested gives relevant news headlines from the browser without a key. News evidence stays out of the product, and nothing in the MVP depends on it.

Tested on 5 Nov 2026, from a browser page at `http://localhost:5173`, so CORS applied the same way it would for a visitor. These are single-day results, so a source that was down that day could behave differently.

## Results

| Source | Key needed | Answers from the browser? | Result |
|---|---|---|---|
| **GDELT DOC 2.0** | No | ❌ | Failed 3 of 3 tries: one 12-second timeout, two network errors. It also returned HTTP 429 in the team's first test on 23 Oct |
| **Google News RSS** | No | ❌ | Blocked by CORS, and it's XML rather than JSON |
| **Bing News RSS** | No | ❌ | Blocked by CORS |
| **Hacker News (Algolia)** | No | ✅ About 750 ms | Works, but it's a tech forum, not news (see below) |
| **Wikipedia search** | No | ✅ About 650 ms | Works, but it returns encyclopedia articles, not headlines, so relevance wasn't tested |

## Relevance of the one source worth testing

For 10 live markets across categories, we searched Hacker News with keywords from each question and read the top results.

| Category | Market | Top results |
|---|---|---|
| Sports | Borussia Dortmund win on 4 Nov | None |
| Sports | Arsenal win on 4 Nov | None |
| Politics | Republicans lose seven named Senate seats | None |
| Politics | Republicans win Mississippi Senate race | None |
| World | Gadi Eizenkot next PM of Israel | None |
| World | Netanyahu next PM of Israel | Stories from 2024 and 2015 |
| Economy | Fed raises rates after December | A startup launch from 2024; a relevant story from 2023 |
| Economy | No change in Fed rates | Unrelated product launches |
| Crypto | Ethereum above $2,400 | Stories from 2017 |
| Tech & Science | US confirms aliens exist | Links to the market's own question, not news |

**0 of 10 markets got a recent, relevant headline.**

## Not tested

Keyed services such as NewsAPI or GNews. A key can't be kept secret on a static site, so they would need a small server proxy. The master plan treats that as a decision record and a PM call, and it's the first server this project would have.

## What this means

- **Stretch S1 (news evidence panel), FE2-07 and the news part of BE-14:** don't start them. The PM records this decision.
- **The model:** unaffected. It never used news. The About page already says it doesn't read the news.
