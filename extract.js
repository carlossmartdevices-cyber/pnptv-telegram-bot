const fs = require('fs');
const content = fs.readFileSync('bold_page.js', 'utf8');
const regex = /children:"([^"]+)"/g;
let match;
const results = [];
while ((match = regex.exec(content)) !== null) {
  results.push(match[1]);
}
fs.writeFileSync('bold_page_text.txt', results.join('\n'));
