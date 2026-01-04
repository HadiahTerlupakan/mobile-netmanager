from PIL import Image
import os

source_path = '/Users/rohadimraja/Documents/mobile-netmanager/logo/res/drawable-xxxhdpi/ic_stat_logo_surya_bestari_lestari.png'
dest_path = '/Users/rohadimraja/.gemini/antigravity/brain/93c4bb7a-3c2a-4ab1-a2bd-f1b78e37c206/sbl_silhouette_final.png'

print(f"Processing {source_path}...")

try:
    img = Image.open(source_path)
    img = img.convert("RGBA")
    datas = img.getdata()

    new_data = []
    for item in datas:
        # Check if pixel is light (background)
        # Threshold 200/255
        if item[0] > 200 and item[1] > 200 and item[2] > 200:
            # Make Transparent
            new_data.append((255, 255, 255, 0))
        else:
            # Make Pure White (Silhouette)
            new_data.append((255, 255, 255, 255))

    img.putdata(new_data)
    img.save(dest_path, "PNG")
    print(f"Success! Saved to {dest_path}")
except Exception as e:
    print(f"Error: {e}")
