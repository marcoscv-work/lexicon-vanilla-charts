import React from 'react';
import type {Preview} from '@storybook/react';
import '../src/styles/global.scss';

const preview: Preview = {
	parameters: {
		// Sidebar order overrides the default alphabetical sort. BarChart
		// is the least feature-rich component so it sits last; MapChart
		// (the latest, most prominent) leads.
		options: {
			storySort: {
				order: ['Charts', ['MapChart', 'PieChart', 'BarChart']],
			},
		},
		controls: {
			matchers: {color: /(background|color)$/i, date: /Date$/i},
		},
		a11y: {
			config: {
				rules: [
					{
						id: 'color-contrast',
						reviewOnFail: true,
					},
				],
			},
		},
		backgrounds: {
			default: 'light',
			values: [
				{name: 'light', value: '#ffffff'},
				{name: 'gray', value: '#f7f8f9'},
			],
		},
	},
	globalTypes: {
		reducedMotion: {
			name: 'Reduced motion',
			description: 'Force the c-prefers-reduced-motion class on <body>',
			defaultValue: false,
			toolbar: {
				icon: 'play',
				items: [
					{value: false, title: 'Off'},
					{value: true, title: 'On'},
				],
			},
		},
	},
	decorators: [
		(Story, context) => {
			if (typeof document !== 'undefined') {
				document.body.classList.toggle(
					'c-prefers-reduced-motion',
					Boolean(context.globals.reducedMotion)
				);
			}
			// Wrap each story in <main> + sr-only <h1> so the iframe itself
			// satisfies axe's `landmark-one-main`, `page-has-heading-one`
			// and `region` best-practice rules. The chart components have
			// no opinion on page landmarks — those belong to the host app.
			const storyName = context.title
				? `${context.title} — ${context.name}`
				: context.name;
			return React.createElement(
				'main',
				{'aria-labelledby': 'sb-story-heading'},
				React.createElement(
					'h1',
					{id: 'sb-story-heading', className: 'cui-sr-only'},
					storyName
				),
				Story()
			);
		},
	],
};

export default preview;
