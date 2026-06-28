const fs = require('fs');
const path = require('path');

function processFile(filepath) {
    let content = fs.readFileSync(filepath, 'utf-8');
    const original = content;

    // Fix bg-gradient-primary and text-slate-800 to solid teal and white text
    content = content.replace(/bg-gradient-primary text-slate-800/g, 'bg-teal-700 text-white');
    content = content.replace(/bg-gradient-primary text-white/g, 'bg-teal-700 text-white');
    content = content.replace(/bg-gradient-primary/g, 'bg-teal-700 text-white');
    
    // Also, just to be extremely safe, if there's any lingering bg-teal-700 text-slate-800 anywhere:
    content = content.replace(/bg-teal-700 text-slate-800/g, 'bg-teal-700 text-white');

    if (content !== original) {
        fs.writeFileSync(filepath, content, 'utf-8');
        console.log(`Fixed gradient & active states: ${filepath}`);
    }
}

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else { 
            if (file.endsWith('.tsx') || file.endsWith('.ts')) {
                results.push(file);
            }
        }
    });
    return results;
}

walk(path.join(__dirname, 'src')).forEach(processFile);
