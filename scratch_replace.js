const fs = require('fs');
const path = require('path');

const clientDir = path.join(__dirname, 'client');
let replacedFiles = [];
let totalReplacements = 0;

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

    // Pattern 1: baseURL: 'http://localhost:5000/api' => baseURL: import.meta.env.VITE_API_URL
    content = content.replace(/baseURL:\s*['"`]http:\/\/localhost:5000\/api['"`]/g, "baseURL: import.meta.env.VITE_API_URL");
    
    // Pattern 2: const API = 'http://localhost:5000/api'; => const API = import.meta.env.VITE_API_URL;
    content = content.replace(/const API\s*=\s*['"`]http:\/\/localhost:5000\/api['"`]/g, "const API = import.meta.env.VITE_API_URL");
    
    // Pattern 3: const BASE = 'http://localhost:5000'; => const BASE = import.meta.env.VITE_API_URL.replace('/api', '');
    content = content.replace(/const BASE\s*=\s*['"`]http:\/\/localhost:5000['"`]/g, "const BASE = import.meta.env.VITE_API_URL.replace('/api', '')");
    
    // Pattern 4: fetch('http://localhost:5000/api/auth/login' => fetch(`${import.meta.env.VITE_API_URL}/auth/login`
    content = content.replace(/['"`]http:\/\/localhost:5000\/api([^'"`]*)['"`]/g, (match, path) => {
        return "`\\${import.meta.env.VITE_API_URL}" + path + "`";
    });

    if (original !== content) {
        fs.writeFileSync(file, content, 'utf8');
        replacedFiles.push(file);
        const diff = original.split(content).length - 1;
        totalReplacements++;
    }
});

console.log(`Replaced in ${replacedFiles.length} files.`);
console.log(replacedFiles.map(f => path.basename(f)).join(', '));
