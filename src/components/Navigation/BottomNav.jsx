// src/components/Navigation/BottomNav.jsx
export default function BottomNav({ active, onChange }) {
  const items = [
    { key: "home", label: "Home", icon: "🏠" },
    { key: "review", label: "Review", icon: "🗓️" },
    { key: "settings", label: "Settings", icon: "⚙️" },
    { key: "support", label: "Support", icon: "🛟" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40">
      {/* safe-area-ish padding + border */}
      <div className="mx-auto max-w-md border-t border-white/10 bg-bg/95 backdrop-blur px-3 pb-4 pt-2">
        <div className="grid grid-cols-4 gap-2">
          {items.map((it) => {
            const isActive = active === it.key;

            return (
              <button
                key={it.key}
                type="button"
                onClick={() => onChange(it.key)}
                className={`rounded-2xl px-2 py-2 text-center text-xs hover:opacity-90 active:opacity-80 ${
                  isActive ? "bg-purple font-semibold" : "bg-card2"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                <div className="text-lg leading-none">{it.icon}</div>
                <div className="mt-1">{it.label}</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
