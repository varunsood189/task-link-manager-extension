import os

# Base64 encoded 1x1 transparent PNG to use as a fallback if PIL is missing,
# but let's just make a simple 1x1 white png
BASE64_1x1_PNG = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\x0bIDAT\x08\xd7c\xf8\xff\xff\xff\x00\x05\xfe\x02\xfe\r\xef\xf6\x08\x00\x00\x00\x00IEND\xaeB`\x82'

def create_icons():
    os.makedirs('icons', exist_ok=True)
    try:
        from PIL import Image, ImageDraw
        # Create a nice simple gradient or colored icon
        sizes = [16, 48, 128]
        for size in sizes:
            img = Image.new('RGB', (size, size), color='#3b82f6')
            draw = ImageDraw.Draw(img)
            # draw a simple T for Task inside
            font_size = int(size * 0.6)
            # A simple manual 'T' shape using rectangles
            margin_x = size * 0.2
            margin_y = size * 0.2
            bar_thickness = size * 0.2
            draw.rectangle([margin_x, margin_y, size - margin_x, margin_y + bar_thickness], fill='white')
            draw.rectangle([size/2 - bar_thickness/2, margin_y, size/2 + bar_thickness/2, size - margin_y], fill='white')
            
            img.save(f'icons/icon{size}.png')
        print("Created icons with PIL")
    except ImportError:
        print("PIL not found, creating 1x1 fallback icons")
        sizes = [16, 48, 128]
        for size in sizes:
            with open(f'icons/icon{size}.png', 'wb') as f:
                f.write(BASE64_1x1_PNG)

if __name__ == '__main__':
    create_icons()
