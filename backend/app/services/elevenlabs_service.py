import os
import json
from io import BytesIO

from elevenlabs.client import ElevenLabs

SPEAKER_ID_MAP = {
    "speaker_0": "Speaker A",
    "speaker_1": "Speaker B",
}

MODEL_ID = "scribe_v2"


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


def process_audio_to_json(audio_path: str, output_dir: str, api_key: str, language_code: str = "ta"):
    client = ElevenLabs(api_key=api_key)

    with open(audio_path, "rb") as f:
        audio_stream = BytesIO(f.read())

    transcription = client.speech_to_text.convert(
        file=audio_stream,
        model_id=MODEL_ID,
        diarize=True,
        language_code=language_code
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

    audio_name = os.path.basename(audio_path)
    stem, _ = os.path.splitext(audio_name)
    output_path = os.path.join(output_dir, f"{stem}_output.json")

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(output_json, f, ensure_ascii=False, indent=2)

    return {
        "audio_file_name": audio_name,
        "output_json_path": output_path,
        "annotations_count": len(output_json["annotations"]),
        "output_json": output_json,
    }