const fs = require('fs');
const html = fs.readFileSync('C:/Users/Elsam/AppData/Local/Temp/gathern_dom_dump.html', 'utf8');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const dom = new JSDOM(html);
const document = dom.window.document;

const inputs = Array.from(document.querySelectorAll('input, textarea, [contenteditable="true"]'));
console.log('Found inputs:', inputs.length);

for (const input of inputs) {
    if ((input.placeholder && (input.placeholder.includes('رسالة') || input.placeholder.includes('اكتب') || input.placeholder.includes('message'))) || input.value) {
        console.log('Found composer! Type:', input.tagName, 'Placeholder:', input.placeholder, 'Value:', input.value);
        let parent = input.parentElement;
        let count = 0;
        
        while (parent && count < 5) {
            console.log(`\n--- Parent ${count} ---`);
            const buttons = parent.querySelectorAll('button, [role="button"], a, div[onclick]');
            console.log('Found buttons:', buttons.length);
            for(let b of buttons) {
                console.log('Button:', b.tagName, b.className, b.getAttribute('aria-label'), b.textContent?.trim());
                if (b.querySelector('svg')) console.log('  -> Has SVG');
            }
            parent = parent.parentElement;
            count++;
        }
    }
}
