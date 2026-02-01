import Home from "../pages/Home/Home";
import Review from "../pages/Review/Review";
import Support from "../pages/Support/Support";
import Settings from "../pages/Settings/Settings";
import History from "../pages/History/History";

export default function Router({ active }) {
  if (active === "review") return <Review />;
  if (active === "support") return <Support />;
  if (active === "settings") return <Settings />;
    if (active === "history") return <History />; // ✅ ADD THIS
  return <Home />;
}