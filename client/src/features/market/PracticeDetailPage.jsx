import { useParams } from "react-router-dom";

export default function PracticeDetailPage() {
  const { id } = useParams();

  return (
    <section>
      <h1>Practice market</h1>
      <p>Practice market {id} will go here.</p>
    </section>
  );
}
