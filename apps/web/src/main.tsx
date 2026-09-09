import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";

import { App } from "./app/App";
import { AuthProvider } from "./features/auth/AuthProvider";
import { MaintenanceProvider } from "./features/maintenance/MaintenanceProvider";
import { createAppQueryClient } from "./shared/api/queryClient";
import "./styles.css";

const queryClient = createAppQueryClient();

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js");
  });
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MaintenanceProvider>
          <App />
        </MaintenanceProvider>
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
