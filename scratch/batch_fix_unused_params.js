
import fs from 'fs';
import path from 'path';

const results = JSON.parse(fs.readFileSync('api-unused-vars.json', 'utf8'));

results.forEach(result => {
    const unusedParams = result.messages.filter(msg => 
        msg.ruleId === '@typescript-eslint/no-unused-vars' && 
        (msg.message.includes('\'request\'') || msg.message.includes('\'req\'') || msg.message.includes('\'RouteParams\''))
    );

    if (unusedParams.length > 0) {
        let content = fs.readFileSync(result.filePath, 'utf8');
        const lines = content.split('\n');
        
        unusedParams.forEach(msg => {
            const lineIndex = msg.line - 1;
            const line = lines[lineIndex];
            
            // Try to rename parameter
            if (line.includes('request:')) {
                lines[lineIndex] = line.replace('request:', '_request:');
            } else if (line.includes('req:')) {
                lines[lineIndex] = line.replace('req:', '_req:');
            } else if (line.includes('RouteParams')) {
                lines[lineIndex] = line.replace('RouteParams', '_RouteParams');
            }
        });
        
        fs.writeFileSync(result.filePath, lines.join('\n'));
        console.log(`Updated ${result.filePath}`);
    }
});
