import puppeteer from 'puppeteer';
import {readFileSync} from 'node:fs';

const axe = readFileSync(
	new URL('../node_modules/axe-core/axe.min.js', import.meta.url),
	'utf8'
);

// List of stories to scan. Add new ones here when new stories are added.
const STORIES = [
	'charts-barchart--vertical',
	'charts-barchart--horizontal',
	'charts-barchart--many-bars',
	'charts-barchart--reduced-motion',
	'charts-piechart--default',
	'charts-piechart--two-slices',
	'charts-piechart--odd-slice-count',
	'charts-piechart--many-slices',
	'charts-piechart--sizes',
	'charts-piechart--thickness',
	'charts-piechart--responsive',
	'charts-piechart--reduced-motion',
	'charts-piechart--keyboard-navigation',
	'charts-mapchart--blue-density',
	'charts-mapchart--categorical',
	'charts-mapchart--three-buckets',
	'charts-mapchart--sparse',
	'charts-mapchart--responsive',
	'charts-mapchart--reduced-motion',
];

const browser = await puppeteer.launch({headless: 'new'});

let totalViolations = 0;
const seen = new Map();

for (const id of STORIES) {
	const page = await browser.newPage();
	await page.setViewport({width: 1200, height: 800});
	const url = `http://localhost:6006/iframe.html?id=${id}&viewMode=story`;
	await page.goto(url, {waitUntil: 'networkidle0', timeout: 30000});
	await page.evaluate(axe);
	const results = await page.evaluate(async () => {
		const r = await window.axe.run(document, {
			runOnly: [
				'wcag2a',
				'wcag2aa',
				'wcag21a',
				'wcag21aa',
				'best-practice',
			],
		});
		return r.violations.map((v) => ({
			id: v.id,
			impact: v.impact,
			help: v.help,
			helpUrl: v.helpUrl,
			nodes: v.nodes.map((n) => ({
				target: n.target,
				html: n.html.slice(0, 220),
				failureSummary: n.failureSummary,
			})),
		}));
	});

	if (results.length) {
		console.log(`\n=== ${id} (${results.length} violation${results.length > 1 ? 's' : ''}) ===`);
		for (const v of results) {
			totalViolations += v.nodes.length;
			console.log(`• [${v.impact}] ${v.id}: ${v.help}`);
			for (const n of v.nodes) {
				console.log(`    target: ${n.target.join(' > ')}`);
				console.log(`    html: ${n.html.replace(/\s+/g, ' ').trim()}`);
				console.log(`    why: ${n.failureSummary.replace(/\n+/g, ' | ')}`);
			}
			const cur = seen.get(v.id) ?? {impact: v.impact, help: v.help, count: 0};
			cur.count += v.nodes.length;
			seen.set(v.id, cur);
		}
	}
	await page.close();
}

console.log('\n--- Summary ---');
for (const [id, info] of seen.entries()) {
	console.log(`${info.count.toString().padStart(3)} × [${info.impact}] ${id} — ${info.help}`);
}
console.log(`Total violations: ${totalViolations}`);

await browser.close();
process.exit(totalViolations > 0 ? 1 : 0);
