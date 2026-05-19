import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

function hoopEvalDataFilesPlugin() {
  const virtualModuleId = "virtual:hoopeval-data-files";
  const resolvedVirtualModuleId = `\0${virtualModuleId}`;
  const dataDir = path.resolve(__dirname, "public/data");

  const getDataFiles = () => {
    if (!fs.existsSync(dataDir)) {
      return [];
    }

    return fs
      .readdirSync(dataDir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".json"))
      .map((entry) => entry.name)
      .sort((left, right) => left.localeCompare(right));
  };

  return {
    name: "hoopeval-data-files",
    resolveId(id) {
      if (id === virtualModuleId) {
        return resolvedVirtualModuleId;
      }
      return null;
    },
    load(id) {
      if (id !== resolvedVirtualModuleId) {
        return null;
      }

      return `export const dataFiles = ${JSON.stringify(getDataFiles(), null, 2)};`;
    },
    handleHotUpdate({ file, server }) {
      if (!file.startsWith(dataDir)) {
        return;
      }

      const module = server.moduleGraph.getModuleById(resolvedVirtualModuleId);
      if (module) {
        server.moduleGraph.invalidateModule(module);
      }

      server.ws.send({ type: "full-reload" });
      return [];
    },
  };
}

export default defineConfig({
  base: "/HoopEval_vis_2/",
  plugins: [react(), hoopEvalDataFilesPlugin()],
});
