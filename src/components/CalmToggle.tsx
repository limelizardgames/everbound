"use client";
import { useEffect, useState } from "react";

/** Non-animated mode. Stored per device. */
export function CalmToggle() {
  const [calm, setCalm] = useState(false);
  useEffect(() => {
    try {
      const v = localStorage.getItem("eb-calm") === "1";
      setCalm(v);
      document.documentElement.classList.toggle("calm", v);
    } catch {}
  }, []);
  return (
    <button
      type="button"
      className="text-xs text-parchment/60 underline-offset-4 hover:text-parchment hover:underline"
      aria-pressed={calm}
      onClick={() => {
        const v = !calm;
        setCalm(v);
        document.documentElement.classList.toggle("calm", v);
        try {
          localStorage.setItem("eb-calm", v ? "1" : "0");
        } catch {}
      }}
    >
      {calm ? "Animations: off" : "Animations: on"}
    </button>
  );
}
