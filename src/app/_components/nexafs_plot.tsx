import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import type { DataSet } from "~/server/db";

const getColor = (index: number) => {
  const colors = [
    "#BFDCFF",
    "#E4DCFF",
    "#EFC9FC",
    "#EE9FE0",
    "#F66DCD",
    "#F66D81",
    "#F65268",
    "#F65268",
    "#F68B68",
    "#E8BB51",
    "#E8BB51",
    "#E8E156",
  ];
  const oddIndices = colors.filter((_, i) => i % 2 !== 0);
  const evenIndices = colors.filter((_, i) => i % 2 === 0);
  return index < oddIndices.length
    ? oddIndices[index]
    : evenIndices[index - oddIndices.length];
};

export const NexafsPlot = ({ data }: { data: DataSet }) => {
  if (!data.dataset[0]) return <span>No data available</span>;

  return (
    <LineChart
      width={900}
      height={600}
      data={data.dataset[0].energy.signal.map((e, i) => ({
        energy: e,
        ...data.dataset.reduce(
          (acc, ds) => {
            const pol = ds.geometry.e_field_polar;
            const azi = ds.geometry.e_field_azimuth;
            acc[`θ${pol}, φ${azi}`] = ds.intensity.signal[i] ?? 0;
            return acc;
          },
          {} as Record<string, number>,
        ),
      }))}
      margin={{ top: 5, right: 35, left: 20, bottom: 35 }}
    >
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis
        dataKey="energy"
        tickFormatter={(tick: number) => tick.toFixed(1)}
        label={{
          value: "Energy",
          position: "insideBottom",
          offset: -10,
        }}
      />
      <YAxis
        domain={[0, "dataMax"]}
        tickFormatter={(tick: number) => tick.toFixed(1)}
        label={{
          value: "Intensity",
          angle: -90,
          position: "insideLeft",
          offset: 10,
        }}
      />
      <Tooltip />
      {data.dataset.map((ds, index) => (
        <Line
          key={index}
          type="monotone"
          dataKey={`θ${ds.geometry.e_field_polar}, φ${ds.geometry.e_field_azimuth}`}
          stroke={getColor(index)}
          strokeWidth={4}
          dot={false}
        />
      ))}
    </LineChart>
  );
};
