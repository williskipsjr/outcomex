import { Navigate, Outlet, Routes, Route, useLocation } from "react-router-dom";
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
import LandingPage from "./features/landing/LandingPage.jsx";

// The app's frame: nav bar, notices and footer around the page for the
// current URL (drawn where <Outlet /> is).
function AppShell() {
  return (
    <>
      {/* First thing a keyboard user reaches: jumps straight past the nav */}
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <NavBar />
      <CallsRepairNotice />
      <main id="main" tabIndex={-1}>
        <Outlet />
      </main>
      <Footer />
    </>
  );
}

// The home page. The dashboard used to live at / and keeps its view in the
// query string, so an old link like /?cat=Crypto goes on to /markets?cat=Crypto.
function Home() {
  const { search } = useLocation();
  if (search) return <Navigate to={`/markets${search}`} replace />;
  return (
    <TitledPage title="Forecast blind">
      <LandingPage />
    </TitledPage>
  );
}

// The list of pages (routes). Each URL maps to one page component. TitledPage
// sets the browser tab title for pages whose title doesn't depend on data; the
// market pages set their own from the question. The home page brings its own
// nav and footer, so it sits outside the app's frame.
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route element={<AppShell />}>
        <Route
          path="/markets"
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
      </Route>
    </Routes>
  );
}
