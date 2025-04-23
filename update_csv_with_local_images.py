import os
import csv

CSV_FILE = '501 Bottle Dataset - Sheet1.csv'
OUTPUT_CSV = '501 Bottle Dataset - Sheet1 (local images).csv'
IMAGE_DIR = 'tmp'

rows = []

with open(CSV_FILE, newline='', encoding='utf-8') as infile:
    reader = csv.DictReader(infile)
    fieldnames = reader.fieldnames
    for row in reader:
        img_id = row.get('id')
        # Try to match the filename used in download_images.py
        local_img = f'image_{img_id}.jpg'
        local_path = os.path.join(IMAGE_DIR, local_img)
        if os.path.exists(local_path):
            row['image_url'] = local_path
        else:
            # fallback: keep original URL if local file not found
            pass
        rows.append(row)

with open(OUTPUT_CSV, 'w', newline='', encoding='utf-8') as outfile:
    writer = csv.DictWriter(outfile, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(rows)

print(f"Updated CSV written to {OUTPUT_CSV}")
