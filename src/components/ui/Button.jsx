export default function Button({
  children,
  className = "",
  variant = "card",
  ...props
}) {
  const base =
    "min-h-[44px] rounded-xl px-3 py-2 text-sm active:opacity-80 focus:outline-none focus:ring-2 focus:ring-purple/60";

  const variants = {
    card: "bg-card2 hover:opacity-90",
    purple: "bg-purple font-semibold hover:opacity-90",
    ghost: "bg-transparent hover:bg-white/5",
  };

  return (
    <button className={`${base} ${variants[variant] || variants.card} ${className}`} {...props}>
      {children}
    </button>
  );
}
