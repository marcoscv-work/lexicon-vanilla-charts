import type {Meta, StoryObj} from '@storybook/react';
import {BarChart} from './BarChart';

const meta: Meta<typeof BarChart> = {
	title: 'Charts/BarChart',
	component: BarChart,
	tags: ['autodocs'],
	argTypes: {
		scheme: {
			control: {type: 'inline-radio'},
			options: ['blue', 'categorical'],
		},
		orientation: {
			control: {type: 'inline-radio'},
			options: ['vertical', 'horizontal'],
		},
		legend: {
			control: {type: 'inline-radio'},
			options: ['list', 'table', 'none'],
		},
	},
	args: {
		title: 'Quarterly revenue (€k)',
		animated: true,
		scheme: 'blue',
		legend: 'none',
	},
};

export default meta;
type Story = StoryObj<typeof BarChart>;

const sample = [
	{label: 'Q1', value: 42},
	{label: 'Q2', value: 68},
	{label: 'Q3', value: 51},
	{label: 'Q4', value: 90},
];

export const Vertical: Story = {
	args: {
		data: sample,
		orientation: 'vertical',
	},
};

export const Horizontal: Story = {
	args: {
		data: sample,
		orientation: 'horizontal',
		width: 480,
		height: 240,
	},
};

export const ManyBars: Story = {
	args: {
		data: Array.from({length: 12}, (_, i) => ({
			label: `M${i + 1}`,
			value: Math.round(20 + Math.random() * 80),
		})),
		orientation: 'vertical',
		width: 640,
		height: 280,
	},
};

export const Categorical: Story = {
	args: {
		data: sample,
		scheme: 'categorical',
		orientation: 'vertical',
	},
	parameters: {
		docs: {
			description: {
				story:
					'`scheme="categorical"` colours each bar with a distinct hue from the Clay chart palette (the same accessible series PieChart uses for slices). Useful when the categories are not already labelled or the chart needs to double as a legend.',
			},
		},
	},
};

export const CategoricalManyBars: Story = {
	args: {
		data: Array.from({length: 20}, (_, i) => ({
			label: `S${i + 1}`,
			value: Math.round(20 + Math.random() * 80),
		})),
		scheme: 'categorical',
		orientation: 'vertical',
		width: 880,
		height: 280,
		title: '20 series',
	},
	parameters: {
		docs: {
			description: {
				story:
					'`getAccessibleSeries(n)` cycles the 10 base hues first and then 10 darker (`-d2`) siblings from `CHART_EXTENDED_PALETTE` — so charts with up to 20 series get a distinct colour per bar. From slot 21 onwards the rotation wraps.',
			},
		},
	},
};

export const CategoricalHorizontal: Story = {
	args: {
		data: sample,
		scheme: 'categorical',
		orientation: 'horizontal',
		width: 480,
		height: 240,
	},
	parameters: {
		docs: {
			description: {
				story:
					'Same categorical scheme, horizontal orientation. The bar fill is set via the `--cui-bar-fill` custom property, so the active-state brightness filter keeps the bar\'s hue instead of flattening it to `--primary`.',
			},
		},
	},
};

export const LegendTable: Story = {
	args: {
		data: [
			{label: 'Q1', value: 42},
			{label: 'Q2', value: 68},
			{label: 'Q3', value: 51},
			{label: 'Q4', value: 90},
		],
		scheme: 'categorical',
		legend: 'table',
		orientation: 'vertical',
	},
	parameters: {
		docs: {
			description: {
				story:
					'`legend="table"` renders a Google-Analytics-style detail table BELOW the bars: rank, swatch, label, value and share of total. Real semantic `<table>`; the per-datum sr-only summary is suppressed in this mode. Default is `legend="none"` because axis labels already name each bar.',
			},
		},
	},
};

export const LegendList: Story = {
	args: {
		data: [
			{label: 'Q1', value: 42},
			{label: 'Q2', value: 68},
			{label: 'Q3', value: 51},
			{label: 'Q4', value: 90},
		],
		scheme: 'categorical',
		legend: 'list',
		orientation: 'vertical',
	},
	parameters: {
		docs: {
			description: {
				story:
					'`legend="list"` renders the compact swatch/label/% grid below the chart, matching PieChart\'s default legend. Useful when paired with `scheme="categorical"` so the swatches surface the per-bar hue mapping.',
			},
		},
	},
};

export const ReducedMotion: Story = {
	args: {data: sample, animated: true},
	globals: {reducedMotion: true},
	parameters: {
		docs: {
			description: {
				story:
					'This story flips the global `reducedMotion` toggle on, which adds `c-prefers-reduced-motion` to `<body>`. The bar reveal animation and value-callout transitions are suppressed at the CSS level via the same body-class rule the React hook reacts to.',
			},
		},
	},
};
