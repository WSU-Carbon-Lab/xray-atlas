import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
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

export const NexafsPlot = ({ data }: { data: DataSet }) => {
  if (!data.dataset[0]?.energy?.signal?.length) {
    return <div className="p-4 text-gray-500">No data available</div>;
  }

  // Generate consistent color palette based on number of series
  const colorPalette = seabornDivergingPalette(data.dataset.length);

  console.log(colorPalette);

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

  return (
    <div className="h-[500px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 25, right: 35, left: 45, bottom: 35 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />

          <XAxis
            dataKey="energy"
            type="number"
            domain={[minEnergy, maxEnergy]}
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
            domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.1)]}
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
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
