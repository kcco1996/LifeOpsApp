export default function Card({ title, right, children, className = "" }) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-card p-4 ${className}`}>
      {(title || right) && (
        <div className="flex items-center justify-between">
          {title ? <div className="text-sm font-semibold opacity-90">{title}</div> : <div />}
          {right ? <div className="text-xs opacity-60">{right}</div> : null}
        </div>
      )}
      <div className={title || right ? "mt-3" : ""}>{children}</div>
    </div>
  );
}
