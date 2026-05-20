import type {Meta, StoryObj} from '@storybook/react';
import {LineChart} from './LineChart';
import {LINE_MARKER_SHAPE_ORDER, type LineMarkerShape} from './markers';

const meta: Meta<typeof LineChart> = {
	title: 'Charts/LineChart',
	component: LineChart,
	tags: ['autodocs'],
	argTypes: {
		scheme: {
			control: {type: 'inline-radio'},
			options: ['blue', 'categorical'],
		},
		legend: {
			control: {type: 'inline-radio'},
			options: ['list', 'table', 'none'],
		},
	},
	args: {
		title: 'Value per year',
		animated: true,
		scheme: 'blue',
		legend: 'list',
		width: 640,
		height: 320,
	},
};

export default meta;
type Story = StoryObj<typeof LineChart>;

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const sample = [
	{
		label: '2014',
		values: [15, 50, 65, 140, 142, 120, 200, 322, 256, 282, 326, 365],
	},
	{
		label: '2015',
		values: [115, 80, 170, 235, 168, 287, 240, 285, 110, 188, 222, 184],
	},
	{
		label: '2016',
		values: [75, 175, 142, 188, 261, 220, 282, 230, 145, 156, 117, 38],
	},
	{
		label: '2017',
		values: [87, 130, 200, 175, 210, 343, 270, 260, 188, 145, 160, 220],
	},
];

export const Default: Story = {
	args: {series: sample, categories: months},
	parameters: {
		docs: {
			description: {
				story:
					'Four series in the default blue mode. Each series cycles to the next marker shape + dash pattern from the 9-by-9 matrix so the lines stay distinguishable without colour. The first non-null value of each series anchors the legend on the right; the latest value is shown next to the label.',
			},
		},
	},
};

export const Categorical: Story = {
	args: {series: sample, categories: months, scheme: 'categorical'},
	parameters: {
		docs: {
			description: {
				story:
					'`scheme="categorical"` pulls per-series hues from `getAccessibleSeries(n)` — the same accessible chart palette PieChart and BarChart use. Dash + shape still cycle so the chart stays usable when colour collapses (monochrome printing, low-vision filters).',
			},
		},
	},
};

export const SingleSeries: Story = {
	args: {
		series: [
			{
				label: 'Revenue',
				values: [40, 55, 48, 70, 82, 78, 96, 110, 105, 124, 132, 140],
			},
		],
		categories: months,
		title: 'Monthly revenue (€k)',
		legend: 'none',
	},
	parameters: {
		docs: {
			description: {
				story:
					'A single-series chart with `legend="none"` — common on dashboards where the chart title already names the metric. The marker shape and dash pattern stay at index 0 of the cycle (circle + finest dotted).',
			},
		},
	},
};

export const NineSeries: Story = {
	args: {
		series: LINE_MARKER_SHAPE_ORDER.map((shape: LineMarkerShape, i: number) => ({
			label: `S${i + 1} · ${shape}`,
			values: months.map(
				(_, m) =>
					100 +
					Math.round(
						50 * Math.sin((m + i) * 0.5) +
							20 * Math.cos(i + m * 0.3) +
							i * 20
					)
			),
			markerShape: shape,
		})),
		categories: months,
		scheme: 'categorical',
		title: '9 marker shapes × 9 dash patterns',
		legend: 'list',
		height: 360,
	},
	parameters: {
		docs: {
			description: {
				story:
					'Each of the 9 marker shapes paired with the matching dash pattern from the reference matrix. Hover the legend or focus a point with `Tab` to see how the focus halo follows the shape.',
			},
		},
	},
};

export const LegendTable: Story = {
	args: {series: sample, categories: months, legend: 'table'},
	parameters: {
		docs: {
			description: {
				story:
					'`legend="table"` renders a Google-Analytics-style detail table BELOW the chart: rank, marker, series, total and average across the categories. Real semantic `<table>` with `<th scope="col">` headers and `<th scope="row">` on the series name; the per-datum sr-only summary is suppressed in this mode.',
			},
		},
	},
};

export const WithGaps: Story = {
	args: {
		series: [
			{
				label: 'Sensor A',
				values: [12, 18, null, 22, 30, 28, null, null, 40, 38, 45, 52],
			},
			{
				label: 'Sensor B',
				values: [20, 16, 24, 28, null, 26, 30, 34, null, 36, 40, 44],
			},
		],
		categories: months,
		title: 'Telemetry — daily averages',
	},
	parameters: {
		docs: {
			description: {
				story:
					'`null` values break the line — the polyline restarts at the next defined point and the missing markers are skipped from the focus ring and tooltip. Useful for sensor data with dropouts or partial series.',
			},
		},
	},
};

export const ReducedMotion: Story = {
	args: {series: sample, categories: months},
	globals: {reducedMotion: true},
	parameters: {
		docs: {
			description: {
				story:
					'`reducedMotion` global toggle on — both the line fade-in and the marker scale-in are suppressed via the same `c-prefers-reduced-motion` body-class CSS rule the other charts use.',
			},
		},
	},
};

export const KeyboardNavigation: Story = {
	args: {series: sample, categories: months},
	parameters: {
		docs: {
			description: {
				story:
					'Tab into the chart, then use ←/→ to move within a series, ↑/↓ to move between series, and Home/End to jump to the first / last category. Each data point announces `{series}, {category}: {value}`.',
			},
		},
	},
};
