import { createRoot } from "react-dom/client";
import posthog from "posthog-js";
import App from "./App";
import "./index.css";

posthog.init("phc_MrXV3PCikXZCJDzdE1KlvVc4GYP08BYRL9BNjXZvTyE", {
  api_host: "https://eu.i.posthog.com",
  autocapture: true,
  capture_pageview: true,
  capture_pageleave: true,
  disable_session_recording: false,
  session_recording: {
    maskAllInputs: false,
    recordCrossOriginIframes: true,
  },
});

// Track click position for button ripple effect
document.addEventListener("mousedown", (e) => {
  const btn = (e.target as HTMLElement).closest("button");
  if (btn) {
    const rect = btn.getBoundingClientRect();
    btn.style.setProperty("--ripple-x", `${e.clientX - rect.left}px`);
    btn.style.setProperty("--ripple-y", `${e.clientY - rect.top}px`);
  }
});

createRoot(document.getElementById("root")!).render(<App />);
