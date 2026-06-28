const fs = require('fs');
const path = require('path');

function processFile(filepath) {
    let content = fs.readFileSync(filepath, 'utf-8');
    const original = content;

    // QuickActions custom hex backgrounds
    content = content.replace(/bg-\[#784018\] text-slate-800/g, 'bg-[#784018] text-white');
    content = content.replace(/bg-\[#1f56b9\] text-slate-800/g, 'bg-[#1f56b9] text-white');
    content = content.replace(/bg-\[#0f8a48\] text-slate-800/g, 'bg-[#0f8a48] text-white');
    content = content.replace(/bg-\[#bc2323\] text-slate-800/g, 'bg-[#bc2323] text-white');
    
    // RoomGrid specific ones
    content = content.replace(/bg-teal-900 text-slate-800/g, 'bg-teal-900 text-white');
    
    // GuestPanel button
    content = content.replace(/bg-teal-700 hover:bg-teal-600 text-slate-800/g, 'bg-teal-700 hover:bg-teal-600 text-white');
    
    // AdminHeader avatar
    content = content.replace(/text-slate-800 font-bold text-lg bg-teal-800/g, 'text-white font-bold text-lg bg-teal-800');

    if (content !== original) {
        fs.writeFileSync(filepath, content, 'utf-8');
        console.log(`Fixed contrast: ${filepath}`);
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
