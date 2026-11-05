import { Routes, Route } from "react-router-dom";
import Footer from "./components/Footer.jsx";
import NavBar from "./components/NavBar.jsx";
import CallsRepairNotice from "./features/calls/CallsRepairNotice.jsx";
import TitledPage from "./components/TitledPage.jsx";
import DashboardPage from "./features/dashboard/DashboardPage.jsx";
import PracticeListPage from "./features/practice-list/PracticeListPage.jsx";
import MarketDetailPage from "./features/market/MarketDetailPage.jsx";
import PracticeDetailPage from "./features/market/PracticeDetailPage.jsx";
import MyCallsPage from "./features/calls/MyCallsPage.jsx";
import AboutPage from "./features/about/AboutPage.jsx";
import NotFoundPage from "./features/about/NotFoundPage.jsx";
import KitPage from "./features/kit/KitPage.jsx";

// The page layout and the list of pages (routes). Each URL maps to one page
// component. TitledPage sets the browser tab title for pages whose title
// doesn't depend on data; the market pages set their own from the question.
export default function App() {
  return (
    <>
      {/* First thing a keyboard user reaches: jumps straight past the nav */}
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <NavBar />
      <CallsRepairNotice />
      <main id="main" tabIndex={-1}>
        <Routes>
          <Route
            path="/"
            element={
              <TitledPage title="Live markets">
                <DashboardPage />
              </TitledPage>
            }
          />
          <Route
            path="/practice"
            element={
              <TitledPage title="Practice">
                <PracticeListPage />
              </TitledPage>
            }
          />
          <Route path="/market/:id" element={<MarketDetailPage />} />
          <Route path="/practice/:id" element={<PracticeDetailPage />} />
          <Route
            path="/me"
            element={
              <TitledPage title="My Calls">
                <MyCallsPage />
              </TitledPage>
            }
          />
          <Route
            path="/about"
            element={
              <TitledPage title="About">
                <AboutPage />
              </TitledPage>
            }
          />
          {/* A gallery of the shared components for checking styles while building.
              Only in `npm run dev`: the built site has no /kit page. */}
          {import.meta.env.DEV && <Route path="/kit" element={<KitPage />} />}
          {/* Any other URL: a friendly 404 with links back */}
          <Route
            path="*"
            element={
              <TitledPage title="Page not found">
                <NotFoundPage />
              </TitledPage>
            }
          />
        </Routes>
      </main>
      <Footer />
    </>
  );
}
