export default function BaseCard({ title, icon, children, right }) {
  return (
    <section className="rounded-xl border border-white/10 bg-card p-4 shadow-sm">
      {(title || right) && (
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            {icon ? <span className="text-lg">{icon}</span> : null}
            {title ? <h2 className="text-sm font-semibold">{title}</h2> : null}
          </div>
          {right ? <div className="text-xs opacity-70">{right}</div> : null}
        </div>
      )}

      <div className={title || right ? "mt-3" : ""}>{children}</div>
    </section>
  );
}