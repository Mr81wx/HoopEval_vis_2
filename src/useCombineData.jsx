import { useMemo } from "react";

const useCombineData = (playerXY, playerIDs, playersCSV, type = "init") => {
  return useMemo(() => {
    // 1. Safety Check
    if (!playerXY || !playerIDs || !playersCSV) return [];

    const idMap = {};
    const rows = playersCSV.trim().split("\n");
    for (let i = 1; i < rows.length; i++) {
      const cols = rows[i].split(",");
      if (cols.length >= 3) {
        const nbaID = parseInt(cols[0].trim());
        const unifiedID = parseInt(cols[2].trim());
        idMap[unifiedID] = nbaID;
      }
    }

    const numFrames = playerXY.length;
    if (numFrames === 0) return [];

    const combinedData = [];

    const getPath = (agentIdx) => {
      const path = [];
      for (let t = 0; t < numFrames; t++) {
        if (playerXY[t] && playerXY[t][agentIdx]) {
          path.push(playerXY[t][agentIdx]); // [x, y]
        }
      }
      return path;
    };

    const ballPath = getPath(0);
    combinedData.push({
      agent_id: -1,
      teamID: -1,
      player_index: 0,
      type: type,
      real_T: ballPath,
      ghost_T: ballPath,
      real_qsq: [],
      ghost_qsq: [],
    });

    playerIDs.forEach((unifiedID, i) => {
      const agentIdx = i + 1;
      const path = getPath(agentIdx);
      const nbaID = idMap[unifiedID] || unifiedID;

      const teamID = i < 5 ? 1610612737 : 1610612738;

      combinedData.push({
        agent_id: nbaID,
        teamID: teamID,
        player_index: agentIdx,
        type: type,
        real_T: path,
        ghost_T: path,
        real_qsq: [],
        ghost_qsq: [],
      });
    });

    return combinedData;
  }, [playerXY, playerIDs, playersCSV, type]);
};

export default useCombineData;
