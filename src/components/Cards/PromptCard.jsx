import { useEffect, useState } from "react";
import BaseCard from "./BaseCard";

export default function PromptCard({ prompt, answer, onChangeAnswer }) {
  const [draft, setDraft] = useState(answer ?? "");
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => setDraft(answer ?? ""), [answer]);

  function startEdit() {
    setIsEditing(true);
  }

  function cancelEdit() {
    setDraft(answer ?? "");
    setIsEditing(false);
  }

  function save() {
    onChangeAnswer((draft || "").trim());
    setIsEditing(false);
  }

  const right = isEditing ? "Editing" : "Optional";

  return (
   <BaseCard title="ONE QUESTION" icon="🟣" right={right}>
      <div className="space-y-3">
        <div className="text-sm font-semibold">{prompt}</div>

        {!isEditing ? (
          <>
            {answer ? (
              <p className="text-sm opacity-85 whitespace-pre-wrap">{answer}</p>
            ) : (
              <p className="text-sm opacity-70">
                Optional. A short sentence is enough.
              </p>
            )}

            <button
              className="w-full rounded-xl bg-card2 px-3 py-2 text-sm hover:opacity-90 active:opacity-80"
              onClick={startEdit}
            >
              {answer ? "Edit answer" : "Add answer"}
            </button>
          </>
        ) : (
          <>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="E.g. Keep meetings short. Go for a short walk after work."
              className="min-h-[96px] w-full resize-none rounded-xl bg-card2 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple/60"
            />

            <div className="flex gap-2">
              <button
                className="flex-1 rounded-xl bg-purple px-3 py-2 text-sm font-semibold hover:opacity-90 active:opacity-80"
                onClick={save}
              >
                Save
              </button>
              <button
                className="flex-1 rounded-xl bg-card2 px-3 py-2 text-sm hover:opacity-90 active:opacity-80"
                onClick={cancelEdit}
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </BaseCard>
  );
}
