import React, { useEffect, useMemo, useState } from "react";
import "./App.css";
import {
  alpha,
  Box,
  Card,
  CardContent,
  Chip,
  CssBaseline,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  ThemeProvider,
  Tooltip,
  Typography,
  createTheme,
} from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SportsBasketballRoundedIcon from "@mui/icons-material/SportsBasketballRounded";
import ShowChartRoundedIcon from "@mui/icons-material/ShowChartRounded";
import ViewInArRoundedIcon from "@mui/icons-material/ViewInArRounded";
import { DrawPlayers } from "./components/DrawPlayers";
import ValueChart from "./components/ValueChart";
import { dataFiles } from "virtual:hoopeval-data-files";

const dashboardTheme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#0f4c81" },
    secondary: { main: "#e76f51" },
    background: { default: "#f4f7fb", paper: "#ffffff" },
  },
  shape: { borderRadius: 14 },
  typography: {
    fontFamily: '"Space Grotesk", "Manrope", "Segoe UI", sans-serif',
    h4: { fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.1 },
    h6: { fontWeight: 650 },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          border: "1px solid rgba(15, 76, 129, 0.12)",
          boxShadow: "0 10px 30px rgba(11, 31, 53, 0.08)",
        },
      },
    },
  },
});

const ActionLegend = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <Paper
      elevation={0}
      sx={{
        position: "fixed",
        top: { xs: 16, md: 24 },
        right: { xs: 16, md: 24 },
        width: { xs: "calc(100vw - 32px)", sm: 360 },
        p: 2,
        zIndex: 1200,
        border: "1px solid",
        borderColor: "divider",
        boxShadow: "0 12px 35px rgba(0,0,0,0.14)",
        backdropFilter: "blur(8px)",
        bgcolor: alpha("#ffffff", 0.96),
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
        <Typography variant="h6">Player Actions</Typography>
        <IconButton onClick={onClose} size="small" aria-label="close legend">
          <CloseRoundedIcon fontSize="small" />
        </IconButton>
      </Stack>
      <Typography variant="body2" color="text.secondary" mb={1}>
        Colored sectors around each offensive player represent action Q-values.
      </Typography>
      <Stack spacing={0.6}>
        <Typography variant="body2">Center circle: action 0</Typography>
        <Typography variant="body2">Inner ring (clockwise from bottom): actions 1-8</Typography>
        <Typography variant="body2">Middle ring: actions 9-16</Typography>
        <Typography variant="body2">Outer ring: actions 17-24</Typography>
      </Stack>
      <Typography variant="caption" color="text.secondary" mt={1.5} display="block">
        Color: yellow = higher Q, purple = lower Q. Gold border = actual action.
      </Typography>
    </Paper>
  );
};

function scanAvailableFiles() {
  return dataFiles.filter((file) => typeof file === "string" && file.toLowerCase().endsWith(".json"));
}

function buildDataUrl(fileName) {
  return `${import.meta.env.BASE_URL}data/${encodeURIComponent(fileName)}`;
}

function App() {
  const [playerData, setPlayerData] = useState([]);
  const [valueData, setValueData] = useState([]);
  const [qBall, setQBall] = useState([]);
  const [qPlayer, setQPlayer] = useState([]);
  const [realPlayerActions, setRealPlayerActions] = useState([]);
  const [contributionData, setContributionData] = useState([]);

  const [availableFiles, setAvailableFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState("");
  const [isLegendOpen, setIsLegendOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorText, setErrorText] = useState("");

  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const courtWidth = 1420;
  const valueChartWidth = 500;

  const totalFrames = playerData?.[0]?.real_T?.length || 0;

  const clearLoadedData = () => {
    setPlayerData([]);
    setValueData([]);
    setQBall([]);
    setQPlayer([]);
    setRealPlayerActions([]);
    setContributionData([]);
  };

  const loadSelectedFile = async (fileName) => {
    setIsLoading(true);
    setErrorText("");

    try {
      const response = await fetch(buildDataUrl(fileName));
      if (!response.ok) {
        throw new Error(`Unable to load ${fileName}`);
      }

      const data = await response.json();
      const frames = data?.frames || [];
      const playerIds = data?.player_ids || [];

      const players = playerIds.map((playerId, index) => ({
        agent_id: playerId,
        teamID: playerId === -1 ? -1 : index <= 5 ? 1610612737 : 1610612738,
        real_T: frames.map((frame) => frame.xy[index]),
        name: playerId === -1 ? "Ball" : `Player ${playerId}`,
        jersey: playerId === -1 ? "" : `${index}`,
      }));

      setPlayerData(players);
      setValueData(frames.map((frame) => frame?.Value?.[0]));
      setQBall(frames.map((frame) => frame.Q_ball));
      setQPlayer(frames.map((frame) => frame.Q_player));
      setRealPlayerActions(frames.map((frame) => frame.real_player_action));
      setContributionData(
        frames.map((frame, frameIndex) => {
          const qReal = Array.isArray(frame?.Q_real) ? frame.Q_real : [];
          const value = Number(frame?.Value?.[0]);
          if (!Number.isFinite(value)) return [];

          if (frameIndex === frames.length - 1) {
            const ballContribution = Number(qReal[0]) - value;
            const zeroCount = Math.max(0, qReal.length - 1);
            return [Number.isFinite(ballContribution) ? ballContribution : 0, ...Array(zeroCount).fill(0), 0];
          }

          const nextValue = Number(frames[frameIndex + 1]?.Value?.[0]);
          const valueDiff = Number.isFinite(nextValue) ? nextValue - value : 0;

          const baseContribution = qReal.map((q) => {
            const qValue = Number(q);
            return Number.isFinite(qValue) ? qValue - value : 0;
          });

          const sumBaseContribution = baseContribution.reduce((sum, contribution) => sum + contribution, 0);
          const defenseContribution = valueDiff - sumBaseContribution;

          return [...baseContribution, defenseContribution];
        }),
      );
    } catch (error) {
      setErrorText(error.message || "Failed to load game data.");
      clearLoadedData();
    } finally {
      setIsLoading(false);
    }
  };

  const refreshFileList = async () => {
    const files = scanAvailableFiles();
    setAvailableFiles(files);

    if (!files.length) {
      setSelectedFile("");
      setCurrentStep(0);
      setIsPlaying(false);
      setIsLoading(false);
      setErrorText("No JSON files found in public/data.");
      clearLoadedData();
      return;
    }

    if (!files.includes(selectedFile)) {
      setSelectedFile(files[0]);
      setCurrentStep(0);
      setIsPlaying(false);
    }
  };

  useEffect(() => {
    refreshFileList();
  }, []);

  useEffect(() => {
    if (selectedFile) {
      loadSelectedFile(selectedFile);
    }
  }, [selectedFile]);

  const fileLabel = useMemo(() => (selectedFile ? selectedFile.replace(".json", "") : "--"), [selectedFile]);

  const handleFileChange = (event) => {
    setSelectedFile(event.target.value);
    setCurrentStep(0);
    setIsPlaying(false);
  };

  return (
    <ThemeProvider theme={dashboardTheme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: "100vh",
          px: { xs: 1, md: 1.5 },
          py: { xs: 1, md: 1.25 },
          background:
            "radial-gradient(circle at 10% 20%, rgba(15,76,129,0.12), transparent 36%), radial-gradient(circle at 90% 80%, rgba(231,111,81,0.15), transparent 34%), #f4f7fb",
        }}
      >
        <ActionLegend isOpen={isLegendOpen} onClose={() => setIsLegendOpen(false)} />

        <Stack spacing={1.25}>
          <Paper
            elevation={0}
            sx={{
              width: "100%",
              p: { xs: 1.1, md: 1.25 },
              border: "1px solid",
              borderColor: "divider",
              bgcolor: alpha("#ffffff", 0.95),
            }}
          >
            <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={1.25}>
              <Box>
                <Stack direction="row" spacing={1} alignItems="center" mb={0.4}>
                  <SportsBasketballRoundedIcon color="primary" />
                  <Typography variant="h5">HoopEval Visualizer</Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  Track EPV value, Q-ball behavior, and player action quality frame by frame.
                </Typography>
              </Box>

              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2} alignItems={{ sm: "center" }}>
                <FormControl size="small" sx={{ minWidth: 260, bgcolor: "white" }}>
                  <InputLabel id="file-select-label">Data File</InputLabel>
                  <Select
                    labelId="file-select-label"
                    value={selectedFile}
                    label="Data File"
                    onChange={handleFileChange}
                  >
                    {availableFiles.map((file) => (
                      <MenuItem key={file} value={file}>
                        {file.replace(".json", "")}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Tooltip title="Refresh file list">
                  <IconButton
                    color="primary"
                    onClick={refreshFileList}
                    sx={{ border: "1px solid", borderColor: "divider", bgcolor: "white" }}
                    aria-label="refresh files"
                  >
                    <RefreshRoundedIcon />
                  </IconButton>
                </Tooltip>

                <Tooltip title="Show action legend">
                  <IconButton
                    color="primary"
                    onClick={() => setIsLegendOpen((prev) => !prev)}
                    sx={{ border: "1px solid", borderColor: "divider", bgcolor: "white" }}
                    aria-label="toggle legend"
                  >
                    <InfoOutlinedIcon />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Stack>

            <Stack direction="row" spacing={1} mt={1.1} flexWrap="wrap" useFlexGap>
              <Chip size="small" color="primary" label={`Frames: ${totalFrames || "--"}`} />
              <Chip size="small" variant="outlined" label={`Current: ${Math.min(currentStep + 1, totalFrames || 0)}`} />
              <Chip size="small" variant="outlined" label={`File: ${fileLabel}`} />
            </Stack>
          </Paper>

          {isLoading ? (
            <Paper elevation={0} sx={{ p: 4, textAlign: "center", border: "1px solid", borderColor: "divider" }}>
              <Typography variant="h6">Loading game data...</Typography>
            </Paper>
          ) : errorText ? (
            <Paper elevation={0} sx={{ p: 4, textAlign: "center", border: "1px solid", borderColor: "error.light" }}>
              <Typography variant="h6" color="error.main">
                {errorText}
              </Typography>
            </Paper>
          ) : (
            <Box
              sx={{
                display: "grid",
                gap: 1.25,
                gridTemplateColumns: {
                  xs: "1fr",
                  lg: "minmax(500px, 560px) minmax(0, 1fr)",
                },
                alignItems: "start",
              }}
            >
              <Card sx={{ position: { lg: "sticky" }, top: { lg: 16 } }}>
                <CardContent>
                  <Stack direction="row" spacing={1} alignItems="center" mb={1.5}>
                    <ShowChartRoundedIcon color="primary" fontSize="small" />
                    <Typography variant="h6">Analytics Stack</Typography>
                  </Stack>

                  <ValueChart
                    values={valueData}
                    width={valueChartWidth}
                    currentStep={currentStep}
                    setCurrentStep={setCurrentStep}
                    isPlaying={isPlaying}
                    setIsPlaying={setIsPlaying}
                    totalFrames={totalFrames}
                    qBall={qBall}
                    contributionData={contributionData}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <ViewInArRoundedIcon color="secondary" fontSize="small" />
                      <Typography variant="h6">Court Playback</Typography>
                    </Stack>
                    <Chip
                      size="small"
                      color="secondary"
                      label={`Frame ${Math.min(currentStep + 1, totalFrames || 0)}/${totalFrames || 0}`}
                    />
                  </Stack>

                  <Box
                    sx={{
                      p: { xs: 1, md: 1.5 },
                      borderRadius: 2,
                      bgcolor: "#ffffff",
                      border: "1px solid",
                      borderColor: alpha("#0f4c81", 0.14),
                      overflowX: "auto",
                      display: "flex",
                      justifyContent: "center",
                    }}
                  >
                    <DrawPlayers
                      width={courtWidth}
                      playerData={playerData}
                      qPlayer={qPlayer}
                      qBall={qBall}
                      currentStep={currentStep}
                      setCurrentStep={setCurrentStep}
                      isPlaying={isPlaying}
                      setIsPlaying={setIsPlaying}
                      realPlayerActions={realPlayerActions}
                    />
                  </Box>
                </CardContent>
              </Card>
            </Box>
          )}
        </Stack>
      </Box>
    </ThemeProvider>
  );
}

export default App;
