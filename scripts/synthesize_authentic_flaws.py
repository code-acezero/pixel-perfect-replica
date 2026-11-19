import numpy as np
from PIL import Image, ImageFilter

def create_authentic_flaws():
    # Load the base authentic white single jersey knit image
    base_img = Image.open("public/textiles/needle_line.jpg").convert("RGB")
    w, h = base_img.size
    base_np = np.array(base_img, dtype=np.float32)

    # 1. YARN SLUB
    # An abrupt 3x thick clump of uncombed cotton fiber along a horizontal course
    slub_np = base_np.copy()
    cy, cx = h // 2, w // 2
    for dx in range(-80, 81):
        # Elliptical thickness profile of a cotton slub
        thick = int(22 * (1.0 - (abs(dx) / 85.0)**2))
        for dy in range(-thick, thick + 1):
            py = cy + dy
            px = cx + dx
            if 0 <= py < h and 0 <= px < w:
                # Cotton slub is denser, brighter fiber bundle with soft shadow underneath
                if dy > thick - 4:
                    # shadow under slub
                    slub_np[py, px] *= 0.72
                elif dy < -thick + 4:
                    # top highlight
                    slub_np[py, px] = np.clip(slub_np[py, px] * 1.15, 0, 255)
                else:
                    # core fiber bundle
                    slub_np[py, px] = np.clip(slub_np[py, px] * 1.08 + 10, 0, 255)
    Image.fromarray(np.clip(slub_np, 0, 255).astype(np.uint8)).save("public/textiles/yarn_slub.jpg", quality=95)
    print("Saved public/textiles/yarn_slub.jpg")

    # 2. DROP STITCH LADDER
    # A vertical dropped loop creating horizontal unlooped yarn rungs
    drop_np = base_np.copy()
    cx = w // 2
    for y in range(40, h - 40):
        # Clear out vertical loop channel
        for x in range(cx - 14, cx + 15):
            drop_np[y, x] *= 0.45 # dark background gap
        # Horizontal ladder rungs every 18 pixels
        if y % 18 in [0, 1, 2]:
            for x in range(cx - 14, cx + 15):
                drop_np[y, x] = [240, 238, 232] # taut unknitted yarn rung
    Image.fromarray(np.clip(drop_np, 0, 255).astype(np.uint8)).save("public/textiles/drop_stitch.jpg", quality=95)
    print("Saved public/textiles/drop_stitch.jpg")

    # 3. KNIT BARRE
    # Periodic horizontal bands of slight shade and stitch density variation across courses
    barre_np = base_np.copy()
    for y in range(h):
        # 16-feeder circular knitting repeat cycle
        cycle = np.sin(y * (2.0 * np.pi / 120.0))
        factor = 1.0 + cycle * 0.085 # 8.5% tension/reflectance difference
        barre_np[y, :] = np.clip(barre_np[y, :] * factor, 0, 255)
    Image.fromarray(np.clip(barre_np, 0, 255).astype(np.uint8)).save("public/textiles/knit_barre.jpg", quality=95)
    print("Saved public/textiles/knit_barre.jpg")

    # 4. LYCRA OUT (ELASTANE STARVATION)
    # A distinct horizontal void where elastane feeder starved, causing loops to open up
    lycra_np = base_np.copy()
    cy = h // 2
    for dy in range(-16, 17):
        py = cy + dy
        if 0 <= py < h:
            scale = 1.0 - (abs(dy) / 18.0)
            # Thin translucent horizontal void line
            lycra_np[py, :] = np.clip(lycra_np[py, :] * (1.0 - scale * 0.28) + scale * 30, 0, 255)
    Image.fromarray(np.clip(lycra_np, 0, 255).astype(np.uint8)).save("public/textiles/lycra_out.jpg", quality=95)
    print("Saved public/textiles/lycra_out.jpg")

    # 5. YARN FLOAT
    # An unknitted loose yarn floating across courses horizontally
    float_np = base_np.copy()
    cy = h // 2
    for dx in range(-110, 111):
        px = w // 2 + dx
        py = cy + int(np.sin(dx * 0.05) * 3)
        if 0 <= px < w:
            for thick in range(-3, 4):
                if 0 <= py + thick < h:
                    float_np[py + thick, px] = [252, 250, 246]
            # shadow beneath float
            if 0 <= py + 5 < h:
                float_np[py + 5, px] *= 0.65
    Image.fromarray(np.clip(float_np, 0, 255).astype(np.uint8)).save("public/textiles/yarn_float.jpg", quality=95)
    print("Saved public/textiles/yarn_float.jpg")

if __name__ == "__main__":
    create_authentic_flaws()
