import React, { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { Box, Chip, IconButton, Stack, Typography } from "@mui/material";
import PlayCircleOutlineRoundedIcon from "@mui/icons-material/PlayCircleOutlineRounded";
import PauseCircleOutlineRoundedIcon from "@mui/icons-material/PauseCircleOutlineRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";

const axisColor = "#64748b";
const gridColor = "#d6dee9";
const panelBg = "#f8fbff";
const panelBorder = "#d1dbe8";
const chartTitleColor = "#0f172a";
const qBallActionLabels = ["Shoot", "Pass 1", "Pass 2", "Pass 3", "Pass 4", "Pass 5"];

const TimelineChart = ({
  values,
  width,
  height,
  currentStep,
  setCurrentStep,
  isHovering,
  hoverIndex,
  onChartMouseDown,
  onChartMouseMove,
  onChartMouseUp,
  onChartMouseLeave,
}) => {
  const ref = useRef(null);
  const markerXRef = useRef(null);
  const markerYRef = useRef(null);

  useEffect(() => {
    if (!ref.current || !values.length) return;

    const margin = { top: 24, right: 14, bottom: 28, left: 46 };
    const svg = d3.select(ref.current);
    svg.selectAll("*").remove();

    const x = d3.scaleLinear().domain([0, values.length - 1]).range([margin.left, width - margin.right]);
    const yExtent = d3.extent(values);
    const y = d3
      .scaleLinear()
      .domain([yExtent[0] ?? 0, yExtent[1] ?? 1])
      .nice()
      .range([height - margin.bottom, margin.top]);

    const g = svg.append("g");
    const defs = svg.append("defs");

    defs
      .append("linearGradient")
      .attr("id", "timeline-line-gradient")
      .attr("x1", "0%")
      .attr("x2", "100%")
      .attr("y1", "0%")
      .attr("y2", "0%")
      .selectAll("stop")
      .data([
        { offset: "0%", color: "#0f4c81" },
        { offset: "100%", color: "#1d8ccf" },
      ])
      .join("stop")
      .attr("offset", (d) => d.offset)
      .attr("stop-color", (d) => d.color);

    defs
      .append("linearGradient")
      .attr("id", "timeline-area-gradient")
      .attr("x1", "0%")
      .attr("x2", "0%")
      .attr("y1", "0%")
      .attr("y2", "100%")
      .selectAll("stop")
      .data([
        { offset: "0%", color: "#93c5fd", opacity: 0.38 },
        { offset: "100%", color: "#ffffff", opacity: 0.04 },
      ])
      .join("stop")
      .attr("offset", (d) => d.offset)
      .attr("stop-color", (d) => d.color)
      .attr("stop-opacity", (d) => d.opacity);

    g.append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x).ticks(6).tickFormat((d) => Math.round(d)))
      .call((axis) => axis.selectAll("text").attr("fill", axisColor).style("font-size", "11px"))
      .call((axis) => axis.selectAll("line,path").attr("stroke", axisColor));

    g.append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).ticks(5))
      .call((axis) => axis.selectAll("text").attr("fill", axisColor).style("font-size", "11px"))
      .call((axis) => axis.selectAll("line,path").attr("stroke", axisColor));

    g.append("g")
      .attr("class", "grid")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).ticks(5).tickSize(-(width - margin.left - margin.right)).tickFormat(""))
      .call((grid) => grid.selectAll("line").attr("stroke", gridColor).attr("stroke-opacity", 0.55))
      .call((grid) => grid.select("path").remove());

    const line = d3
      .line()
      .x((d, i) => x(i))
      .y((d) => y(d))
      .curve(d3.curveMonotoneX);

    const area = d3
      .area()
      .x((d, i) => x(i))
      .y0(y(y.domain()[0]))
      .y1((d) => y(d))
      .curve(d3.curveMonotoneX);

    g.append("path")
      .datum(values)
      .attr("fill", "url(#timeline-area-gradient)")
      .attr("d", area);

    g.append("path")
      .datum(values)
      .attr("fill", "none")
      .attr("stroke", "url(#timeline-line-gradient)")
      .attr("stroke-linecap", "round")
      .attr("stroke-width", 2.8)
      .attr("d", line);

    const markerIndex = isHovering && hoverIndex !== null ? hoverIndex : currentStep;
    const clampedIndex = Math.max(0, Math.min(values.length - 1, markerIndex));
    const markerX = x(clampedIndex);
    const markerY = y(values[clampedIndex]);

    const startMarkerX = markerXRef.current ?? markerX;
    const markerLine = g
      .append("line")
      .attr("x1", startMarkerX)
      .attr("x2", startMarkerX)
      .attr("y1", margin.top)
      .attr("y2", height - margin.bottom)
      .attr("stroke", isHovering ? "#e76f51" : "#f59e0b")
      .attr("stroke-width", 1.8)
      .attr("stroke-dasharray", "5,4");

    markerLine
      .transition()
      .duration(160)
      .ease(d3.easeLinear)
      .attr("x1", markerX)
      .attr("x2", markerX);

    const startMarkerY = markerYRef.current ?? markerY;
    const markerCircle = g
      .append("circle")
      .attr("cx", startMarkerX)
      .attr("cy", startMarkerY)
      .attr("r", 4.5)
      .attr("fill", "#ffffff")
      .attr("stroke", isHovering ? "#e76f51" : "#0f4c81")
      .attr("stroke-width", 2);

    markerCircle
      .transition()
      .duration(160)
      .ease(d3.easeLinear)
      .attr("cx", markerX)
      .attr("cy", markerY);

    markerXRef.current = markerX;
    markerYRef.current = markerY;

    g.append("text")
      .attr("x", margin.left)
      .attr("y", 16)
      .attr("fill", chartTitleColor)
      .style("font-size", "12px")
      .style("font-weight", 700)
      .text("EPV Value");

    g.append("rect")
      .attr("x", margin.left)
      .attr("y", margin.top)
      .attr("width", width - margin.left - margin.right)
      .attr("height", height - margin.top - margin.bottom)
      .attr("fill", "transparent")
      .style("cursor", "pointer")
      .on("mousedown", (event) => onChartMouseDown(event, x, margin, values.length))
      .on("mousemove", (event) => onChartMouseMove(event, x, margin, values.length))
      .on("mouseup", onChartMouseUp)
      .on("mouseleave", onChartMouseLeave);
  }, [
    values,
    width,
    height,
    currentStep,
    setCurrentStep,
    isHovering,
    hoverIndex,
    onChartMouseDown,
    onChartMouseMove,
    onChartMouseUp,
    onChartMouseLeave,
  ]);

  return <svg ref={ref} width={width} height={height} style={{ display: "block" }} />;
};

const BarChart = ({
  title,
  data,
  width,
  height,
  labels,
  valueDigits = 2,
  positiveColor,
  negativeColor,
  neutralColor = "#f1f5f9",
}) => {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current || !data?.length) return;

    const margin = { top: 24, right: 14, bottom: 36, left: 42 };
    const svg = d3.select(ref.current);
    svg.selectAll("*").remove();

    const extent = d3.extent(data);
    const maxAbs = Math.max(Math.abs(extent[0] ?? 0), Math.abs(extent[1] ?? 0), 0.05);
    const y = d3
      .scaleLinear()
      .domain([-maxAbs, maxAbs])
      .nice()
      .range([height - margin.bottom, margin.top]);

    const divergingInterpolator = d3.piecewise(d3.interpolateRgb, [
      negativeColor,
      neutralColor,
      positiveColor,
    ]);
    const colorScale = d3.scaleDiverging(divergingInterpolator).domain([-maxAbs, 0, maxAbs]);

    const x = d3
      .scaleBand()
      .domain(data.map((_, i) => `${i}`))
      .range([margin.left, width - margin.right])
      .padding(0.22);

    const g = svg.append("g");
    g.append("g")
      .attr("class", "grid")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).ticks(4).tickSize(-(width - margin.left - margin.right)).tickFormat(""))
      .call((grid) => grid.selectAll("line").attr("stroke", gridColor).attr("stroke-opacity", 0.42))
      .call((grid) => grid.select("path").remove());

    g.append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(
        d3
          .axisBottom(x)
          .tickFormat((d, i) => labels?.[i] ?? d),
      )
      .call((axis) => axis.selectAll("text").attr("fill", axisColor).style("font-size", "10px"))
      .call((axis) => axis.selectAll("line,path").attr("stroke", axisColor));

    g.append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).ticks(4))
      .call((axis) => axis.selectAll("text").attr("fill", axisColor).style("font-size", "10px"))
      .call((axis) => axis.selectAll("line,path").attr("stroke", axisColor));

    g.append("line")
      .attr("x1", margin.left)
      .attr("x2", width - margin.right)
      .attr("y1", y(0))
      .attr("y2", y(0))
      .attr("stroke", "#1f2937")
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", 1.2);

    g.selectAll("rect.bar")
      .data(data)
      .join("rect")
      .attr("class", "bar")
      .attr("x", (_, i) => x(`${i}`))
      .attr("y", (d) => (d >= 0 ? y(d) : y(0)))
      .attr("width", x.bandwidth())
      .attr("height", (d) => Math.max(1, Math.abs(y(d) - y(0))))
      .attr("rx", 3.5)
      .attr("fill", (d) => colorScale(d))
      .attr("opacity", 0.92);

    g.selectAll("text.value")
      .data(data)
      .join("text")
      .attr("class", "value")
      .attr("x", (_, i) => (x(`${i}`) ?? 0) + x.bandwidth() / 2)
      .attr("y", (d) => (d >= 0 ? y(d) - 4 : y(d) + 12))
      .attr("text-anchor", "middle")
      .attr("fill", "#334155")
      .style("font-size", "9px")
      .text((d) => d.toFixed(valueDigits));

    g.append("text")
      .attr("x", margin.left)
      .attr("y", 16)
      .attr("fill", chartTitleColor)
      .style("font-size", "12px")
      .style("font-weight", 700)
      .text(title);
  }, [title, data, width, height, labels, valueDigits, positiveColor, negativeColor, neutralColor]);

  return <svg ref={ref} width={width} height={height} style={{ display: "block" }} />;
};

const ValueChart = ({
  values,
  width = 520,
  currentStep = 0,
  setCurrentStep,
  isPlaying = false,
  setIsPlaying,
  totalFrames = 0,
  qBall,
  contributionData,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [hoverIndex, setHoverIndex] = useState(null);

  useEffect(() => {
    const onKeyDown = (event) => {
      const isSpace = event.code === "Space" || event.key === " ";
      if (!isSpace || event.repeat || !setIsPlaying) return;

      const target = event.target;
      if (target instanceof HTMLElement) {
        const tag = target.tagName;
        if (
          target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(tag) ||
          target.closest('[role="combobox"], [role="listbox"], [role="option"]')
        ) {
          return;
        }
      }

      event.preventDefault();
      setIsPlaying((prev) => !prev);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setIsPlaying]);

  const cleanValues = useMemo(() => {
    if (!values?.length) return [];
    return values.map((d) => (Array.isArray(d) ? d[0] : d)).filter((d) => Number.isFinite(d));
  }, [values]);

  const currentQBall = useMemo(() => qBall?.[currentStep] ?? [], [qBall, currentStep]);
  const currentContribution = useMemo(
    () => contributionData?.[currentStep] ?? [],
    [contributionData, currentStep],
  );

  const syncFrameFromPointer = (event, xScale, margin, length) => {
    if (!setCurrentStep || !length) return;
    const [px] = d3.pointer(event);
    const minX = margin.left;
    const maxX = width - margin.right;
    const clampedX = Math.max(minX, Math.min(maxX, px));
    const index = Math.round(xScale.invert(clampedX));
    const clampedIndex = Math.max(0, Math.min(length - 1, index));
    setHoverIndex(clampedIndex);
    setCurrentStep(clampedIndex);
  };

  const handleChartMouseDown = (event, xScale, margin, length) => {
    setIsDragging(true);
    setIsHovering(true);
    syncFrameFromPointer(event, xScale, margin, length);
  };

  const handleChartMouseMove = (event, xScale, margin, length) => {
    if (!isDragging) return;
    setIsHovering(true);
    syncFrameFromPointer(event, xScale, margin, length);
  };

  const handleChartMouseUp = () => {
    setIsDragging(false);
    setIsHovering(false);
    setHoverIndex(null);
  };

  const handleChartMouseLeave = () => {
    setIsDragging(false);
    setIsHovering(false);
    setHoverIndex(null);
  };

  const handlePlayPause = () => setIsPlaying?.(!isPlaying);

  const handleRestart = () => {
    setIsPlaying?.(false);
    setCurrentStep?.(0);
    setTimeout(() => setIsPlaying?.(true), 120);
  };

  if (!cleanValues.length) {
    return (
      <Box
        sx={{
          border: `1px solid ${panelBorder}`,
          borderRadius: 2,
          p: 2,
          bgcolor: panelBg,
          color: "text.secondary",
        }}
      >
        Value loading...
      </Box>
    );
  }

  return (
    <Stack spacing={1.5}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{
          px: 1,
          py: 0.5,
          border: `1px solid ${panelBorder}`,
          borderRadius: 2,
          bgcolor: "#ffffff",
          boxShadow: "0 6px 20px rgba(15, 23, 42, 0.05)",
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <IconButton onClick={handlePlayPause} color="primary" size="large" aria-label="play-pause">
            {isPlaying ? (
              <PauseCircleOutlineRoundedIcon fontSize="large" />
            ) : (
              <PlayCircleOutlineRoundedIcon fontSize="large" />
            )}
          </IconButton>
          <IconButton onClick={handleRestart} color="primary" size="large" aria-label="restart">
            <RestartAltRoundedIcon fontSize="large" />
          </IconButton>
        </Stack>

        <Chip
          size="small"
          color="primary"
          variant="outlined"
          label={`Frame ${Math.min(currentStep + 1, totalFrames)}/${totalFrames}`}
          sx={{ fontWeight: 700, bgcolor: "#f8fbff" }}
        />
      </Stack>

      <Box
        sx={{
          border: `1px solid ${panelBorder}`,
          borderRadius: 2,
          bgcolor: panelBg,
          boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
          overflowX: "auto",
        }}
      >
        <TimelineChart
          values={cleanValues}
          width={width}
          height={220}
          currentStep={currentStep}
          setCurrentStep={setCurrentStep}
          isHovering={isHovering}
          hoverIndex={hoverIndex}
          onChartMouseDown={handleChartMouseDown}
          onChartMouseMove={handleChartMouseMove}
          onChartMouseUp={handleChartMouseUp}
          onChartMouseLeave={handleChartMouseLeave}
        />
      </Box>

      <Box
        sx={{
          border: `1px solid ${panelBorder}`,
          borderRadius: 2,
          bgcolor: panelBg,
          boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
          overflowX: "auto",
        }}
      >
        <BarChart
          title="Q_ball"
          data={currentQBall}
          width={width}
          height={210}
          labels={currentQBall.map((_, i) => qBallActionLabels[i] ?? `Pass ${i}`)}
          positiveColor="#0f766e"
          negativeColor="#be123c"
          valueDigits={2}
        />
      </Box>

      <Box
        sx={{
          border: `1px solid ${panelBorder}`,
          borderRadius: 2,
          bgcolor: panelBg,
          boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
          overflowX: "auto",
        }}
      >
        <BarChart
          title={`EPV Contribution (Frame ${currentStep + 1})`}
          data={currentContribution}
          width={width}
          height={200}
          labels={currentContribution.map((_, i) => {
            if (i === currentContribution.length - 1) return "Defense";
            return i === 0 ? "Ball" : `P${i}`;
          })}
          positiveColor="#2563eb"
          negativeColor="#e11d48"
          valueDigits={3}
        />
      </Box>
    </Stack>
  );
};

export default ValueChart;
