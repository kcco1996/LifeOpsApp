export function Input({ className = "", ...props }) {
  return (
    <input
      className={`w-full min-h-[44px] rounded-xl bg-card2 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple/60 disabled:opacity-60 ${className}`}
      {...props}
    />
  );
}

export function Textarea({ className = "", ...props }) {
  return (
    <textarea
      className={`w-full min-h-[90px] rounded-xl bg-card2 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple/60 disabled:opacity-60 ${className}`}
      {...props}
    />
  );
}
