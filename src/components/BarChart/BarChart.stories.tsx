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
		size: {
			control: {type: 'inline-radio'},
			options: ['default', 'inline'],
		},
		track: {control: {type: 'boolean'}},
		rounded: {control: {type: 'boolean'}},
	},
	args: {
		title: 'Quarterly revenue (€k)',
		animated: true,
		scheme: 'blue',
		legend: 'none',
		size: 'default',
		track: false,
		rounded: false,
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

export const Inline: Story = {
	args: {
		data: [{label: 'Progress', value: 62}],
		orientation: 'horizontal',
		size: 'inline',
		track: true,
		rounded: true,
		width: 480,
		height: 32,
		title: 'Storage used',
	},
	parameters: {
		docs: {
			description: {
				story:
					'`size="inline"` flattens every bar to 8px regardless of band size. Pair with `track` to draw a `--light-d1` background spanning the full plot length, and `rounded` to pill-cap both. The three props are independent — combine to taste.',
			},
		},
	},
};

export const InlineMultiple: Story = {
	args: {
		data: [
			{label: 'Storage', value: 62},
			{label: 'Bandwidth', value: 28},
			{label: 'API calls', value: 91},
			{label: 'Seats', value: 45},
		],
		orientation: 'horizontal',
		size: 'inline',
		track: true,
		rounded: true,
		width: 560,
		height: 160,
		title: 'Quota usage',
	},
	parameters: {
		docs: {
			description: {
				story:
					'Same inline mode applied to several rows — each row keeps its label on the left and value on the right, but the bar is a thin 8px row over a shared-style gray track. Useful for dashboard quota lists.',
			},
		},
	},
};

export const InlineSquare: Story = {
	args: {
		data: [{label: 'Progress', value: 62}],
		orientation: 'horizontal',
		size: 'inline',
		track: true,
		rounded: false,
		width: 480,
		height: 32,
		title: 'Storage used (square ends)',
	},
	parameters: {
		docs: {
			description: {
				story:
					'`rounded={false}` keeps the default 2px corner radius on both bar and track. `track` and `size` work independently of `rounded`, so consumers can mix-and-match.',
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
