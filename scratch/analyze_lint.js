
import fs from 'fs';
import path from 'path';

const results = JSON.parse(fs.readFileSync('lint-results.json', 'utf8'));

const counts = {};

results.forEach(result => {
    const dir = path.dirname(result.filePath).replace('/home/ezzio/Desktop/Projects/nested-united-dev/', '');
    counts[dir] = (counts[dir] || 0) + result.messages.length;
});

const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);

console.log('Error counts per directory:');
sorted.forEach(([dir, count]) => {
    console.log(`${dir}: ${count}`);
});
