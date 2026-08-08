const fs = require('fs');
const path = require('path');

const clientDir = path.join(__dirname, 'client');
let replacedFiles = [];

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        if (file === 'node_modules' || file === 'dist' || file.startsWith('.')) return;
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else {
            if (file.endsWith('.js') || file.endsWith('.jsx')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walk(clientDir);

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    // Replace literal \${import.meta.env.VITE_API_URL} with ${import.meta.env.VITE_API_URL}
    content = content.replace(/\\\$\{import\.meta\.env\.VITE_API_URL\}/g, "${import.meta.env.VITE_API_URL}");
    
    if (original !== content) {
        fs.writeFileSync(file, content, 'utf8');
        replacedFiles.push(file);
    }
});

console.log(`Replaced in ${replacedFiles.length} files.`);
console.log(replacedFiles.map(f => path.basename(f)).join(', '));
