# ULUGBEK AI — first native neural model experiment

This folder contains a real, small decoder-only Transformer training starter. Unlike the current JavaScript rule-based reasoner, this Python model has trainable neural weights and starts from random initialization.

## Requirements

- Python 3.10+
- PyTorch (install separately for the CPU or CUDA environment)
- A reviewed UTF-8 plain-text corpus supplied by the administrator
- For useful training speed, a compatible GPU; CPU is only for small experiments

## Train from scratch

```bash
python -m pip install torch
python training/train_tiny_gpt.py --data ./approved-corpus.txt --output ./models/ulugbek-tiny --steps 2000 --device auto
```

The script uses a byte-level tokenizer (256 token values), splits the local corpus into training and validation sets, initializes all model weights randomly, trains a small causal Transformer, prints loss metrics, and saves checkpoints.

## Safety and limits

- No pretrained model weights are downloaded or loaded.
- No internet access, web crawling, shell execution, or secret scanning is performed by the script.
- Only the explicitly supplied local text file is used. The administrator must verify licenses and remove personal data, passwords, API keys, and private user content before training.
- Checkpoints and generated samples are research artifacts. They are not automatically connected to the public chat or deployed.
- This tiny model is a proof-of-concept, not ChatGPT-level intelligence. Quality depends on corpus size/quality, compute, and training; a small byte-level model may produce poor or incoherent text.
- Never train on live user conversations without a separate lawful consent, privacy, and data-governance process.
