const fs = require('fs');
const path = require('path');

function processFile(filepath) {
    let content = fs.readFileSync(filepath, 'utf-8');
    const original = content;

    // Backgrounds
    content = content.replace(/bg-\[#0c0c0e\]/g, 'bg-gray-50');
    content = content.replace(/bg-\[#1a1a1a\]/g, 'bg-white');
    content = content.replace(/bg-\[#0f0f0f\]/g, 'bg-gray-50');
    content = content.replace(/bg-\[#111\]/g, 'bg-gray-50');
    content = content.replace(/bg-white\/5/g, 'bg-gray-50');
    content = content.replace(/hover:bg-white\/5/g, 'hover:bg-gray-100');
    
    // Borders
    content = content.replace(/border-white\/10/g, 'border-gray-200');
    content = content.replace(/border-white\/20/g, 'border-gray-300');
    content = content.replace(/border-\[#aa8453\]\/30/g, 'border-teal-600/30');
    content = content.replace(/border-\[#aa8453\]\/40/g, 'border-teal-600/40');
    content = content.replace(/border-\[#aa8453\]\/50/g, 'border-teal-600/50');
    content = content.replace(/border-\[#aa8453\]/g, 'border-teal-600');
    
    // Text colors
    content = content.replace(/text-\[#aa8453\]/g, 'text-teal-700');
    content = content.replace(/text-\[#8a6a3f\]/g, 'text-teal-700');
    
    // Primary Theme Colors (Gold -> Teal)
    content = content.replace(/bg-\[#aa8453\]\/20/g, 'bg-teal-50');
    content = content.replace(/bg-\[#aa8453\]\/10/g, 'bg-teal-50');
    content = content.replace(/bg-\[#aa8453\]\/5/g, 'bg-teal-50/50');
    content = content.replace(/hover:bg-\[#aa8453\]\/15/g, 'hover:bg-teal-100');
    content = content.replace(/hover:bg-\[#c49b63\]/g, 'hover:bg-teal-600');
    content = content.replace(/bg-\[#c49b63\]/g, 'bg-teal-600');
    content = content.replace(/hover:bg-\[#8c6c44\]/g, 'hover:bg-teal-800');
    content = content.replace(/bg-\[#aa8453\]/g, 'bg-teal-700');
    
    // Focus rings
    content = content.replace(/focus:border-\[#aa8453\]/g, 'focus:border-teal-600 focus:ring-1 focus:ring-teal-600');
    content = content.replace(/focus:ring-\[#aa8453\]/g, 'focus:ring-teal-600');

    // Specific light mode text adjustments
    content = content.replace(/text-white text-sm focus:outline-none focus:border-teal-600/g, "text-slate-800 text-sm focus:outline-none focus:border-teal-600");
    content = content.replace(/text-gray-400/g, 'text-gray-500');
    content = content.replace(/text-gray-300/g, 'text-gray-600');
    content = content.replace(/text-white/g, 'text-slate-800');
    // Revert button and specific icon text colors back to white where it was blindly replaced
    content = content.replace(/text-slate-800 rounded/g, 'text-white rounded');
    content = content.replace(/text-slate-800 bg-teal/g, 'text-white bg-teal');
    
    if (content !== original) {
        fs.writeFileSync(filepath, content, 'utf-8');
        console.log(`Updated: ${filepath}`);
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

const adminDir = path.join(__dirname, 'src', 'admin');
const files = walk(adminDir);
files.forEach(processFile);

// Also process Login.tsx
processFile(path.join(__dirname, 'src', 'pages', 'Login.tsx'));
