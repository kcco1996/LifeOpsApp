import Home from "../pages/Home/Home";
import Review from "../pages/Review/Review";
import Support from "../pages/Support/Support";
import Settings from "../pages/Settings/Settings";

export default function Router({ active }) {
  if (active === "review") return <Review />;
  if (active === "support") return <Support />;
  if (active === "settings") return <Settings />;
  return <Home />;
}