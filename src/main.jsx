import { registerSW } from "virtual:pwa-register";

import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App/App.jsx";
registerSW({ immediate: true });

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);