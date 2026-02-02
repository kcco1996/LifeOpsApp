import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";

const CHANGELOG = [
  { version: "1.0.0", date: "2026-02-02", items: [
    "Home + weekly planner + upcoming fully persisted",
    "Firebase auth + sync + migrate button (whitelist)",
    "History view, weekly carry-over, Sunday review prompt",
    "Offline-first: localStorage always works",
  ]},
];

export default function About() {
  return (
    <div className="max-w-md p-4 space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-purple">About</h1>
        <div className="text-xs opacity-60">Life Ops</div>
      </div>

      <Card title="Version">
        <div className="text-sm opacity-80">v1.0.0</div>
        <div className="text-xs opacity-60 mt-1">Built for a calm, structured day.</div>
      </Card>

      <Card title="Changelog">
        <div className="space-y-3">
          {CHANGELOG.map((c) => (
            <div key={c.version} className="space-y-1">
              <div className="text-sm font-semibold opacity-90">
                v{c.version} <span className="text-xs opacity-60 ml-2">{c.date}</span>
              </div>
              <ul className="list-disc pl-5 text-sm opacity-80 space-y-1">
                {c.items.map((x) => <li key={x}>{x}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </Card>

      <Button variant="ghost" onClick={() => window.history.back()}>
        ← Back
      </Button>
    </div>
  );
}
