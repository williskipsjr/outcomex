import { useParams } from "react-router-dom";

export default function MarketDetailPage() {
  const { id } = useParams();

  return (
    <section>
      <h1>Market detail</h1>
      <p>Details for market {id} will go here.</p>
    </section>
  );
}
