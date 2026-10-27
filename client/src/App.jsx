import { Routes, Route } from "react-router-dom";
import NavBar from "./components/NavBar.jsx";
import DashboardPage from "./features/dashboard/DashboardPage.jsx";
import PracticeListPage from "./features/practice-list/PracticeListPage.jsx";
import MarketDetailPage from "./features/market/MarketDetailPage.jsx";
import PracticeDetailPage from "./features/market/PracticeDetailPage.jsx";
import MyCallsPage from "./features/calls/MyCallsPage.jsx";
import AboutPage from "./features/about/AboutPage.jsx";
import NotFoundPage from "./features/about/NotFoundPage.jsx";
import KitPage from "./features/kit/KitPage.jsx";

export default function App() {
  return (
    <>
      {/* First thing a keyboard user reaches: jumps straight past the nav */}
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <NavBar />
      <main id="main" tabIndex={-1}>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/practice" element={<PracticeListPage />} />
          <Route path="/market/:id" element={<MarketDetailPage />} />
          <Route path="/practice/:id" element={<PracticeDetailPage />} />
          <Route path="/me" element={<MyCallsPage />} />
          <Route path="/about" element={<AboutPage />} />
          {import.meta.env.DEV && <Route path="/kit" element={<KitPage />} />}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
    </>
  );
}
