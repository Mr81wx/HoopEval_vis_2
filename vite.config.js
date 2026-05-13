import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  base: "/HoopEval_vis_2/",
  plugins: [react()],
});
