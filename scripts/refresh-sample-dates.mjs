#!/usr/bin/env node
/**
 * Moves the publish dates of the demo posts into the last eight weeks.
 *
 * The right sidebar heatmap only counts the last 8 weeks. The demo posts' dates are hardcoded in frontmatter,
 * so over time they all fall out of that window and users who clone the repo see a grid of empty cells,
 * which means the feature effectively does not exist on the demo site.
 *
 * This script reassigns dates according to the schedule below so the heatmap always has content,
 * and deliberately gives two of the days two posts each, to show the color intensity levels as well.
 *
 * Run it once before a release: pnpm samples:dates. To preview without changing anything, use pnpm samples:dates:dry.
 * It only changes the sample posts listed in SCHEDULE below; users' own posts are not affected.
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const DRY = process.argv.includes('--dry');
const BLOG = path.join(process.cwd(), 'starter/src/content/blog');

/**
 * Days before today. If the same number appears twice, that day has two posts and the heatmap shows a deeper color.
 *
 * backend-evolution-2024 and frontend-trends-2025 are deliberately left out here:
 * their titles hardcode the year, so moving their dates would make the title and publish date disagree.
 */
const SCHEDULE = {
    // The regular post is the oldest and comes last on the home page: after the overview and the series, readers end on a real post
    'a-weekend-in-the-mountains': 23,
    // The series is listed in reading order; dates must increase so the series page shows it in the right order
    '搭建你的第一个站点/01-run-in-ten-minutes': 20,
    '搭建你的第一个站点/02-first-post': 18,
    '搭建你的第一个站点/03-directives-in-writing': 16,
    '搭建你的第一个站点/04-organize-and-style': 14,
    // The overview is the newest, so it is the first post new users see on the home page
    'welcome-to-vergil': 2,
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = (n) => String(n).padStart(2, '0');

/** Keep the file's original date format; do not normalize it along the way, so no unrelated changes slip into the diff */
function format(date, sample) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(sample)) {
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    }
    return `${MONTHS[date.getMonth()]} ${pad(date.getDate())} ${date.getFullYear()}`;
}

const today = new Date();
today.setHours(12, 0, 0, 0);
let changed = 0;
let missing = 0;

for (const [slug, daysAgo] of Object.entries(SCHEDULE)) {
    const file = path.join(BLOG, `${slug}.md`);
    if (!fs.existsSync(file)) {
        console.log(`  跳过  ${slug}（文件不存在）`);
        missing++;
        continue;
    }
    const text = fs.readFileSync(file, 'utf-8');
    const match = text.match(/^publishDate:[ \t]*'?([^'\n]+)'?[ \t]*$/m);
    if (!match) {
        console.log(`  跳过  ${slug}（没有 publishDate）`);
        missing++;
        continue;
    }
    const date = new Date(today);
    date.setDate(date.getDate() - daysAgo);
    const next = format(date, match[1].trim());
    if (next === match[1].trim()) continue;

    if (!DRY) {
        fs.writeFileSync(file, text.replace(match[0], `publishDate: '${next}'`), 'utf-8');
    }
    console.log(`  ${match[1].trim().padEnd(12)} → ${next.padEnd(12)} ${slug}`);
    changed++;
}

console.log(`\n${DRY ? '预演：' : ''}${changed} 篇改了日期${missing ? `，${missing} 篇跳过` : ''}。`);
if (DRY) console.log('（没有真的写入，去掉 --dry 才会生效）');
