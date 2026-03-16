import os
import json
import tkinter as tk
from tkinter import filedialog
from io import BytesIO

from elevenlabs.client import ElevenLabs  # pip install elevenlabs


# ------------------ CONFIG ------------------

SPEAKER_ID_MAP = {
    "speaker_0": "Speaker A",
    "speaker_1": "Speaker B",
}

MODEL_ID = "scribe_v2"


# ------------------ FILE PICKER ------------------

def pick_audio_files():
    root = tk.Tk()
    root.withdraw()
    return filedialog.askopenfilenames(
        title="Select audio files",
        filetypes=[
            ("Audio Files", "*.mp3 *.wav *.m4a *.flac *.aac *.ogg"),
            ("All Files", "*.*"),
        ],
    )


# ------------------ SPEAKER LABEL ------------------

def speaker_label(speaker_id: str) -> str:
    if speaker_id in SPEAKER_ID_MAP:
        return SPEAKER_ID_MAP[speaker_id]

    if speaker_id.startswith("speaker_"):
        try:
            idx = int(speaker_id.split("_")[1])
            letter = chr(ord("A") + idx)
            return f"Speaker {letter}"
        except Exception:
            pass

    return "Speaker UNKNOWN"


# ------------------ SEGMENT BUILDER ------------------

def build_segments_from_words(words):
    segments = []
    cur = None

    for w in words:
        if not hasattr(w, "start") or not hasattr(w, "end"):
            continue

        speaker_id = getattr(w, "speaker_id", "speaker_unknown")
        text = getattr(w, "text", "")

        if cur is None:
            cur = {
                "speaker_id": speaker_id,
                "start": float(w.start),
                "end": float(w.end),
                "text": text,
            }
            continue

        if speaker_id == cur["speaker_id"]:
            cur["end"] = float(w.end)
            cur["text"] += text
        else:
            cur["text"] = cur["text"].strip()
            if cur["text"]:
                segments.append(cur)

            cur = {
                "speaker_id": speaker_id,
                "start": float(w.start),
                "end": float(w.end),
                "text": text,
            }

    if cur:
        cur["text"] = cur["text"].strip()
        if cur["text"]:
            segments.append(cur)

    return segments


# ------------------ OUTPUT FORMAT ------------------

def to_required_json(segments):
    return {
        "annotations": [
            {
                "type": "subtitle",
                "label": speaker_label(seg["speaker_id"]),
                "metadata": {
                    "system": {
                        "startTime": seg["start"],
                        "endTime": seg["end"],
                    }
                },
                "coordinates": {
                    "text": seg["text"]
                },
            }
            for seg in segments
        ]
    }


# ------------------ MAIN ------------------

def main():
    # 🔴 API KEY KEPT EXACTLY AS REQUESTED
    api_key = "sk_d317f16f3dc0f6efb01c88fbe692a8b79fbc90666205b0d6"

    audio_paths = pick_audio_files()
    if not audio_paths:
        raise RuntimeError("No audio files selected.")

    client = ElevenLabs(api_key=api_key)

    for audio_path in audio_paths:
        print(f"\n🎧 Processing: {audio_path}")

        with open(audio_path, "rb") as f:
            audio_stream = BytesIO(f.read())

        transcription = client.speech_to_text.convert(
            file=audio_stream,
            model_id=MODEL_ID,
            diarize=True,
            language_code="ta"
        )

        words = getattr(transcription, "words", None)

        if not words:
            segments = [{
                "speaker_id": "speaker_0",
                "start": 0.0,
                "end": 0.0,
                "text": getattr(transcription, "text", ""),
            }]
        else:
            segments = build_segments_from_words(words)

        output_json = to_required_json(segments)

        base, _ = os.path.splitext(audio_path)
        output_path = f"{base}_output.json"

        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(output_json, f, ensure_ascii=False, indent=2)

        print(f"✅ Output saved: {output_path}")
        print(f"🧩 Segments: {len(output_json['annotations'])}")

    print("\n🎉 All files processed successfully!")


# ------------------ ENTRY POINT ------------------

if __name__ == "__main__":
    main()
