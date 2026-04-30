
import fs from 'fs';

const results = JSON.parse(fs.readFileSync('api-unused-vars-v3.json', 'utf8'));

results.forEach(result => {
    const unused = result.messages.filter(msg => msg.ruleId === '@typescript-eslint/no-unused-vars');
    if (unused.length > 0) {
        console.log(`File: ${result.filePath}`);
        unused.forEach(msg => {
            console.log(`  Line ${msg.line}: ${msg.message}`);
        });
    }
});
