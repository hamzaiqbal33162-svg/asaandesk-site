# Image tool models

These ONNX models are loaded by `../imagetools.js` only when a person uses the tool (nothing is
downloaded on page load). Both licences allow commercial use. The test
`tests/imagetools.test.mjs` checks the files against the SHA-256 values below. `migan_pipeline_v2.onnx` is stored as
`migan_pipeline_v2.onnx.part0` + `.part1` (byte-for-byte pieces, each under Cloudflare's 25 MiB file limit); the browser
joins them, and the SHA-256 below is for the joined file.

| File | Model | Licence | Size (bytes) | SHA-256 | Source |
| --- | --- | --- | --- | --- | --- |
| `u2netp.onnx` | U²-Netp (small U²-Net, salient object / background removal) | Apache-2.0 | 4574861 | `309c8469258dda742793dce0ebea8e6dd393174f89934733ecc8b14c76f4ddd8` | https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2netp.onnx |
| `migan_pipeline_v2.onnx` | MI-GAN 512 Places2 inpainting, full ONNX pipeline | MIT | 28079181 | `6f1f3530a1a2324b19752018ce756088b07973cda8d7d890034ace5c8a48c40b` | https://huggingface.co/andraniksargsyan/migan/resolve/406830d0fa60666da0071c342ad2fbc8f30c5c64/migan_pipeline_v2.onnx |

## U²-Netp

- Model and weights: U²-Net by Xuebin Qin, Zichen Zhang, Chenyang Huang, Masood Dehghan,
  Osmar R. Zaiane and Martin Jagersand, https://github.com/xuebinqin/U-2-Net, licensed under the
  Apache License 2.0. Full text: `LICENSE-U2-Net-Apache-2.0.txt`.
- ONNX conversion from the rembg project by Daniel Gatis (MIT licence, `LICENSE-rembg-MIT.txt`).
  The file is unchanged from the rembg release.
- Input `input.1` float32 [1, 3, 320, 320] (RGB divided by its maximum, then ImageNet mean/std);
  first output float32 [1, 1, 320, 320] is the saliency map (min-max normalised before use).

## MI-GAN

- MI-GAN: "A Simple Baseline for Image Inpainting on Mobile Devices" (ICCV 2023) by Andranik
  Sargsyan, Shant Navasardyan, Xingqian Xu and Humphrey Shi, Picsart AI Research,
  https://github.com/Picsart-AI-Research/MI-GAN. Code is MIT (`LICENSE`) and the weights are MIT
  too (`LICENSE-WEIGHTS`, added to the repository on 2026-09-14). The Hugging Face repository
  `andraniksargsyan/migan` (by the first author) is also tagged MIT. Full text:
  `LICENSE-MI-GAN-MIT.txt` (both files carry the same text, Copyright (c) 2024 Picsart AI Research).
- The ONNX file is the pre-generated pipeline linked from the MI-GAN README (made with
  `scripts/create_onnx_pipeline.py`). Inputs: `image` uint8 [B, 3, H, W] RGB, `mask` uint8
  [B, 1, H, W] where 255 = keep and 0 = fill. Output: `result` uint8 [B, 3, H, W]. The pipeline
  crops around the hole, resizes to 512, runs the generator and blends the result back.
  `imagetools.js` gives it 512×512 crops, so its internal resize is a no-op.

## Runtime

ONNX Runtime Web 1.30.0 (MIT, Copyright (c) Microsoft Corporation) is in `../lib/ort/` with its
`LICENSE.txt` and `ThirdPartyNotices.txt`.
