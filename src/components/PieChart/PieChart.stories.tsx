import type {Meta, StoryObj} from '@storybook/react';
import {PieChart} from './PieChart';

const meta: Meta<typeof PieChart> = {
	title: 'Charts/PieChart',
	component: PieChart,
	tags: ['autodocs'],
	argTypes: {
		size: {
			control: {type: 'select'},
			options: ['xs', 'sm', 'md', 'lg'],
		},
		thickness: {
			control: {type: 'inline-radio'},
			options: ['md', 'lg'],
		},
		innerRadius: {control: {type: 'range', min: 0, max: 0.95, step: 0.05}},
	},
	args: {
		title: 'Traffic by source',
		animated: true,
		size: 'md',
		thickness: 'md',
	},
};

export default meta;
type Story = StoryObj<typeof PieChart>;

const sample = [
	{label: 'Organic search', value: 420},
	{label: 'Paid social', value: 210},
	{label: 'Direct', value: 180},
	{label: 'Referral', value: 90},
];

export const Default: Story = {
	args: {data: sample},
};

export const TwoSlices: Story = {
	args: {
		data: [
			{label: 'Renewals', value: 720},
			{label: 'New', value: 180},
		],
		title: 'Subscriptions',
	},
};

export const OddSliceCount: Story = {
	args: {
		data: [
			{label: 'Engineering', value: 38},
			{label: 'Design', value: 12},
			{label: 'Sales', value: 22},
			{label: 'Operations', value: 18},
			{label: 'Support', value: 10},
		],
		title: 'Headcount by area',
	},
	parameters: {
		docs: {
			description: {
				story:
					'The slice stroke (2px `--white` by default) acts as the WCAG 1.4.11 separator between adjacent colours, so neighbouring slices stay distinguishable.',
			},
		},
	},
};

export const ManySlices: Story = {
	args: {
		data: [
			{label: 'Spain', value: 320},
			{label: 'France', value: 280},
			{label: 'Germany', value: 260},
			{label: 'Italy', value: 220},
			{label: 'Portugal', value: 140},
			{label: 'Netherlands', value: 120},
			{label: 'Belgium', value: 80},
			{label: 'Other EU', value: 60},
		],
		title: 'Revenue by country',
		size: 'lg',
	},
};

export const Sizes: Story = {
	args: {data: sample},
	render: (args) => (
		<div style={{display: 'flex', alignItems: 'flex-end', gap: '2rem', flexWrap: 'wrap'}}>
			{(['xs', 'sm', 'md', 'lg'] as const).map((s) => (
				<PieChart key={s} {...args} size={s} title={`${args.title} · ${s}`} />
			))}
		</div>
	),
	parameters: {
		docs: {
			description: {
				story:
					'Use the `size` prop with one of the presets `xs` (160px), `sm` (220px), `md` (280px) or `lg` (360px). It also accepts any number for an exact pixel diameter. The center label scales automatically with the size.',
			},
		},
	},
};

export const Thickness: Story = {
	args: {data: sample},
	render: (args) => (
		<div style={{display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap'}}>
			<PieChart {...args} thickness="md" title="Thickness · md" />
			<PieChart {...args} thickness="lg" title="Thickness · lg" />
		</div>
	),
	parameters: {
		docs: {
			description: {
				story:
					'`thickness` widens the ring band. `md` keeps the regular slim band; `lg` widens it. Pass an explicit `innerRadius` to override.',
			},
		},
	},
};

export const Responsive: Story = {
	args: {data: sample, size: 'sm'},
	render: (args) => (
		<div
			style={{
				width: 360,
				maxWidth: '100%',
				resize: 'horizontal',
				overflow: 'auto',
				padding: '1rem',
				border: '1px dashed #d3d6e0',
			}}
		>
			<PieChart {...args} />
		</div>
	),
	parameters: {
		docs: {
			description: {
				story:
					'The chart body is a `flex` row with `flex-wrap`. When the parent narrows below the combined width of the canvas + legend, the legend wraps to the next line and ends up under the canvas. Drag the bottom-right corner of the wrapper to see it.',
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
					'This story flips the global `reducedMotion` toggle on, which adds `c-prefers-reduced-motion` to `<body>`. The slice reveal and hover transitions are suppressed at the CSS level via the same body-class rule the React hook reacts to.',
			},
		},
	},
};

export const KeyboardNavigation: Story = {
	args: {data: sample},
	parameters: {
		docs: {
			description: {
				story:
					'Tab into the chart, then use ↑/↓/←/→/Home/End to move between slices. Each slice announces its label, value and percentage.',
			},
		},
	},
};
