"""Generate a short MP4 with a ULUGBEK AI checkpoint trained from scratch."""
from __future__ import annotations

import argparse
from pathlib import Path

import imageio.v3 as iio
import numpy as np
import torch

from model import VideoGenerator, tokenize


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--checkpoint", required=True)
    parser.add_argument("--prompt", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--seed", type=int, default=0)
    args = parser.parse_args()

    checkpoint_path = Path(args.checkpoint).resolve()
    if not checkpoint_path.is_file():
        raise SystemExit("Native video model checkpoint was not found.")
    checkpoint = torch.load(checkpoint_path, map_location="cpu", weights_only=True)
    if checkpoint.get("format") != "ulugbek-native-video-v1":
        raise SystemExit("Unsupported ULUGBEK video checkpoint format.")
    vocab = checkpoint.get("vocab")
    if not isinstance(vocab, dict) or len(vocab) < 2:
        raise SystemExit("Video checkpoint vocabulary is invalid.")

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    generator = VideoGenerator(len(vocab)).to(device)
    generator.load_state_dict(checkpoint["generator"])
    generator.eval()
    torch.manual_seed(args.seed if args.seed else torch.seed())
    with torch.inference_mode():
        clip = generator(tokenize(args.prompt, vocab).unsqueeze(0).to(device))[0]
    frames = clip.detach().cpu().clamp(-1, 1).add(1).mul(127.5).byte()
    frames = frames.permute(1, 2, 3, 0).numpy().astype(np.uint8)
    output = Path(args.output).resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    iio.imwrite(output, frames, fps=8, codec="libx264", quality=7)
    if not output.is_file() or output.stat().st_size < 256:
        raise SystemExit("Video encoder did not produce a valid MP4.")
    print(f"VIDEO_SAVED={output}")


if __name__ == "__main__":
    main()
