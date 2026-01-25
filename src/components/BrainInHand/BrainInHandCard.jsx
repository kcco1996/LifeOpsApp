function statusMeta(status) {
  if (status === "green") {
    return {
      label: "Green",
      dot: "bg-green",
      border: "border-green/40",
      msg: "Things look steady today.",
    };
  }

  if (status === "amber") {
    return {
      label: "Amber",
      dot: "bg-amber",
      border: "border-amber/40",
      msg: "Something may need support.",
    };
  }

  return {
    label: "Red",
    dot: "bg-red",
    border: "border-red/40",
    msg: "Support is available.",
  };
}

export default function BrainInHandCard({ status }) {
  const meta = statusMeta(status);
  const isRed = status === "red";
  const isGreen = status === "green";

  return (
    <div className={`rounded-xl bg-card p-4 border ${meta.border} shadow-sm`}>
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">🧠 Brain in Hand</h2>

        <div className="flex items-center gap-2 text-sm">
          <span className={`h-2.5 w-2.5 rounded-full ${meta.dot}`} />
          <span className="font-semibold">{meta.label}</span>
        </div>
      </div>

      <p className="mt-2 text-sm opacity-80">{meta.msg}</p>

      {!isGreen && (
        <div className="mt-3">
          <div className="text-sm font-semibold opacity-90 mb-2">
            Suggested support
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-card2 px-3 py-1 text-sm opacity-90">
              🎧 Headphones + decompression
            </span>
            <span className="rounded-full bg-card2 px-3 py-1 text-sm opacity-90">
              🕊 Quiet break
            </span>
          </div>
        </div>
      )}

     <button
  type="button"
  className="mt-4 w-full rounded-xl bg-purple px-4 py-2.5 text-sm font-semibold hover:opacity-90 active:opacity-80"
  onClick={() =>
    window.open("https://secure.braininhand.co.uk/login/", "_blank", "noopener,noreferrer")
  }
>
  Open Brain in Hand
</button>

      {isRed && (
        <div className="mt-3 flex gap-2">
          <button className="flex-1 rounded-xl bg-card2 px-3 py-2 text-sm hover:opacity-90 active:opacity-80">
            Reduce screen
          </button>
          <button className="flex-1 rounded-xl bg-card2 px-3 py-2 text-sm hover:opacity-90 active:opacity-80">
            Get out of the way
          </button>
        </div>
      )}
    </div>
  );
}
