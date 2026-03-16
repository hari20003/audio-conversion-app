import json
import os
from tkinter import Tk, filedialog

# -----------------------------
# Convert seconds → hh:mm:ss.mmm (SAFE, with overflow handling)
# -----------------------------
def sec_to_hhmmss_ms(seconds):
    try:
        seconds = float(seconds)
    except (TypeError, ValueError):
        seconds = 0.0

    # Convert everything to milliseconds first (prevents overflow bugs)
    total_ms = int(round(seconds * 1000))

    hh = total_ms // (3600 * 1000)
    remainder = total_ms % (3600 * 1000)

    mm = remainder // (60 * 1000)
    remainder = remainder % (60 * 1000)

    ss = remainder // 1000
    ms = remainder % 1000

    return f"{hh:02}:{mm:02}:{ss:02}.{ms:03}"

# -----------------------------
# Transform NextWealth JSON → required format
# -----------------------------
def transform_json(input_data):
    # audio name from top-level "filename" or "fileName"
    audio_path = input_data.get("filename") or input_data.get("fileName")
    if audio_path:
        audio = os.path.basename(audio_path)
    else:
        audio = "UNKNOWN.wav"

    segments = []

    for ann in input_data.get("annotations", []):
        # metadata
        meta_sys = ann.get("metadata", {}).get("system", {})
        coords = ann.get("coordinates", {}) or {}
        attrs = meta_sys.get("attributes", {}) or {}

        start_sec = meta_sys.get("startTime", 0)
        end_sec = meta_sys.get("endTime", 0)

        speaker = ann.get("label", "Unknown")
        text = coords.get("text", "")

        # language from attribute "1"
        language = attrs.get("1", "UNK")

        # emotion from attribute "2" (usually a list like ["polite"])
        emotion_raw = attrs.get("2", ["neutral"])
        if isinstance(emotion_raw, list) and emotion_raw:
            emotion = emotion_raw[0]
        else:
            emotion = emotion_raw or "neutral"

        # end_of_speech from attribute "3" (["true"] / ["false"])
        eos_raw = attrs.get("3", ["false"])
        if isinstance(eos_raw, list):
            end_of_speech = any(str(x).lower() == "true" for x in eos_raw)
        else:
            end_of_speech = str(eos_raw).lower() == "true"

        entry = {
            "start": sec_to_hhmmss_ms(start_sec),
            "end": sec_to_hhmmss_ms(end_sec),
            "speaker": speaker,
            "text": text,
            "emotion": emotion,
            "language": language,
            "end_of_speech": end_of_speech,
        }

        # Keep numeric start time only for sorting
        segments.append((float(start_sec or 0), entry))

    # Sort by start time
    segments.sort(key=lambda x: x[0])
    transcriptJson = [entry for _, entry in segments]

    return {
        "audio": audio,
        "transcriptJson": transcriptJson,
    }

# -----------------------------
# File Picker + Batch Processing
# -----------------------------
def main():
    # Hide the root Tk window
    root = Tk()
    root.withdraw()

    file_paths = filedialog.askopenfilenames(
        title="Select NextWealth JSON Files",
        filetypes=[("JSON Files", "*.json")]
    )

    if not file_paths:
        print("No files selected. Exiting.")
        return

    for file_path in file_paths:
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                input_json = json.load(f)

            output_json = transform_json(input_json)

            base, _ = os.path.splitext(file_path)
            output_path = base + "_output.json"

            with open(output_path, "w", encoding="utf-8") as f:
                json.dump(output_json, f, indent=2, ensure_ascii=False)

            print(f"✔ Converted: {os.path.basename(file_path)} → {os.path.basename(output_path)}")

        except Exception as e:
            print(f"✖ Error processing {file_path}: {e}")

    print("\n🎉 All selected files converted successfully (where no errors occurred).")

# -----------------------------
# Entry Point
# -----------------------------
if __name__ == "__main__":
    main()
