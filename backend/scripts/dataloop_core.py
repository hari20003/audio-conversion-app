import os
import sys
import json
from pathlib import Path

import dtlpy as dl


def ensure_stdio():
    if sys.stdout is None:
        sys.stdout = sys.__stdout__ if sys.__stdout__ is not None else open(os.devnull, "w")
    if sys.stderr is None:
        sys.stderr = sys.__stderr__ if sys.__stderr__ is not None else open(os.devnull, "w")


def item_best_name(it: object) -> str:
    for attr in ["name", "filename", "filepath", "file_path", "filePath", "path"]:
        v = getattr(it, attr, None)
        if isinstance(v, str) and v.strip():
            return v.strip()
    return ""


def build_item_index(dataset, log):
    by_basename = {}
    by_stem = {}

    log("Indexing dataset items (this can take time for large datasets)...")

    try:
        first_page = dataset.items.list(page_size=10)
        for page in first_page:
            log(f"Connected ✅ (fetched first page with {len(list(page))} items)")
            break
    except Exception as e:
        raise RuntimeError(f"Failed to list items (connectivity/permission issue): {e}")

    pages = dataset.items.list(page_size=1000)
    total = 0

    for page in pages:
        for it in page:
            total += 1
            name = item_best_name(it)
            base = os.path.basename(name) if name else ""
            stem = os.path.splitext(base)[0] if base else ""
            if base:
                by_basename[base.lower()] = it
            if stem:
                by_stem.setdefault(stem.lower(), []).append(it)

        if total % 5000 == 0:
            log(f"... indexed {total} items so far")

    log(f"Indexed {total} items in dataset")
    return by_basename, by_stem


def match_item(by_basename, by_stem, file_name: str):
    base = os.path.basename(file_name).strip().lower()
    stem = os.path.splitext(base)[0].strip().lower()
    if base in by_basename:
        return by_basename[base]
    if stem in by_stem:
        return by_stem[stem][0]
    return None


def guess_audio_candidates_from_json(json_path: str):
    base = os.path.basename(json_path)
    stem = os.path.splitext(base)[0]
    if stem.endswith("_output"):
        stem = stem[:-7]
    return [stem + ext for ext in [".mp3", ".wav", ".flac", ".m4a", ".ogg"]]


def import_one_json(dataset, by_basename, by_stem, json_path: str, log):
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    annotations = data.get("annotations", [])
    if not isinstance(annotations, list) or not annotations:
        raise RuntimeError("JSON must contain a non-empty 'annotations' list.")

    item = None
    chosen_name = None
    for cand in guess_audio_candidates_from_json(json_path):
        item = match_item(by_basename, by_stem, cand)
        if item is not None:
            chosen_name = cand
            break

    if item is None:
        raise RuntimeError(
            "Could not find the audio item in the dataset. "
            "Make sure the audio is uploaded and the JSON name matches the audio name."
        )

    log(f"Matched: {Path(json_path).name}  ->  {chosen_name}  ({item_best_name(item)})")

    builder = item.annotations.builder()
    uploaded = 0
    skipped = 0

    for ann in annotations:
        if (ann.get("type") or "").lower() != "subtitle":
            continue

        speaker = (ann.get("label") or "Speaker").strip()
        sys_meta = ((ann.get("metadata") or {}).get("system") or {})
        start = sys_meta.get("startTime")
        end = sys_meta.get("endTime")

        coords = ann.get("coordinates") or {}
        text = coords.get("text") if isinstance(coords, dict) else None
        text = (text or "").strip()

        if start is None or end is None or not text:
            skipped += 1
            continue

        try:
            start_s = float(start)
            end_s = float(end)
        except Exception:
            skipped += 1
            continue

        if end_s <= start_s:
            skipped += 1
            continue

        builder.add(
            annotation_definition=dl.Subtitle(label=speaker, text=text),
            start_time=start_s,
            end_time=end_s
        )
        uploaded += 1

    item.annotations.upload(builder)
    return uploaded, skipped


def bulk_import(project_name: str, dataset_name: str, folder: str, log):
    ensure_stdio()

    try:
        dl.client_api.verbose.disable_progress_bar_iterate_pages = True
    except Exception:
        pass

    log("Logging in to Dataloop...")
    dl.login()

    log(f"Opening project='{project_name}', dataset='{dataset_name}' ...")
    project = dl.projects.get(project_name=project_name)
    dataset = project.datasets.get(dataset_name=dataset_name)

    by_basename, by_stem = build_item_index(dataset, log)

    folder_path = Path(folder)
    json_files = sorted(folder_path.glob("*_output.json"))
    if not json_files:
        raise RuntimeError(f"No '*_output.json' files found in: {folder}")

    log(f"Found {len(json_files)} JSON files. Starting upload...\n")

    ok = 0
    fail = 0
    total_uploaded = 0
    total_skipped = 0

    for j in json_files:
        try:
            uploaded, skipped = import_one_json(dataset, by_basename, by_stem, str(j), log)
            ok += 1
            total_uploaded += uploaded
            total_skipped += skipped
            log(f"  ✅ Uploaded: {uploaded} | Skipped: {skipped}\n")
        except Exception as e:
            fail += 1
            log(f"  ❌ FAILED: {j.name}\n    Reason: {e}\n")

    log("----- SUMMARY -----")
    log(f"Success: {ok}, Failed: {fail}")
    log(f"Total subtitle segments uploaded: {total_uploaded}")
    log(f"Total skipped: {total_skipped}")
    log("-------------------")


def bulk_import_from_web(project_name: str, dataset_name: str, folder: str):
    logs = []

    def log(msg: str):
        logs.append(msg)

    bulk_import(project_name, dataset_name, folder, log)

    return {
        "message": "Bulk upload to Dataloop completed",
        "logs": logs
    }