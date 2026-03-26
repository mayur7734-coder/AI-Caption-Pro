AI Caption Pro v1 Setup

Production-ready CEP panel for Adobe Premiere Pro (CEP) with optional After Effects support.

Overview
- Offline speech-to-text using Whisper (base model by default).
- Hindi, Gujarati, Hinglish, Gujlish support (via language option and simple post-processing).
- Automatic subtitle generation with word-by-word timings.
- Premiere Pro integration to import SRT and create caption tracks.
- Word-by-word animation support via exported SRT and later MOGrT templates.
- Optional After Effects compatibility (export MOGrT presets).

Project structure (as requested)
- AI-Caption-Pro/
  - index.html
  - styles.css
  - main.js
  - jsx/
    - host.jsx
  - python/
    - transcribe.py
  - assets/
  - README.md

How to run and install
- Install Premiere Pro CEP extension dependencies as per Adobe docs.
- Ensure Python is installed and Whisper is available in the Python environment: 
  pip install torch torchvision torchaudio --extra-index-url https://download.pytorch.org/whl/cpu
- Install Whisper: pip install git+https://github.com/openai/whisper.git
- Place this folder in your CEP extensions directory and load it via Premiere Pro.
- Open Premiere Pro, select a sequence in the timeline, then in the panel choose a language and style, and press Generate Captions.
- The panel will export the audio, run Whisper locally, generate a SRT, and import it back into Premiere as a caption track.

Notes and limitations
- Fully offline operation is supported if Whisper is installed locally.
- Language support for Hinglish and Gujlish is approximated by using Hindi/Gujarati models with post-processing.
- Real-time, per-word animation in Premiere might require MOGrT templates; the panel provides a base implementation and a path to generate MOGrT presets for advanced animations.
- After Effects compatibility is optional; you can extend the JSX host to generate and apply MOGrT presets for animated captions.

Next steps (recommended)
- Improve Premiere ExtendScript API coverage for robust export/import of audio and SRT.
- Implement MOGrT template generation and payload to control per-word animation.
- Add translation/dialect support to improve Hinglish/Gujlish handling.
- Add error handling, logging, and a test harness to automate tests inside QA.

This is a starting point for a production-ready plugin. Further QA and integration work is required for a fully polished product.
