import type {Meta, StoryObj} from '@storybook/react';
import {MapChart} from './MapChart';

const meta: Meta<typeof MapChart> = {
	title: 'Charts/MapChart',
	component: MapChart,
	tags: ['autodocs'],
	argTypes: {
		scheme: {
			control: {type: 'inline-radio'},
			options: ['blue', 'categorical'],
		},
		steps: {control: {type: 'range', min: 2, max: 5, step: 1}},
	},
	args: {
		title: 'Active users by country',
		animated: true,
		scheme: 'blue',
		steps: 5,
	},
};

export default meta;
type Story = StoryObj<typeof MapChart>;

const sample = [
	{country: 'US', value: 12450},
	{country: 'CA', value: 1810},
	{country: 'MX', value: 940},
	{country: 'BR', value: 3120},
	{country: 'AR', value: 480},
	{country: 'GB', value: 4280},
	{country: 'ES', value: 3640},
	{country: 'FR', value: 2510},
	{country: 'DE', value: 5210},
	{country: 'IT', value: 1290},
	{country: 'NL', value: 820},
	{country: 'SE', value: 510},
	{country: 'PL', value: 690},
	{country: 'RU', value: 2030},
	{country: 'TR', value: 870},
	{country: 'EG', value: 410},
	{country: 'NG', value: 720},
	{country: 'ZA', value: 580},
	{country: 'SA', value: 990},
	{country: 'AE', value: 1140},
	{country: 'IN', value: 8430},
	{country: 'CN', value: 14210},
	{country: 'JP', value: 3210},
	{country: 'KR', value: 1640},
	{country: 'ID', value: 1120},
	{country: 'AU', value: 1980},
];

export const BlueDensity: Story = {
	args: {data: sample, scheme: 'blue'},
	parameters: {
		docs: {
			description: {
				story:
					'Monochrome blue heatmap (the default). Five quantile buckets, darker = higher density. Uses the `--blue-l4` → `--blue-d4` ramp from `Light.tokens.json`.',
			},
		},
	},
};

export const Categorical: Story = {
	args: {data: sample, scheme: 'categorical'},
	parameters: {
		docs: {
			description: {
				story:
					'Five-hue cold-to-warm scale (cyan → green → yellow → orange → red) from the chart palette. Useful when buckets are meaningful categories rather than just intensity.',
			},
		},
	},
};

export const ThreeBuckets: Story = {
	args: {data: sample, scheme: 'blue', steps: 3},
	parameters: {
		docs: {
			description: {
				story:
					'Fewer buckets for coarser summaries. `steps` accepts 2 to 5.',
			},
		},
	},
};

export const Sparse: Story = {
	args: {
		data: [
			{country: 'ES', value: 3640},
			{country: 'PT', value: 920},
			{country: 'FR', value: 2510},
			{country: 'GB', value: 4280},
		],
		scheme: 'blue',
		title: 'Western Europe',
	},
	parameters: {
		docs: {
			description: {
				story:
					'A handful of countries still produces a legible chart — the legend reflects whatever buckets the data falls into.',
			},
		},
	},
};

export const Responsive: Story = {
	args: {data: sample, scheme: 'blue'},
	render: (args) => (
		<div
			style={{
				width: 480,
				maxWidth: '100%',
				resize: 'horizontal',
				overflow: 'auto',
				padding: '1rem',
				border: '1px dashed #d3d6e0',
			}}
		>
			<MapChart {...args} />
		</div>
	),
	parameters: {
		docs: {
			description: {
				story:
					'The SVG uses `viewBox` + `width: 100%; height: auto`, so the map scales fluidly with its container. Drag the bottom-right corner of the wrapper to shrink it.',
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
					'`reducedMotion` global toggle is on, which adds `c-prefers-reduced-motion` to `<body>`. The marker reveal stagger is suppressed via the same CSS rule the other charts use.',
			},
		},
	},
};
