import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Badge from "../../components/Badge.jsx";
import Button from "../../components/Button.jsx";
import EmptyState from "../../components/EmptyState.jsx";
import ErrorState from "../../components/ErrorState.jsx";
import Skeleton from "../../components/Skeleton.jsx";
import { getPractice, revealPractice } from "../../data/index.js";
import useDocumentTitle from "../../hooks/useDocumentTitle.js";
import useRequest from "../../hooks/useRequest.js";
import { getErrorMessage } from "../../lib/errorMessages.js";
import { formatDate } from "../../lib/format.js";
import useCalls from "../calls/useCalls.js";
import CallItForm from "./CallItForm.jsx";
import RevealPanel from "./RevealPanel.jsx";
import "./MarketDetailPage.css";
import "./PracticeDetailPage.css";

export default function PracticeDetailPage() {
  const { id } = useParams();
  const { getCall, makeCall } = useCalls();
  const practice = useRequest();
  const { run } = practice;

  // The reveal's own state machine: idle -> checking -> (saved call) | error
  const [reveal, setReveal] = useState({ status: "idle", error: null });
  const guardRef = useRef(false); // true while a reveal is in flight
  const lastAttemptRef = useRef(null); // what Retry repeats
  const controllerRef = useRef(null);

  useEffect(() => {
    run((signal) => getPractice(id, { signal }));
  }, [id, run]);

  // Leaving the page cancels a reveal that is still loading
  useEffect(() => () => controllerRef.current?.abort(), []);

  const market = practice.data?.id === id ? practice.data : null;
  useDocumentTitle(market ? `Practice: ${market.question}` : "Practice");

  // Already called before? Then open straight into the revealed state
  const call = getCall(id, "practice");

  async function runReveal(probability, reason) {
    if (guardRef.current) return;
    guardRef.current = true;
    lastAttemptRef.current = { probability, reason };
    const controller = new AbortController();
    controllerRef.current = controller;
    setReveal({ status: "checking", error: null });

    try {
      // The answer is only fetched now, after you've committed
      const { data } = await revealPractice(id, probability, { signal: controller.signal });
      // Saved only after a successful reveal, so a failure never leaves a half-saved call
      const result = makeCall({
        marketId: id,
        mode: "practice",
        probability,
        reason,
        question: market.question,
        revealed: { crowdProbability: data.crowdProbabilityAsOf, aiProbability: data.ai.probability },
        resolution: { outcome: data.outcome, resolvedAt: data.resolvedAt },
      });
      setReveal(result.ok ? { status: "idle", error: null } : { status: "error", error: { message: result.error } });
    } catch (error) {
      if (error?.code === "ABORTED") return;
      setReveal({ status: "error", error });
    } finally {
      // Always released, so a failure never leaves the button stuck
      guardRef.current = false;
    }
  }

  function retryReveal() {
    const attempt = lastAttemptRef.current;
    if (attempt) runReveal(attempt.probability, attempt.reason);
  }

  if (practice.status === "error" && practice.error?.code === "NOT_FOUND") {
    return (
      <EmptyState
        title="Practice market not found"
        message="Pick another one from the practice list."
        action={<Link to="/practice">Back to practice</Link>}
      />
    );
  }
  if (practice.status === "error") {
    return <ErrorState title="Couldn't load this market" message={getErrorMessage(practice.error)} onRetry={practice.retry} />;
  }
  if (!market) {
    return (
      <div className="market-detail__loading" aria-busy="true">
        <Skeleton shape="line" />
        <Skeleton shape="block" />
      </div>
    );
  }

  const outcome = call?.resolution?.outcome ?? null;
  const aiProbability = call?.revealed.aiProbability ?? null;
  const ai = {
    status: "success",
    prediction:
      aiProbability === null
        ? { available: false, level: "none" }
        : { available: true, level: "model", probability: aiProbability, modelVersion: null },
  };

  return (
    <article className="market-detail">
      <Link className="market-detail__back" to="/practice">
        ← Practice
      </Link>

      <div className="market-detail__layout">
        <header className="market-detail__header">
          <div className="market-detail__title-row">
            {market.imageUrl && (
              <img className="market-detail__image" src={market.imageUrl} alt="" width="72" height="72" />
            )}
            <div>
              <Badge tone="you" label={`Practice · ${market.category}`} />
              <h1 className="market-detail__question">{market.question}</h1>
            </div>
          </div>
          <p className="practice-detail__rewind">
            You're back on <time dateTime={market.asOfDate}>{formatDate(market.asOfDate)}</time>. This market
            closed on <time dateTime={market.closedDate}>{formatDate(market.closedDate)}</time>: what did you
            think would happen?
          </p>
        </header>

        <aside className="market-detail__side">
          {call ? (
            <>
              <p className={`practice-detail__stamp practice-detail__stamp--${outcome === "YES" ? "yes" : "no"}`}>
                Resolved {outcome}
              </p>
              <RevealPanel
                you={call.probability}
                crowd={call.revealed.crowdProbability}
                crowdLabel={`Crowd on ${formatDate(market.asOfDate)}`}
                ai={ai}
                outcome={outcome}
              />
              <Link className="practice-detail__next" to="/practice">
                Try another practice market →
              </Link>
            </>
          ) : (
            <>
              <CallItForm
                onCall={runReveal}
                busy={reveal.status === "checking"}
                submitLabel="Call it and reveal"
              />
              {reveal.status === "error" && (
                <div className="practice-detail__error" role="alert">
                  <p>{reveal.error?.code ? getErrorMessage(reveal.error) : reveal.error?.message}</p>
                  <Button variant="secondary" onClick={retryReveal}>
                    Try again
                  </Button>
                </div>
              )}
            </>
          )}
        </aside>

        <section className="market-detail__rules">
          <details>
            <summary>Rules and resolution</summary>
            <p>{market.description || "No description was published for this market."}</p>
          </details>
        </section>
      </div>
    </article>
  );
}
