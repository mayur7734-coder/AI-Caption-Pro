#!/usr/bin/env python3
"""
AI Caption Pro - Transcribe audio with Whisper (offline)
Usage:
  python transcribe.py --audio path/to/file.wav --model base --language auto --output json,srt
"""
import os
import sys
import json
import argparse
from pathlib import Path

try:
    import whisper
except ImportError:
    print(json.dumps({"error": "whisper not installed"}))
    sys.exit(1)

def main():
    p = argparse.ArgumentParser()
    p.add_argument('--audio', required=True, help='Path to WAV audio file')
    p.add_argument('--model', default='base', help='Whisper model to use (base, small, medium, large)')
    p.add_argument('--language', default='auto', help='Language code (hi, gu, auto, hinglish, gujlish)')
    p.add_argument('--output', default='json,srt', help='Output formats (json, srt)')
    p.add_argument('--tmp', default=None, help='Temporary folder for outputs')
    args = p.parse_args()

    audio_path = Path(args.audio)
    if not audio_path.exists():
        print(json.dumps({"error": "Audio file not found"}))
        sys.exit(1)

    model_name = args.model
    model = whisper.load_model(model_name)
    # Auto language detection; Whisper will guess if language == 'auto'
    language = args.language
    # Transcribe with word-level timestamps
    options = {
        "task": "transcribe",
        "language": language if language != 'auto' else None,
        "word_timestamps": True
    }
    # Perform transcription
    result = model.transcribe(str(audio_path), **options)

    # Build outputs
    out_dir = Path(args.tmp) if args.tmp else audio_path.parent / 'ai_caption_pro_output'
    out_dir.mkdir(parents=True, exist_ok=True)
    json_out = {
        "audio": str(audio_path),
        "model": model_name,
        "language": language,
        "segments": result.get('segments', [])
    }

    json_path = out_dir / (audio_path.stem + '.json')
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(json_out, f, ensure_ascii=False, indent=2)

    srt_path = out_dir / (audio_path.stem + '.srt')
    # Build SRT with simple per-segment timing; also derive word-by-word timings as a sub‑set
    with open(srt_path, 'w', encoding='utf-8') as f:
        idx = 1
        for seg in result.get('segments', []):
            if not isinstance(seg, dict):
                continue
            start = seg.get('start', 0)
            end = seg.get('end', 0)
            text = seg.get('text', '').strip()
            if not text:
                continue
            f.write(f"{idx}\n")
            f.write(f"{format_timestamp(start)} --> {format_timestamp(end)}\n")
            f.write(text.replace('--', '—') + "\n\n")
            idx += 1
            # Word-level highlighting: write per-word blocks if available
            words = seg.get('words', [])
            if isinstance(words, list) and len(words) > 0:
                for w in words:
                    wstart = (start + w.get('start', 0))
                    wend = (start + w.get('end', 0))
                    wtext = w.get('word', '').strip()
                    if not wtext:
                        continue
                    f.write(f"{idx}\n")
                    f.write(f"{format_timestamp(wstart)} --> {format_timestamp(wend)}\n")
                    f.write(wtext + "\n\n")
                    idx += 1

    # Emit final output payload
    payload = {
        "jsonPath": str(json_path),
        "srtPath": str(srt_path),
        "segments": result.get('segments', [])
    }
    print(json.dumps(payload))

def format_timestamp(seconds: float) -> str:
    # SRT timestamp format: 00:00:00,000
    ms = int(round(seconds * 1000))
    hours = ms // (60*60*1000)
    ms -= hours * 60*60*1000
    minutes = ms // (60*1000)
    ms -= minutes * 60*1000
    secs = ms // 1000
    msec = ms % 1000
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{msec:03d}"

if __name__ == '__main__':
    main()
