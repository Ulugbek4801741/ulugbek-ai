# ULUGBEK AI — Native Video Engine (first research baseline)

This module is built inside ULUGBEK AI. It does **not** call a hosted video API,
ComfyUI, or download pretrained model weights. The small conditional 3D GAN in
`model.py` is initialized randomly and trained from the user's own captioned
video dataset.

## Current honest capability boundary

- First target: 16-frame, 64×64 MP4 clips.
- This is a research baseline, not a cinematic text-to-video model.
- Quality depends on dataset size, captions, GPU time, and training iterations.
- A few sample clips are not enough to learn general-purpose video generation.
- The Render Node service does not become a GPU trainer merely by deploying this code.
- Do not enable production generation until a checkpoint has been trained and
  the host has Python, PyTorch, FFmpeg support, and adequate GPU resources.

## Dataset

Put legally usable videos and same-name UTF-8 text captions in a folder:

```text
dataset/
  river_sunset.mp4
  river_sunset.txt
  horse_running.mp4
  horse_running.txt
```

Each caption file must contain at least one non-empty line. Use only content
you own or have permission to train on.

## Install and train

Python 3.10+ is recommended. Install `requirements.txt` from this folder.
An NVIDIA CUDA GPU is strongly recommended. CPU training is only for tiny
experiments and can be extremely slow.

```bash
python -m pip install -r video-ai/requirements.txt
python video-ai/train.py --dataset ./dataset --epochs 100 --batch-size 2
```

The default checkpoint is `video-ai/checkpoints/native-video.pt`.

## Generate

```bash
python video-ai/generate.py --checkpoint video-ai/checkpoints/native-video.pt --prompt "A horse running across a green field at sunrise" --output ./generated.mp4
```

## Server integration

Set `VIDEO_AI_CHECKPOINT` to the trained checkpoint path and
`VIDEO_AI_PYTHON` to the Python executable. The Node API reports unavailable
until the checkpoint exists. No external service URL or API key is used.
