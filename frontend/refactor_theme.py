import os
import re

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content

    # Backgrounds
    content = content.replace('bg-[#0c0c0e]', 'bg-gray-50')
    content = content.replace('bg-[#1a1a1a]', 'bg-white')
    content = content.replace('bg-[#0f0f0f]', 'bg-gray-50')
    content = content.replace('bg-[#111]', 'bg-gray-50')
    content = content.replace('bg-white/5', 'bg-gray-50')
    content = content.replace('hover:bg-white/5', 'hover:bg-gray-100')
    
    # Borders
    content = content.replace('border-white/10', 'border-gray-200')
    content = content.replace('border-white/20', 'border-gray-300')
    content = content.replace('border-[#aa8453]', 'border-teal-600')
    content = content.replace('border-[#aa8453]/30', 'border-teal-600/30')
    content = content.replace('border-[#aa8453]/40', 'border-teal-600/40')
    content = content.replace('border-[#aa8453]/50', 'border-teal-600/50')
    
    # Text colors
    # We must be careful with text-white, as buttons still need it.
    # Instead of replacing text-white blindly, we'll replace it in common contexts or just replace the dark text colors.
    content = content.replace('text-[#aa8453]', 'text-teal-700')
    content = content.replace('text-[#8a6a3f]', 'text-teal-700')
    
    # Primary Theme Colors (Gold -> Teal)
    content = content.replace('bg-[#aa8453]', 'bg-teal-700')
    content = content.replace('hover:bg-[#c49b63]', 'hover:bg-teal-600')
    content = content.replace('bg-[#c49b63]', 'bg-teal-600')
    content = content.replace('hover:bg-[#8c6c44]', 'hover:bg-teal-800')
    
    # Translucent variants
    content = content.replace('bg-[#aa8453]/20', 'bg-teal-50')
    content = content.replace('bg-[#aa8453]/10', 'bg-teal-50')
    content = content.replace('bg-[#aa8453]/5', 'bg-teal-50/50')
    content = content.replace('hover:bg-[#aa8453]/15', 'hover:bg-teal-100')
    
    # Focus rings
    content = content.replace('focus:border-[#aa8453]', 'focus:border-teal-600 focus:ring-1 focus:ring-teal-600')
    content = content.replace('focus:ring-[#aa8453]', 'focus:ring-teal-600')

    # Specific light mode text adjustments
    # inputClass usually has text-white, let's fix that specifically.
    content = content.replace("text-white text-sm focus:outline-none focus:border-teal-600", "text-slate-800 text-sm focus:outline-none focus:border-teal-600")
    
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated: {filepath}")

def main():
    admin_dir = r"d:\crown hotel new\frontend\src\admin"
    for root, dirs, files in os.walk(admin_dir):
        for file in files:
            if file.endswith(('.tsx', '.ts')):
                process_file(os.path.join(root, file))

if __name__ == '__main__':
    main()
