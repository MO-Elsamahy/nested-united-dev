
import fs from 'fs';
import path from 'path';

const results = JSON.parse(fs.readFileSync('lint-results-p1.json', 'utf8'));

const ruleCounts = {};
const dirCounts = {};

results.forEach(result => {
    const dir = path.dirname(result.filePath).replace('/home/ezzio/Desktop/Projects/nested-united-dev/', '');
    dirCounts[dir] = (dirCounts[dir] || 0) + result.messages.length;

    result.messages.forEach(msg => {
        ruleCounts[msg.ruleId] = (ruleCounts[msg.ruleId] || 0) + 1;
    });
});

const sortedRules = Object.entries(ruleCounts).sort((a, b) => b[1] - a[1]);
const sortedDirs = Object.entries(dirCounts).sort((a, b) => b[1] - a[1]);

console.log('--- Top Rules ---');
sortedRules.slice(0, 20).forEach(([rule, count]) => {
    console.log(`${rule}: ${count}`);
});

console.log('\n--- Top Directories ---');
sortedDirs.slice(0, 20).forEach(([dir, count]) => {
    console.log(`${dir}: ${count}`);
});
