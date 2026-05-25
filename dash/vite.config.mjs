import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  // Force a single instance of react-router(-dom) so react-admin's
  // CustomRoutes `child.type === Route` strict-equality check passes.
  // Without this Vite was bundling two copies and the <Route> constants
  // ended up as two distinct references → "X is not a <Route> component".
  resolve: {
    dedupe: ["react", "react-dom", "react-router", "react-router-dom"],
  },
  build: {
    sourcemap: true,
  },
});

