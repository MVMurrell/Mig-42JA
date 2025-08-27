// client/src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css"; 

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);

// 👇 one-time unlock for autoplay
document.addEventListener(
  "pointerdown",
  () => {
    // if you have a central player, call that:
    // player.playCurrent?.();

    // or, if you use a global HTMLAudioElement:
    (window as any).__audio?.play?.().catch(() => {});
  },
  { once: true }
);
