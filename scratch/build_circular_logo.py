import re
import os

def build_circular_logo():
    logo_path = "/home/ahmad/Music/Info-stream-v2/public/logo.svg"
    output_path = "/home/ahmad/Music/Info-stream-v2/public/logo_circular.svg"
    
    if not os.path.exists(logo_path):
        print(f"Error: {logo_path} not found.")
        return
        
    with open(logo_path, "r", encoding="utf-8") as f:
        content = f.read()
        
    # Extract all <path ... /> elements
    paths = re.findall(r"(<path\s+[^>]*>)", content)
    
    if not paths:
        print("Error: No paths found inside logo.svg.")
        return
        
    paths_str = "\n  ".join(paths)
    
    # Construct the beautifully inlined circular SVG with perfect padding and center scaling
    circular_svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <!-- Solid white circular background canvas -->
  <circle cx="256" cy="256" r="250" fill="#ffffff" />
  
  <!-- Centered and scaled paths directly inlined to avoid sandboxed network blocks -->
  <g transform="translate(107.5, 121.75) scale(0.75)">
    {paths_str}
  </g>
</svg>
"""
    
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(circular_svg)
        
    print(f"Successfully generated clean, inline circular favicon at: {output_path}")

if __name__ == "__main__":
    build_circular_logo()
