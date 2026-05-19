import type {Meta, StoryObj} from '@storybook/react';
import {BarChart} from './BarChart';

const meta: Meta<typeof BarChart> = {
	title: 'Charts/BarChart',
	component: BarChart,
	tags: ['autodocs'],
	args: {
		title: 'Quarterly revenue (€k)',
		animated: true,
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
