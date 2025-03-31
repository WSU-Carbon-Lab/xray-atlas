import React, { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
} from "recharts";
import type { DataSet } from "~/server/db";

// Seaborn-style diverging color palette generator
const seabornDivergingPalette = (n: number) => {
  // Fixed set of visually distinct colors inspired by Seaborn's default palette
  const baseColors = [
    "#4C72B0", // blue
    "#DD8452", // orange
    "#55A868", // green
    "#C44E52", // red
    "#8172B3", // purple
    "#937860", // brown
    "#DA8BC3", // pink
    "#8C8C8C", // gray
    "#CCB974", // khaki
    "#64B5CD", // light blue
  ];

  // If we need more colors than in our base set, interpolate between them
  if (n <= baseColors.length) {
    return baseColors.slice(0, n);
  }

  // For more colors, cycle through the base colors
  return Array.from({ length: n }, (_, i) => baseColors[i % baseColors.length]);
};

// Helper function to get Y axis domain
const getYAxisDomain = (
  data: any[],
  from: number,
  to: number,
  offset: number = 0.1,
): [number, number] => {
  const filteredData = data.filter((d) => d.energy >= from && d.energy <= to);

  if (filteredData.length === 0) return [0, 1];

  let min = Infinity;
  let max = -Infinity;

  filteredData.forEach((d) => {
    // Check all series values
    Object.keys(d).forEach((key) => {
      if (key.startsWith("series_") && !isNaN(d[key])) {
        if (d[key] < min) min = d[key];
        if (d[key] > max) max = d[key];
      }
    });
  });

  // Apply offset as percentage
  const range = max - min;
  return [Math.max(0, min - range * offset), max + range * offset];
};

export const NexafsPlot = ({ data }: { data: DataSet }) => {
  if (!data.dataset[0]?.energy?.signal?.length) {
    return <div className="p-4 text-gray-500">No data available</div>;
  }

  // State for zoom functionality
  const [left, setLeft] = useState<number | string>("dataMin");
  const [right, setRight] = useState<number | string>("dataMax");
  const [refAreaLeft, setRefAreaLeft] = useState<number | string>("");
  const [refAreaRight, setRefAreaRight] = useState<number | string>("");
  const [bottom, setBottom] = useState<number | string>("dataMin");
  const [top, setTop] = useState<number | string>("dataMax");

  // Generate consistent color palette based on number of series
  const colorPalette = seabornDivergingPalette(data.dataset.length);

  // Calculate smart ticks for XAxis
  const minEnergy = Math.floor(data.dataset[0].energy.signal[0] ?? 0);
  const maxEnergy = Math.ceil(data.dataset[0].energy.signal.slice(-1)[0] ?? 0);
  const xTicks = Array.from(
    { length: maxEnergy - minEnergy + 1 },
    (_, i) => minEnergy + i,
  );

  // Format data for Recharts
  const chartData = data.dataset[0].energy.signal.map((e, i) => ({
    energy: Number(e.toFixed(2)),
    ...Object.fromEntries(
      data.dataset.map((ds, idx) => [
        `series_${idx}`,
        ds.intensity?.signal?.[i] !== undefined
          ? ds.intensity.signal[i] < 0
            ? NaN
            : ds.intensity.signal[i]
          : 0,
      ]),
    ),
  }));

  // Zoom functionality
  const zoom = () => {
    if (refAreaLeft === refAreaRight || refAreaRight === "") {
      setRefAreaLeft("");
      setRefAreaRight("");
      return;
    }

    // Ensure left < right
    let leftValue = Number(refAreaLeft);
    let rightValue = Number(refAreaRight);
    if (leftValue > rightValue) {
      [leftValue, rightValue] = [rightValue, leftValue];
    }

    // Get Y domain based on visible data
    const [yMin, yMax] = getYAxisDomain(chartData, leftValue, rightValue);

    // Update the state to zoom
    setLeft(leftValue);
    setRight(rightValue);
    setBottom(yMin);
    setTop(yMax);
    setRefAreaLeft("");
    setRefAreaRight("");
  };

  // Reset zoom
  const zoomOut = () => {
    setLeft("dataMin");
    setRight("dataMax");
    setBottom("dataMin");
    setTop("dataMax");
    setRefAreaLeft("");
    setRefAreaRight("");
  };

  return (
    <div className="h-[500px] w-full">
      <button
        className="mb-2 rounded-md bg-gray-200 px-4 py-2 transition-colors hover:bg-gray-300"
        onClick={zoomOut}
      >
        Zoom Out
      </button>

      <ResponsiveContainer width="100%" height="90%">
        <LineChart
          data={chartData}
          margin={{ top: 25, right: 35, left: 45, bottom: 35 }}
          onMouseDown={(e) => e?.activeLabel && setRefAreaLeft(e.activeLabel)}
          onMouseMove={(e) =>
            refAreaLeft && e?.activeLabel && setRefAreaRight(e.activeLabel)
          }
          onMouseUp={zoom}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />

          <XAxis
            dataKey="energy"
            type="number"
            domain={[left, right]}
            allowDataOverflow
            ticks={xTicks}
            tickFormatter={(value: number) => value.toFixed(1)}
            tick={{
              fontSize: 11,
              fill: "#555",
              strokeWidth: 0.5,
            }}
            label={{
              value: "Energy [eV]",
              position: "bottom",
              fontSize: 12,
              fill: "#333",
              offset: 15,
            }}
          />

          <YAxis
            allowDataOverflow
            domain={[bottom, top]}
            tick={{
              fontSize: 11,
              fill: "#555",
              strokeWidth: 0.5,
            }}
            label={{
              value: "Absorption [arb. units]",
              angle: -90,
              position: "left",
              fontSize: 12,
              fill: "#333",
            }}
            width={80}
            tickFormatter={(value: number) => value.toFixed(2)}
          />

          <Tooltip
            contentStyle={{
              background: "#fff",
              border: "1px solid #ddd",
              borderRadius: "4px",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            }}
            formatter={(value: number, name: string) => {
              if (isNaN(value)) return ["-"];
              const index = parseInt(name.split("_")[1] ?? "0");
              return [
                `${value.toFixed(3)} (θ=${data.dataset[index]?.geometry?.e_field_polar ?? 0}°, φ=${data.dataset[index]?.geometry?.e_field_azimuth ?? 0}°)`,
              ];
            }}
          />

          {data.dataset.map((ds, index) => (
            <Line
              key={index}
              dataKey={`series_${index}`}
              type="monotone"
              stroke={colorPalette[index % colorPalette.length]}
              strokeWidth={1.5}
              dot={false}
              activeDot={{
                r: 4,
                fill: colorPalette[index % colorPalette.length],
                strokeWidth: 0,
              }}
              name={`series_${index}`}
              isAnimationActive={false}
            />
          ))}

          {refAreaLeft && refAreaRight ? (
            <ReferenceArea
              x1={refAreaLeft}
              x2={refAreaRight}
              strokeOpacity={0.3}
              fill="#8884d8"
              fillOpacity={0.3}
            />
          ) : null}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
