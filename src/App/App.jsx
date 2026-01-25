import PageShell from "./PageShell";
import Router from "./Router";

export default function App() {
  return (
    <PageShell>
      {({ active }) => <Router active={active} />}
    </PageShell>
  );
}