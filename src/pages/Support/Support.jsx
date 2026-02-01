// src/pages/Support/Support.jsx
import React, { useState } from "react";

function Section({ title, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12, marginTop: 12 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          textAlign: "left",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          fontSize: 16,
          fontWeight: 600,
        }}
      >
        {title} {open ? "▲" : "▼"}
      </button>
      {open ? <div style={{ marginTop: 10, lineHeight: 1.5 }}>{children}</div> : null}
    </div>
  );
}

export default function Support() {
  return (
    <div style={{ padding: 16, maxWidth: 900 }}>
      <h1>Support</h1>
      <p style={{ marginTop: 8 }}>
        Life Ops is designed to reduce overwhelm and help you choose the right level of effort for the day.
        You don’t need to fill everything in.
      </p>

      <Section title="What each tool is for">
        <ul>
          <li><b>Check-in traffic light:</b> green = capacity, yellow = limited, red = low capacity.</li>
          <li><b>Coping method:</b> the quickest regulation action you can actually do.</li>
          <li><b>Brain in hand:</b> emergency reset when overwhelmed.</li>
          <li><b>One question:</b> a single focusing prompt to stop spirals.</li>
          <li><b>Gentle prep:</b> start small, build momentum safely.</li>
          <li><b>This week’s focus:</b> your anchor. Everything else is optional noise.</li>
          <li><b>Weekly priorities:</b> the 2–5 most important outcomes.</li>
          <li><b>Weekly reviews:</b> learning loop, not judgement.</li>
          <li><b>Weekly checklist:</b> stability habits.</li>
          <li><b>To do today:</b> only today. Keep it short.</li>
          <li><b>Status:</b> your current load and steadiness.</li>
          <li><b>Upcoming:</b> awareness without overwhelm.</li>
        </ul>
      </Section>

      <Section title="What to do when you feel overwhelmed">
        <ol>
          <li>Press <b>Brain in hand</b>.</li>
          <li>Set the traffic light honestly (especially if red).</li>
          <li>Pick one <b>coping method</b> and do it now.</li>
          <li>Only choose <b>one</b> small task from “To do today”.</li>
          <li>Ignore the rest until you feel steadier.</li>
        </ol>
      </Section>

      <Section title="Weekly review guidance">
        <ul>
          <li><b>This week’s wins:</b> proof you showed up.</li>
          <li><b>What drained me:</b> find repeat offenders.</li>
          <li><b>What helped:</b> identify what actually works.</li>
          <li><b>One tweak:</b> change one thing only.</li>
        </ul>
      </Section>

      <Section title="Backup & restore">
        <p>
          Your data can be backed up from <b>Settings → Backup & Restore</b>.
          Download a JSON backup occasionally (especially before big changes).
        </p>
        <p>
          If anything looks missing, check you’re signed in to the correct account and restore your most recent backup.
        </p>
      </Section>

      <Section title="If something isn’t saving">
        <ol>
          <li>Refresh the page.</li>
          <li>Check you’re signed in (Settings).</li>
          <li>Try another browser/device.</li>
          <li>Restore from your latest backup file.</li>
        </ol>
      </Section>
    </div>
  );
}
