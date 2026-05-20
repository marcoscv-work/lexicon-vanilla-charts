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
		fit: {
			control: {type: 'inline-radio'},
			options: ['world', 'data'],
		},
		legend: {
			control: {type: 'inline-radio'},
			options: ['scale', 'list', 'none'],
		},
		variant: {
			control: {type: 'inline-radio'},
			options: ['markers', 'choropleth'],
		},
		steps: {control: {type: 'range', min: 2, max: 5, step: 1}},
	},
	args: {
		title: 'Active users by country',
		animated: true,
		scheme: 'blue',
		steps: 5,
		fit: 'world',
		legend: 'scale',
		variant: 'markers',
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

export const LegendList: Story = {
	args: {data: sample, legend: 'list', scheme: 'blue'},
	parameters: {
		docs: {
			description: {
				story:
					'`legend="list"` puts a per-country list on the right of the canvas (sorted by value, highest first), matching the PieChart legend layout. Each row is clickable: clicking focuses the matching map marker. On narrow widths the list wraps under the canvas.',
			},
		},
	},
};

export const LegendListCategorical: Story = {
	args: {data: sample, legend: 'list', scheme: 'categorical'},
	parameters: {
		docs: {
			description: {
				story:
					'`legend="list"` combined with the categorical scheme. The swatch in each row uses the same colour as the map marker.',
			},
		},
	},
};

export const FitToDataEurope: Story = {
	args: {
		data: [
			{country: 'ES', value: 3640},
			{country: 'PT', value: 920},
			{country: 'FR', value: 2510},
			{country: 'GB', value: 4280},
			{country: 'IE', value: 410},
			{country: 'DE', value: 5210},
			{country: 'NL', value: 820},
			{country: 'BE', value: 610},
			{country: 'IT', value: 1290},
			{country: 'CH', value: 380},
			{country: 'AT', value: 290},
			{country: 'PL', value: 690},
			{country: 'SE', value: 510},
			{country: 'NO', value: 320},
			{country: 'DK', value: 240},
			{country: 'FI', value: 180},
		],
		fit: 'data',
		title: 'Active users — Europe',
	},
	parameters: {
		docs: {
			description: {
				story:
					'`fit="data"` crops the viewBox to the marker bounding box plus padding. When the data is concentrated in one region, the map zooms in so the dots read at full size — surrounding land paths still draw inside the cropped viewport, so the geographic context isn\'t lost.',
			},
		},
	},
};

export const FitToDataAsia: Story = {
	args: {
		data: [
			{country: 'IN', value: 8430},
			{country: 'PK', value: 920},
			{country: 'BD', value: 1180},
			{country: 'CN', value: 14210},
			{country: 'JP', value: 3210},
			{country: 'KR', value: 1640},
			{country: 'VN', value: 770},
			{country: 'TH', value: 690},
			{country: 'ID', value: 1120},
			{country: 'MY', value: 410},
			{country: 'PH', value: 880},
			{country: 'SG', value: 230},
		],
		fit: 'data',
		scheme: 'categorical',
		title: 'Active users — Asia-Pacific',
	},
	parameters: {
		docs: {
			description: {
				story:
					'Same `fit="data"` behaviour with the categorical scheme. Use this when your data is regional but you want to keep the world map as the underlying coordinate system.',
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

export const ChoroplethBlue: Story = {
	args: {data: sample, scheme: 'blue', variant: 'choropleth'},
	parameters: {
		docs: {
			description: {
				story:
					'**Experimental.** `variant="choropleth"` fills each country with its bucket colour instead of dropping a dot on top. Uses a separate per-country SVG (CC BY-SA 3.0, from flekschas/simple-world-map) with ISO 3166-1 alpha-2 ids. `fit="data"` is ignored — the choropleth always shows the full world.',
			},
		},
	},
};

export const ChoroplethCategorical: Story = {
	args: {
		data: sample,
		scheme: 'categorical',
		variant: 'choropleth',
		legend: 'list',
	},
	parameters: {
		docs: {
			description: {
				story:
					'Choropleth variant with the categorical scheme and the list legend. Clicking a row focuses the matching country path.',
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
