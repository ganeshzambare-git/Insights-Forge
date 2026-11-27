import os
from PIL import Image, ImageDraw, ImageFont

icons_dir = r"D:\Ganesh Study\readynest\IsightFordge_v1\IsightFordge_v1\desktop\src-tauri\icons"
os.makedirs(icons_dir, exist_ok=True)

def create_icon_image(size):
    # Create high-res canvas (gradient background + sleek IF branding)
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Rounded rectangle background with gradient effect
    padding = max(1, size // 16)
    rect = [padding, padding, size - padding, size - padding]
    corner_radius = max(2, size // 5)

    # Background fill: deep blue-purple theme (#3B82F6 -> #8B5CF6)
    draw.rounded_rectangle(rect, radius=corner_radius, fill=(59, 130, 246, 255), outline=(139, 92, 246, 255), width=max(1, size // 32))

    # Inner stylized lightning / chart symbol (#FFFFFF)
    # Simple sharp geometric bars representing InsightForge analytics
    bar_width = max(2, size // 10)
    gap = max(1, size // 12)
    start_x = size // 4
    base_y = size - size // 4

    heights = [size // 3, size // 2, size * 2 // 3]
    colors = [(255, 255, 255, 220), (255, 255, 255, 240), (255, 255, 255, 255)]

    for i, h in enumerate(heights):
        x = start_x + i * (bar_width + gap)
        y = base_y - h
        draw.rounded_rectangle([x, y, x + bar_width, base_y], radius=max(1, bar_width // 4), fill=colors[i])

    return img

# Save 256x256 base image
base_img = create_icon_image(512)

# Save sizes
base_img.resize((32, 32), Image.Resampling.LANCZOS).save(os.path.join(icons_dir, "32x32.png"))
base_img.resize((128, 128), Image.Resampling.LANCZOS).save(os.path.join(icons_dir, "128x128.png"))
base_img.resize((256, 256), Image.Resampling.LANCZOS).save(os.path.join(icons_dir, "128x128@2x.png"))
base_img.resize((30, 30), Image.Resampling.LANCZOS).save(os.path.join(icons_dir, "Square30x30Logo.png"))
base_img.resize((150, 150), Image.Resampling.LANCZOS).save(os.path.join(icons_dir, "Square150x150Logo.png"))
base_img.resize((44, 44), Image.Resampling.LANCZOS).save(os.path.join(icons_dir, "Square44x44Logo.png"))

# Save ICO with multiple embedded resolutions
ico_sizes = [(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
base_img.save(os.path.join(icons_dir, "icon.ico"), format="ICO", sizes=ico_sizes)

print("Icons generated successfully in", icons_dir)
