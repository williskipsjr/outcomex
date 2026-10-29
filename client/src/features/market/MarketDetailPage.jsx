import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Badge from "../../components/Badge.jsx";
import EmptyState from "../../components/EmptyState.jsx";
import ErrorState from "../../components/ErrorState.jsx";
import Skeleton from "../../components/Skeleton.jsx";
import useDocumentTitle from "../../hooks/useDocumentTitle.js";
import useRequest from "../../hooks/useRequest.js";
import { getErrorMessage } from "../../lib/errorMessages.js";
import { formatDate, formatPercent, formatTimeLeft, formatVolume } from "../../lib/format.js";
import useCalls from "../calls/useCalls.js";
import useSettings from "../settings/useSettings.js";
import CallItForm from "./CallItForm.jsx";
import PriceChart from "./PriceChart.jsx";
import RevealPanel from "./RevealPanel.jsx";
import { getSampleMarket, getSamplePrediction } from "./sampleMarketData.js";
import "./MarketDetailPage.css";

export default function MarketDetailPage() {
  const { id } = useParams();
  const { blindMode } = useSettings();
  const { getCall, makeCall } = useCalls();
  const [callError, setCallError] = useState(null);

  // Two independent requests, each with its own state machine: a failed AI
  // estimate never takes the market itself down with it
  const market = useRequest();
  const prediction = useRequest();
  const { run: runMarket } = market;
  const { run: runPrediction } = prediction;

  useEffect(() => {
    runMarket((signal) => getSampleMarket(id, { signal }));
    runPrediction((signal) => getSamplePrediction(id, { signal }));
  }, [id, runMarket, runPrediction]);

  // useRequest keeps old data while loading; when moving to another market
  // that old data belongs to the previous page, so don't show it
  const detail = market.data?.id === id ? market.data : null;
  useDocumentTitle(detail?.question ?? "Market");

  const call = getCall(id, "live");
  // Blind mode: the crowd, AI and chart stay hidden until you've made your call
  const showsCrowd = !blindMode || call !== null;
  const aiProbability = prediction.data?.available ? prediction.data.probability : null;

  function handleCall(probability, reason) {
    setCallError(null);
    const result = makeCall({
      marketId: id,
      mode: "live",
      probability,
      reason,
      question: detail.question,
      // A snapshot of what the crowd and AI said at the moment you called
      revealed: { crowdProbability: detail.crowdProbability, aiProbability },
    });
    if (!result.ok) setCallError(result.error);
  }

  if (market.status === "error" && market.error?.code === "NOT_FOUND") {
    return (
      <EmptyState
        title="Market not found"
        message="It may have closed or the link is wrong."
        action={<Link to="/">Back to live markets</Link>}
      />
    );
  }
  if (market.status === "error") {
    return <ErrorState title="Couldn't load this market" message={getErrorMessage(market.error)} onRetry={market.retry} />;
  }
  if (!detail) {
    return (
      <div className="market-detail__loading" aria-busy="true">
        <Skeleton shape="line" />
        <Skeleton shape="block" />
        <Skeleton shape="card" />
      </div>
    );
  }

  const ai = { status: prediction.status, prediction: prediction.data, onRetry: prediction.retry };

  return (
    <article className="market-detail">
      <Link className="market-detail__back" to="/">
        ← Live markets
      </Link>

      <div className="market-detail__layout">
        <header className="market-detail__header">
          <div className="market-detail__title-row">
            {detail.imageUrl && (
              <img className="market-detail__image" src={detail.imageUrl} alt="" width="72" height="72" />
            )}
            <div>
              <Badge label={detail.category} />
              <h1 className="market-detail__question">{detail.question}</h1>
            </div>
          </div>
          <p className="market-detail__meta">
            <span>
              Closes <time dateTime={detail.endDate}>{formatDate(detail.endDate)}</time> ·{" "}
              {formatTimeLeft(detail.endDate)}
            </span>
            <span className="num">{formatVolume(detail.volume)} volume</span>
            <a href={detail.sourceUrl} target="_blank" rel="noopener noreferrer">
              View on Polymarket ↗
            </a>
          </p>
          {showsCrowd && !call && detail.crowdProbability !== null && (
            <p className="market-detail__crowd">
              <strong className="num">{formatPercent(detail.crowdProbability)}</strong> chance, says the crowd
            </p>
          )}
        </header>

        <aside className="market-detail__side">
          {call ? (
            <>
              <p className="market-detail__locked">
                Your call is locked: <strong className="num">{formatPercent(call.probability)}</strong> on{" "}
                {formatDate(call.createdAt)}
                {call.reason && <span className="market-detail__reason">“{call.reason}”</span>}
              </p>
              <RevealPanel you={call.probability} crowd={call.revealed.crowdProbability} ai={ai} />
            </>
          ) : (
            <CallItForm onCall={handleCall} error={callError} />
          )}

          {showsCrowd ? (
            <PriceChart marketId={id} yourCall={call?.probability ?? null} aiProbability={aiProbability} />
          ) : (
            <p className="market-detail__hidden">
              Blind mode is on: the crowd's price, the AI and the chart appear after you make your call.
            </p>
          )}
        </aside>

        <section className="market-detail__rules">
          {/* Native <details>: keyboard and screen-reader support for free */}
          <details>
            <summary>Rules and resolution</summary>
            <p>{detail.description || "No description was published for this market."}</p>
          </details>
        </section>
      </div>
    </article>
  );
}
