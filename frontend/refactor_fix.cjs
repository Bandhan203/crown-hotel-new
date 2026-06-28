const fs = require('fs');
const path = require('path');

function processFile(filepath) {
    let content = fs.readFileSync(filepath, 'utf-8');
    const original = content;

    // Fix bad contrasts from previous script
    content = content.replace(/bg-teal-700 text-slate-800/g, 'bg-teal-700 text-white');
    content = content.replace(/text-slate-800 border-teal-600/g, 'text-teal-700 border-teal-600');
    content = content.replace(/bg-teal-700 rounded-lg text-slate-800/g, 'bg-teal-700 rounded-lg text-white');
    content = content.replace(/bg-teal-700 hover:bg-teal-800 text-slate-800/g, 'bg-teal-700 hover:bg-teal-800 text-white');
    
    // Lingering golds
    content = content.replace(/hover:bg-\[#c49a62\]/g, 'hover:bg-teal-600');
    content = content.replace(/hover:bg-\[#c4a472\]/g, 'hover:bg-teal-600');
    content = content.replace(/hover:bg-\[#c49b6a\]/g, 'hover:bg-teal-600');
    content = content.replace(/hover:bg-\[#8a6a3f\]/g, 'hover:bg-teal-800');
    content = content.replace(/shadow-\[#aa8453\]/g, 'shadow-teal-700');
    content = content.replace(/border-\[#aa8453\]/g, 'border-teal-600');
    
    // One specific thing: when we replaced text-white with text-slate-800, some valid white texts on bg-teal got replaced.
    // Let's just fix any obvious ones:
    content = content.replace(/text-slate-800 hover:bg-teal-800/g, 'text-white hover:bg-teal-800');
    
    // Also, dark grey borders that shouldn't exist anymore
    content = content.replace(/bg-\[#0f0f0f\]/g, 'bg-gray-50');

    if (content !== original) {
        fs.writeFileSync(filepath, content, 'utf-8');
        console.log(`Fixed: ${filepath}`);
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
