import { useState } from "react";
import BottomNav from "../components/Navigation/BottomNav";

export default function PageShell({ children }) {
  const [active, setActive] = useState("home");

  // ✅ support both:
  // 1) render-prop children: ({ active }) => <Router active={active} />
  // 2) normal children: <Router />
  const content =
    typeof children === "function" ? children({ active, setActive }) : children;

  return (
    <div className="min-h-screen bg-bg text-white">
      <div className="mx-auto max-w-md pb-28">{content}</div>

      <BottomNav active={active} onChange={setActive} />
    </div>
  );
}