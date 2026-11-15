"""Small text-conditioned video GAN trained from scratch for ULUGBEK AI.

This is an intentionally small research baseline (64x64, 16 frames), not a
claim of cinematic quality. It has no pretrained weights or remote API.
"""
from __future__ import annotations

import re
import torch
from torch import nn


def tokenize(text: str, vocab: dict[str, int], max_tokens: int = 32) -> torch.Tensor:
    words = re.findall(r"[\w'-]+", text.lower(), flags=re.UNICODE)[:max_tokens]
    ids = [vocab.get(word, vocab.get("<unk>", 1)) for word in words]
    ids = ids or [vocab.get("<unk>", 1)]
    ids = ids[:max_tokens]
    ids += [0] * (max_tokens - len(ids))
    return torch.tensor(ids, dtype=torch.long)


def text_features(token_ids: torch.Tensor, embedding: nn.Embedding) -> torch.Tensor:
    mask = token_ids.ne(0).unsqueeze(-1)
    values = embedding(token_ids) * mask
    return values.sum(dim=1) / mask.sum(dim=1).clamp_min(1)


class VideoGenerator(nn.Module):
    def __init__(self, vocab_size: int, text_dim: int = 128, noise_dim: int = 128):
        super().__init__()
        self.embedding = nn.Embedding(vocab_size, text_dim, padding_idx=0)
        self.noise_dim = noise_dim
        self.project = nn.Linear(text_dim + noise_dim, 256 * 1 * 4 * 4)
        self.network = nn.Sequential(
            nn.BatchNorm3d(256),
            nn.ConvTranspose3d(256, 128, 4, 2, 1),
            nn.BatchNorm3d(128), nn.ReLU(True),
            nn.ConvTranspose3d(128, 64, 4, 2, 1),
            nn.BatchNorm3d(64), nn.ReLU(True),
            nn.ConvTranspose3d(64, 32, 4, 2, 1),
            nn.BatchNorm3d(32), nn.ReLU(True),
            nn.ConvTranspose3d(32, 3, 4, 2, 1),
            nn.Tanh(),
        )

    def forward(self, token_ids: torch.Tensor, noise: torch.Tensor | None = None) -> torch.Tensor:
        batch = token_ids.shape[0]
        text = text_features(token_ids, self.embedding)
        if noise is None:
            noise = torch.randn(batch, self.noise_dim, device=token_ids.device)
        latent = self.project(torch.cat((text, noise), dim=1))
        latent = latent.view(batch, 256, 1, 4, 4)
        return self.network(latent)


class VideoDiscriminator(nn.Module):
    def __init__(self, vocab_size: int, text_dim: int = 128):
        super().__init__()
        self.embedding = nn.Embedding(vocab_size, text_dim, padding_idx=0)
        self.features = nn.Sequential(
            nn.Conv3d(3, 32, 4, (1, 2, 2), 1), nn.LeakyReLU(0.2, True),
            nn.Conv3d(32, 64, 4, 2, 1), nn.BatchNorm3d(64), nn.LeakyReLU(0.2, True),
            nn.Conv3d(64, 128, 4, 2, 1), nn.BatchNorm3d(128), nn.LeakyReLU(0.2, True),
            nn.Conv3d(128, 256, 4, 2, 1), nn.BatchNorm3d(256), nn.LeakyReLU(0.2, True),
        )
        self.unconditional = nn.Linear(256, 1)
        self.text_projection = nn.Linear(text_dim, 256)

    def forward(self, video: torch.Tensor, token_ids: torch.Tensor) -> torch.Tensor:
        feature = self.features(video).mean(dim=(2, 3, 4))
        text = text_features(token_ids, self.embedding)
        projection = self.text_projection(text)
        return self.unconditional(feature) + (feature * projection).sum(dim=1, keepdim=True) / (feature.shape[1] ** 0.5)
