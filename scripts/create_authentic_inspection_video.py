import sys
import subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFont

def generate_video():
    width = 1280
    height = 720
    fps = 30
    duration_sec = 12
    total_frames = fps * duration_sec
    output_path = "public/textiles/textile_inspection_feed.mp4"

    print(f"Generating authentic fabric inspection video ({width}x{height}, {total_frames} frames)...")

    # Start ffmpeg process to encode directly from stdin
    cmd = [
        "ffmpeg",
        "-y",
        "-f", "rawvideo",
        "-vcodec", "rawvideo",
        "-s", f"{width}x{height}",
        "-pix_fmt", "rgb24",
        "-r", str(fps),
        "-i", "-",
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-preset", "fast",
        "-crf", "22",
        output_path
    ]

    pipe = subprocess.Popen(cmd, stdin=subprocess.PIPE)

    # Pre-generate a high-resolution seamless single-jersey cotton knit texture tile
    tile_h = 1440
    fabric_w = 1280

    # 1. Base cotton color (Natural Optical White / Ecru Knit: #f1ede3)
    base_color = np.array([242, 238, 230], dtype=np.float32)

    # 2. Generate knit loops (Wales vertical frequency, Courses horizontal frequency)
    y_coords, x_coords = np.mgrid[0:tile_h, 0:fabric_w]

    # Wales (vertical columns of interlocking knit loops every 4 pixels)
    wale_freq = (2.0 * np.pi) / 4.2
    wales = np.cos(x_coords * wale_freq)

    # Courses (horizontal stitch rows every 5 pixels with interlocking v-shape)
    course_freq = (2.0 * np.pi) / 5.4
    courses = np.sin(y_coords * course_freq + np.sin(x_coords * wale_freq) * 0.4)

    # Knitted loop shading pattern
    knit_shading = (wales * 0.5 + courses * 0.5) * 14.0 # subtle 3D yarn loop relief
    
    # Cotton fiber micro-texture noise
    np.random.seed(42)
    fiber_noise = np.random.normal(0, 3.5, (tile_h, fabric_w))

    # Composite seamless knit tile
    knit_tile = np.clip(base_color + knit_shading[:, :, None] + fiber_noise[:, :, None], 215, 255).astype(np.uint8)

    # Pre-render defects onto the master fabric strip:
    # Defect 1: Continuous Needle Line (broken needle ladder at x = 540)
    for y in range(tile_h):
        # wale drop: subtle darker groove with pale adjacent pulled yarn
        knit_tile[y, 539:541] = [175, 168, 158]
        knit_tile[y, 541:543] = [255, 253, 250]

    # Defect 2: Sinker Machine Oil Stain (droplet at x = 780, y = 350..420)
    for dy in range(-35, 36):
        for dx in range(-25, 26):
            dist = (dx**2) / (22**2) + (dy**2) / (32**2)
            if dist < 1.0:
                alpha = (1.0 - dist) * 0.55
                px = 780 + dx
                py = 380 + dy
                orig = knit_tile[py, px].astype(np.float32)
                # Golden-amber sinker oil color [145, 105, 40]
                oil_color = np.array([140, 100, 35], dtype=np.float32)
                blended = orig * (1.0 - alpha) + oil_color * alpha
                knit_tile[py, px] = np.clip(blended, 0, 255).astype(np.uint8)

    # Defect 3: Small Knitted Hole (punctured loop at x = 380, y = 820..855)
    for dy in range(-16, 17):
        for dx in range(-18, 19):
            dist = (dx**2) / (16**2) + (dy**2) / (14**2)
            if dist < 0.8:
                px = 380 + dx
                py = 840 + dy
                # Dark opening showing the illuminated black table gap beneath
                knit_tile[py, px] = [28, 30, 36]
            elif dist < 1.15:
                # Frayed broken yarn loop fringe around hole
                px = 380 + dx
                py = 840 + dy
                if (px + py) % 3 == 0:
                    knit_tile[py, px] = [255, 250, 240]
                else:
                    knit_tile[py, px] = [160, 150, 140]

    # Defect 4: Yarn Slub Lump (at x = 660, y = 1150)
    for dx in range(-28, 29):
        dy_spread = int(4 * (1.0 - (abs(dx)/30.0)**2))
        for dy in range(-dy_spread, dy_spread + 1):
            px = 660 + dx
            py = 1150 + dy
            knit_tile[py, px] = [255, 252, 248]

    # Side ruler border graphics
    border_w = 64
    ruler_left = np.zeros((height, border_w, 3), dtype=np.uint8)
    ruler_left[:] = [28, 32, 40] # brushed dark machine frame
    # Stainless steel guide bar reflection
    ruler_left[:, border_w-4:border_w] = [180, 185, 195]

    ruler_right = np.zeros((height, border_w, 3), dtype=np.uint8)
    ruler_right[:] = [28, 32, 40]
    ruler_right[:, 0:4] = [180, 185, 195]

    # Millimeter markings on rulers
    for y in range(0, height, 10):
        length = 8 if y % 50 == 0 else 4
        color = [190, 200, 215] if y % 50 == 0 else [90, 100, 115]
        ruler_left[y:y+2, border_w-length-4:border_w-4] = color
        ruler_right[y:y+2, 4:4+length] = color

    # Roll speed: scroll 720 px per 6 seconds = 1440 px per 12 seconds
    scroll_speed = (tile_h / total_frames)

    for i in range(total_frames):
        offset = int((i * scroll_speed)) % tile_h

        # Extract current view from looping tile
        if offset + height <= tile_h:
            frame_fabric = knit_tile[offset:offset+height, :].copy()
        else:
            part1 = knit_tile[offset:, :]
            part2 = knit_tile[:height - (tile_h - offset), :]
            frame_fabric = np.vstack([part1, part2])

        # Apply realistic overhead inspection lighting vignette (D65 LED Softbox)
        # Center is brightest, smooth falloff toward left/right fabric edges
        x_norm = np.linspace(-1.0, 1.0, fabric_w)
        y_norm = np.linspace(-1.0, 1.0, height)
        xv, yv = np.meshgrid(x_norm, y_norm)
        vignette = 1.0 - (xv**2 * 0.12 + yv**2 * 0.08)
        frame_fabric = np.clip(frame_fabric.astype(np.float32) * vignette[:, :, None], 0, 255).astype(np.uint8)

        # Overlay side machine guide borders
        frame_fabric[:, 0:border_w] = ruler_left
        frame_fabric[:, fabric_w-border_w:fabric_w] = ruler_right

        # Top tension roller shadow
        for r_y in range(12):
            shadow = (1.0 - r_y / 12.0) * 0.4
            frame_fabric[r_y, :] = (frame_fabric[r_y, :].astype(np.float32) * (1.0 - shadow)).astype(np.uint8)

        # Bottom take-up roller shadow
        for r_y in range(12):
            shadow = (r_y / 12.0) * 0.35
            frame_fabric[height - 12 + r_y, :] = (frame_fabric[height - 12 + r_y, :].astype(np.float32) * (1.0 - shadow)).astype(np.uint8)

        # Write frame to ffmpeg
        pipe.stdin.write(frame_fabric.tobytes())

        if i % 60 == 0:
            print(f"Rendered {i}/{total_frames} frames ({int(i/total_frames*100)}%)...")

    pipe.stdin.close()
    pipe.wait()
    print("Video generation finished successfully!")

if __name__ == "__main__":
    generate_video()
