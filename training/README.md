# Uzbek-first model adaptation (LoRA)

This is a reproducible fine-tuning pipeline, not a claim that a model has already been trained.

Default base: `Qwen/Qwen2.5-0.5B-Instruct`. The model card identifies Apache-2.0 licensing. This is a small starter base, not an Uzbek-native model and not a guarantee of strong Uzbek performance. Check the upstream model card and license before every release.

Create `training/data/uzbek-instructions.jsonl`, one JSON object per line:
`{"instruction":"...","input":"...","output":"..."}`

Only include reviewed high-quality examples. Remove personal data, secrets, duplicated text, untrusted prompt-injection instructions, and content not cleared for model training. The example file is deliberately tiny and is not a training corpus. At least 50 examples are required; 1,000+ diverse reviewed examples are recommended.

Run on a CUDA machine:
```bash
python -m venv .venv
source .venv/bin/activate
pip install -r training/requirements.txt
python training/train_lora.py --data training/data/uzbek-instructions.jsonl --epochs 2
```

Output is a LoRA adapter, not a replacement for base weights. Keep a held-out test set; compare against the unmodified base; evaluate Uzbek spelling, factuality, safety, hallucinations and latency. Do not automatically load an unreviewed adapter into production.

CPU mode is for debugging only and will be very slow. Fine-tuning even 0.5B requires substantial RAM; a GPU is recommended. Training from random initialization is far larger: tokenizer design, a large clean corpus, distributed GPU training and extensive evaluation are required.
