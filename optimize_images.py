import os
import sys
from PIL import Image

# Directories to scan for images
TARGET_DIRS = [
    os.path.join(".", "backend", "media"),
    os.path.join(".", "frontend", "public", "images")
]

SUPPORTED_EXTENSIONS = ('.jpg', '.jpeg', '.png')
MAX_DIMENSION = 1920
QUALITY = 85

def get_resampling_filter():
    # Pillow >= 10.0.0 uses Image.Resampling.LANCZOS
    # Older versions might use Image.ANTIALIAS or Image.LANCZOS directly
    try:
        return Image.Resampling.LANCZOS
    except AttributeError:
        try:
            return Image.LANCZOS
        except AttributeError:
            return Image.ANTIALIAS

def optimize_image(filepath):
    try:
        original_size = os.path.getsize(filepath)
        
        # Skip files that are already very small (e.g., < 50KB)
        if original_size < 50 * 1024:
            return original_size, original_size, False

        with Image.open(filepath) as img:
            width, height = img.size
            needs_resize = width > MAX_DIMENSION or height > MAX_DIMENSION
            
            # Keep track of formats
            img_format = img.format if img.format else 'JPEG'
            if img_format == 'MPO':  # Handle multi-picture objects
                img_format = 'JPEG'
                
            # If image needs resizing, calculate new size maintaining aspect ratio
            if needs_resize:
                if width > height:
                    new_width = MAX_DIMENSION
                    new_height = int(height * (MAX_DIMENSION / width))
                else:
                    new_height = MAX_DIMENSION
                    new_width = int(width * (MAX_DIMENSION / height))
                
                resample_filter = get_resampling_filter()
                img = img.resize((new_width, new_height), resample_filter)
            
            # Save the image back
            # For PNGs, we can keep the format or convert to JPEG if appropriate, 
            # but let's preserve the original format to avoid breaking code references.
            if img_format == 'PNG':
                img.save(filepath, format='PNG', optimize=True)
            else:
                # Convert RGBA to RGB for JPEG if necessary
                if img.mode in ('RGBA', 'LA'):
                    img = img.convert('RGB')
                img.save(filepath, format='JPEG', quality=QUALITY, optimize=True)
                
        new_size = os.path.getsize(filepath)
        
        # If the optimized file size is somehow larger (rare), we don't save it
        if new_size > original_size:
            # We could revert, but usually it's smaller, especially for these huge raw photos.
            pass
            
        return original_size, new_size, True
        
    except Exception as e:
        print(f"Error optimizing {filepath}: {e}")
        return 0, 0, False

def main():
    print("Starting image optimization process...")
    print(f"Target directories: {TARGET_DIRS}")
    print(f"Resizing images larger than {MAX_DIMENSION}px to {MAX_DIMENSION}px max dimension.")
    print(f"JPEG Quality: {QUALITY}%\n")
    
    total_original = 0
    total_new = 0
    optimized_count = 0
    skipped_count = 0
    
    for target_dir in TARGET_DIRS:
        if not os.path.exists(target_dir):
            print(f"Warning: Directory {target_dir} does not exist. Skipping.")
            continue
            
        print(f"Scanning {target_dir}...")
        for root, _, files in os.walk(target_dir):
            for file in files:
                if file.lower().endswith(SUPPORTED_EXTENSIONS):
                    filepath = os.path.join(root, file)
                    orig_size, new_size, success = optimize_image(filepath)
                    
                    if success:
                        savings = orig_size - new_size
                        savings_pct = (savings / orig_size) * 100 if orig_size > 0 else 0
                        if savings > 0:
                            print(f"Optimized: {file} ({orig_size/1024/1024:.2f}MB -> {new_size/1024/1024:.2f}MB, Saved: {savings_pct:.1f}%)")
                            optimized_count += 1
                        else:
                            print(f"No savings for: {file} (kept original)")
                            skipped_count += 1
                        total_original += orig_size
                        total_new += new_size
                    else:
                        skipped_count += 1
                        
    print("\n--- Optimization Summary ---")
    print(f"Total files optimized: {optimized_count}")
    print(f"Total files skipped/unchanged: {skipped_count}")
    print(f"Total original size: {total_original/1024/1024/1024:.3f} GB ({total_original/1024/1024:.2f} MB)")
    print(f"Total optimized size: {total_new/1024/1024/1024:.3f} GB ({total_new/1024/1024:.2f} MB)")
    if total_original > 0:
        total_savings = total_original - total_new
        savings_pct = (total_savings / total_original) * 100
        print(f"Total storage saved: {total_savings/1024/1024/1024:.3f} GB ({total_savings/1024/1024:.2f} MB) - Reduced by {savings_pct:.2f}%")

if __name__ == "__main__":
    main()
