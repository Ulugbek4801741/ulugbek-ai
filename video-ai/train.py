"""Train ULUGBEK AI's small video GAN from captioned local clips.

Dataset layout:
  dataset/
    clip_001.mp4
    clip_001.txt   # one or more caption lines; first non-empty line is used

Use only videos you own or are licensed to use. Training is compute-intensive.
"""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

import imageio.v3 as iio
import numpy as np
import torch
from PIL import Image
from torch import nn
from torch.utils.data import DataLoader, Dataset

from model import VideoDiscriminator, VideoGenerator, tokenize

VIDEO_EXTENSIONS = {".mp4", ".webm", ".mov", ".mkv"}
FRAME_COUNT = 16
FRAME_SIZE = 64


def read_caption(video_path: Path) -> str:
    caption_file = video_path.with_suffix(".txt")
    if not caption_file.is_file():
        raise ValueError(f"Caption file is missing: {caption_file.name}")
    for line in caption_file.read_text(encoding="utf-8").splitlines():
        if line.strip():
            return line.strip()
    raise ValueError(f"Caption file is empty: {caption_file.name}")


def build_vocabulary(captions: list[str], max_size: int = 8192) -> dict[str, int]:
    counts: dict[str, int] = {}
    for caption in captions:
        for word in re.findall(r"[\w'-]+", caption.lower(), flags=re.UNICODE):
            counts[word] = counts.get(word, 0) + 1
    vocab = {"<pad>": 0, "<unk>": 1}
    for word, _ in sorted(counts.items(), key=lambda item: (-item[1], item[0])):
        if len(vocab) >= max_size:
            break
        vocab[word] = len(vocab)
    return vocab


def decode_frames(path: Path) -> torch.Tensor:
    frames = []
    for index, frame in enumerate(iio.imiter(path)):
        if index >= 240:
            break
        array = np.asarray(frame)
        if array.ndim != 3:
            continue
        if array.shape[2] == 4:
            array = array[:, :, :3]
        image = Image.fromarray(array.astype(np.uint8)).convert("RGB")
        image = image.resize((FRAME_SIZE, FRAME_SIZE), Image.Resampling.BILINEAR)
        frames.append(np.asarray(image, dtype=np.float32))
    if len(frames) < 2:
        raise ValueError(f"Video has too few readable frames: {path.name}")
    indexes = np.linspace(0, len(frames) - 1, FRAME_COUNT).round().astype(int)
    selected = np.stack([frames[i] for i in indexes], axis=0)
    tensor = torch.from_numpy(selected).permute(3, 0, 1, 2).contiguous()
    return tensor.div(127.5).sub(1.0)


class CaptionedVideoDataset(Dataset):
    def __init__(self, root: Path, vocab: dict[str, int]):
        self.items = []
        for path in sorted(root.rglob("*")):
            if path.suffix.lower() not in VIDEO_EXTENSIONS:
                continue
            try:
                caption = read_caption(path)
                self.items.append((path, caption))
            except ValueError as error:
                print(f"SKIP: {error}")
        self.vocab = vocab
        if not self.items:
            raise ValueError("No captioned videos found. Add MP4 files and matching .txt captions.")

    def __len__(self):
        return len(self.items)

    def __getitem__(self, index):
        path, caption = self.items[index]
        return decode_frames(path), tokenize(caption, self.vocab)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", required=True, help="Folder containing video/.txt pairs")
    parser.add_argument("--output", default="video-ai/checkpoints/native-video.pt")
    parser.add_argument("--epochs", type=int, default=100)
    parser.add_argument("--batch-size", type=int, default=2)
    parser.add_argument("--learning-rate", type=float, default=0.0002)
    args = parser.parse_args()

    root = Path(args.dataset).resolve()
    if not root.is_dir():
        raise SystemExit("Dataset folder does not exist.")
    captions = [read_caption(p) for p in root.rglob("*") if p.suffix.lower() in VIDEO_EXTENSIONS and p.with_suffix(".txt").is_file()]
    if len(captions) < 2:
        raise SystemExit("At least two captioned videos are required for the first training run.")
    vocab = build_vocabulary(captions)
    dataset = CaptionedVideoDataset(root, vocab)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    if device.type != "cuda":
        print("WARNING: CPU training is only suitable for a tiny experiment; use an NVIDIA GPU for practical training.")
    loader = DataLoader(dataset, batch_size=max(1, args.batch_size), shuffle=True, num_workers=0, drop_last=False)
    generator = VideoGenerator(len(vocab)).to(device)
    discriminator = VideoDiscriminator(len(vocab)).to(device)
    optimizer_g = torch.optim.Adam(generator.parameters(), lr=args.learning_rate, betas=(0.5, 0.999))
    optimizer_d = torch.optim.Adam(discriminator.parameters(), lr=args.learning_rate, betas=(0.5, 0.999))
    criterion = nn.BCEWithLogitsLoss()

    for epoch in range(1, max(1, args.epochs) + 1):
        generator.train()
        discriminator.train()
        total_g = total_d = 0.0
        for real, tokens in loader:
            real, tokens = real.to(device), tokens.to(device)
            batch = real.shape[0]
            real_labels = torch.ones(batch, 1, device=device)
            fake_labels = torch.zeros(batch, 1, device=device)

            optimizer_d.zero_grad(set_to_none=True)
            fake = generator(tokens).detach()
            loss_d = criterion(discriminator(real, tokens), real_labels) + criterion(discriminator(fake, tokens), fake_labels)
            loss_d.backward()
            optimizer_d.step()

            optimizer_g.zero_grad(set_to_none=True)
            generated = generator(tokens)
            loss_g = criterion(discriminator(generated, tokens), real_labels)
            loss_g.backward()
            optimizer_g.step()
            total_d += float(loss_d.detach())
            total_g += float(loss_g.detach())

        print(f"epoch={epoch} d_loss={total_d / len(loader):.4f} g_loss={total_g / len(loader):.4f}")

    output = Path(args.output).resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    torch.save({
        "format": "ulugbek-native-video-v1",
        "vocab": vocab,
        "generator": generator.cpu().state_dict(),
        "epochs": max(1, args.epochs),
        "frame_count": FRAME_COUNT,
        "frame_size": FRAME_SIZE,
    }, output)
    output.with_suffix(".json").write_text(json.dumps({
        "format": "ulugbek-native-video-v1",
        "trained_from_scratch": True,
        "videos": len(dataset),
        "vocabulary_size": len(vocab),
        "epochs": max(1, args.epochs),
        "frame_count": FRAME_COUNT,
        "frame_size": FRAME_SIZE,
        "device": str(device),
    }, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"CHECKPOINT_SAVED={output}")


if __name__ == "__main__":
    main()
