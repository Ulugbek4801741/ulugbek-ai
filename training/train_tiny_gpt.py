#!/usr/bin/env python3
"""Train a small ULUGBEK AI decoder-only Transformer from random weights.

This is a research starter, not a ChatGPT-scale model. It uses a byte tokenizer
and a plain-text corpus explicitly supplied by the administrator. It never
downloads pretrained weights or fetches data from the network.
"""
from __future__ import annotations

import argparse
import json
import math
import os
import random
from pathlib import Path

import torch
from torch import nn
from torch.nn import functional as F


class ByteTokenizer:
    vocab_size = 256

    @staticmethod
    def encode(text: str) -> list[int]:
        return list(text.encode("utf-8", errors="replace"))

    @staticmethod
    def decode(tokens: list[int]) -> str:
        return bytes(max(0, min(255, int(x))) for x in tokens).decode("utf-8", errors="replace")


class CausalSelfAttention(nn.Module):
    def __init__(self, width: int, heads: int, context: int, dropout: float):
        super().__init__()
        if width % heads:
            raise ValueError("embedding width must be divisible by attention heads")
        self.heads = heads
        self.key = nn.Linear(width, width, bias=False)
        self.query = nn.Linear(width, width, bias=False)
        self.value = nn.Linear(width, width, bias=False)
        self.projection = nn.Linear(width, width)
        self.dropout = nn.Dropout(dropout)
        self.register_buffer("mask", torch.tril(torch.ones(context, context)).view(1, 1, context, context))

    def forward(self, x):
        batch, length, width = x.shape
        head_width = width // self.heads
        shape = (batch, length, self.heads, head_width)
        q = self.query(x).view(shape).transpose(1, 2)
        k = self.key(x).view(shape).transpose(1, 2)
        v = self.value(x).view(shape).transpose(1, 2)
        weights = (q @ k.transpose(-2, -1)) * (head_width ** -0.5)
        weights = weights.masked_fill(self.mask[:, :, :length, :length] == 0, float("-inf"))
        weights = self.dropout(F.softmax(weights, dim=-1))
        result = (weights @ v).transpose(1, 2).contiguous().view(batch, length, width)
        return self.dropout(self.projection(result))


class FeedForward(nn.Module):
    def __init__(self, width: int, dropout: float):
        super().__init__()
        self.net = nn.Sequential(nn.Linear(width, 4 * width), nn.GELU(), nn.Linear(4 * width, width), nn.Dropout(dropout))

    def forward(self, x):
        return self.net(x)


class Block(nn.Module):
    def __init__(self, width: int, heads: int, context: int, dropout: float):
        super().__init__()
        self.norm1 = nn.LayerNorm(width)
        self.attention = CausalSelfAttention(width, heads, context, dropout)
        self.norm2 = nn.LayerNorm(width)
        self.feed_forward = FeedForward(width, dropout)

    def forward(self, x):
        x = x + self.attention(self.norm1(x))
        return x + self.feed_forward(self.norm2(x))


class UlugbekTinyGPT(nn.Module):
    def __init__(self, context=128, width=128, heads=4, layers=4, dropout=0.1):
        super().__init__()
        self.context = context
        self.token_embedding = nn.Embedding(256, width)
        self.position_embedding = nn.Embedding(context, width)
        self.blocks = nn.Sequential(*[Block(width, heads, context, dropout) for _ in range(layers)])
        self.final_norm = nn.LayerNorm(width)
        self.output = nn.Linear(width, 256, bias=False)
        self.apply(self._init_weights)

    @staticmethod
    def _init_weights(module):
        if isinstance(module, nn.Linear):
            nn.init.normal_(module.weight, mean=0.0, std=0.02)
            if module.bias is not None:
                nn.init.zeros_(module.bias)
        elif isinstance(module, nn.Embedding):
            nn.init.normal_(module.weight, mean=0.0, std=0.02)

    def forward(self, tokens, targets=None):
        batch, length = tokens.shape
        if length > self.context:
            raise ValueError("sequence exceeds configured context length")
        positions = torch.arange(length, device=tokens.device)
        x = self.token_embedding(tokens) + self.position_embedding(positions)[None, :, :]
        logits = self.output(self.final_norm(self.blocks(x)))
        loss = F.cross_entropy(logits.reshape(-1, 256), targets.reshape(-1)) if targets is not None else None
        return logits, loss

    @torch.no_grad()
    def generate(self, tokens, max_new_tokens=100, temperature=0.8):
        self.eval()
        for _ in range(max_new_tokens):
            window = tokens[:, -self.context:]
            logits, _ = self(window)
            scores = logits[:, -1, :] / max(temperature, 0.05)
            next_token = torch.multinomial(F.softmax(scores, dim=-1), num_samples=1)
            tokens = torch.cat((tokens, next_token), dim=1)
        return tokens


def get_batch(data, batch_size, context, device):
    max_start = len(data) - context - 1
    starts = torch.randint(max(1, max_start), (batch_size,))
    x = torch.stack([data[i:i + context] for i in starts.tolist()])
    y = torch.stack([data[i + 1:i + context + 1] for i in starts.tolist()])
    return x.to(device), y.to(device)


def estimate_loss(model, train_data, val_data, batch_size, context, device, batches=10):
    model.eval()
    result = {}
    with torch.no_grad():
        for name, data in (("train", train_data), ("validation", val_data)):
            losses = []
            for _ in range(batches):
                x, y = get_batch(data, batch_size, context, device)
                _, loss = model(x, y)
                losses.append(float(loss))
            result[name] = sum(losses) / len(losses)
    model.train()
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", required=True, help="administrator-approved UTF-8 .txt corpus")
    parser.add_argument("--output", default="models/ulugbek-tiny")
    parser.add_argument("--steps", type=int, default=2000)
    parser.add_argument("--batch-size", type=int, default=16)
    parser.add_argument("--context", type=int, default=128)
    parser.add_argument("--width", type=int, default=128)
    parser.add_argument("--heads", type=int, default=4)
    parser.add_argument("--layers", type=int, default=4)
    parser.add_argument("--learning-rate", type=float, default=3e-4)
    parser.add_argument("--device", default="auto", choices=("auto", "cpu", "cuda"))
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    if args.steps < 1 or args.batch_size < 1 or args.context < 8:
        parser.error("steps/batch-size must be positive and context must be >= 8")
    random.seed(args.seed)
    torch.manual_seed(args.seed)
    source = Path(args.data).expanduser().resolve()
    if not source.is_file():
        parser.error("dataset file does not exist")
    raw = source.read_text(encoding="utf-8", errors="strict")
    if len(raw) < args.context * 4:
        parser.error("dataset is too small; provide a larger reviewed text corpus")
    # Explicitly supplied local text only. No crawling, external calls, or secret discovery.
    encoded = torch.tensor(ByteTokenizer.encode(raw), dtype=torch.long)
    split = int(len(encoded) * 0.9)
    train_data, val_data = encoded[:split], encoded[split:]
    if len(val_data) <= args.context + 1:
        parser.error("validation split is too small")

    device = ("cuda" if torch.cuda.is_available() else "cpu") if args.device == "auto" else args.device
    if device == "cuda" and not torch.cuda.is_available():
        parser.error("CUDA requested but no CUDA GPU is available")
    model = UlugbekTinyGPT(args.context, args.width, args.heads, args.layers).to(device)
    optimizer = torch.optim.AdamW(model.parameters(), lr=args.learning_rate)
    output = Path(args.output)
    output.mkdir(parents=True, exist_ok=True)
    metadata = {
        "name": "ULUGBEK TinyGPT",
        "initialized_from_random_weights": True,
        "pretrained_weights_downloaded": False,
        "tokenizer": "UTF-8 byte tokenizer (256 tokens)",
        "dataset": str(source),
        "dataset_sha256": __import__("hashlib").sha256(source.read_bytes()).hexdigest(),
        "device": device,
        "config": {"context": args.context, "width": args.width, "heads": args.heads, "layers": args.layers},
        "warning": "Research prototype only; not a ChatGPT-level model and not approved for production chat."
    }
    (output / "metadata.json").write_text(json.dumps(metadata, ensure_ascii=False, indent=2), encoding="utf-8")

    for step in range(1, args.steps + 1):
        x, y = get_batch(train_data, args.batch_size, args.context, device)
        _, loss = model(x, y)
        optimizer.zero_grad(set_to_none=True)
        loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
        optimizer.step()
        if step == 1 or step % 100 == 0 or step == args.steps:
            metrics = estimate_loss(model, train_data, val_data, args.batch_size, args.context, device)
            print(json.dumps({"step": step, "loss": metrics}, ensure_ascii=False))
            torch.save({"model": model.state_dict(), "optimizer": optimizer.state_dict(), "step": step, "metadata": metadata}, output / "checkpoint.pt")

    tokenizer = ByteTokenizer()
    prompt = torch.tensor([tokenizer.encode("ULUGBEK AI: ")], dtype=torch.long, device=device)
    sample = model.generate(prompt, max_new_tokens=120)[0].tolist()
    (output / "sample.txt").write_text(tokenizer.decode(sample), encoding="utf-8")
    print("Training finished. Checkpoint and metadata saved to:", output)


if __name__ == "__main__":
    main()
