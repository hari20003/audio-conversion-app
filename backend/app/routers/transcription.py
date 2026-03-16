import os
import json
import shutil
from io import BytesIO

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends, Body
from sqlalchemy.orm import Session

from elevenlabs.client import ElevenLabs

from app.db import get_db
from app.config import UPLOAD_DIR, OUTPUT_DIR
from app.utils.language_table import get_model_by_language

router = APIRouter()

MODEL_ID = "scribe_v2"

SPEAKER_ID_MAP = {
    "speaker_0": "Speaker A",
    "speaker_1": "Speaker B",
}


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


@router.post("/bulk-upload")
async def bulk_upload_audio(
    files: list[UploadFile] = File(...),
    language: str = Form(...),
    project_name: str = Form(""),
    dataset_name: str = Form(""),
    db: Session = Depends(get_db),
):
    try:
        os.makedirs(UPLOAD_DIR, exist_ok=True)

        ModelClass = get_model_by_language(language)

        saved_files = []
        skipped_files = []

        for file in files:
            file_path = os.path.join(UPLOAD_DIR, file.filename)

            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)

            existing = db.query(ModelClass).filter(ModelClass.file_name == file.filename).first()

            if existing:
                skipped_files.append({
                    "file_name": file.filename,
                    "reason": "Already exists"
                })
                continue

            record = ModelClass(
                file_name=file.filename,
                audio_file_path=file_path,
                project_name=project_name,
                dataset_name=dataset_name,
                processing_status="uploaded",
                dataloop_status="pending"
            )

            db.add(record)
            saved_files.append(file.filename)

        db.commit()

        return {
            "message": "Bulk upload completed",
            "language": language,
            "saved_files": saved_files,
            "skipped_files": skipped_files,
            "total_uploaded": len(saved_files),
            "total_skipped": len(skipped_files)
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/process-audio")
async def process_audio(
    file: UploadFile = File(...),
    language: str = Form("ta"),
    project_name: str = Form(""),
    dataset_name: str = Form(""),
    db: Session = Depends(get_db),
):
    try:
        os.makedirs(UPLOAD_DIR, exist_ok=True)
        os.makedirs(OUTPUT_DIR, exist_ok=True)

        file_path = os.path.join(UPLOAD_DIR, file.filename)

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        api_key = os.getenv("ELEVENLABS_API_KEY", "")
        if not api_key:
            raise HTTPException(status_code=500, detail="ELEVENLABS_API_KEY is missing in .env")

        result = process_audio_to_json(
            audio_path=file_path,
            output_dir=OUTPUT_DIR,
            api_key=api_key,
            language_code=language
        )

        ModelClass = get_model_by_language(language)

        existing = db.query(ModelClass).filter(ModelClass.file_name == result["audio_file_name"]).first()

        if existing:
            existing.audio_file_path = file_path
            existing.transcript_json_path = result["output_json_path"]
            existing.project_name = project_name
            existing.dataset_name = dataset_name
            existing.processing_status = "processed"
            existing.dataloop_status = "pending"
        else:
            record = ModelClass(
                file_name=result["audio_file_name"],
                audio_file_path=file_path,
                transcript_json_path=result["output_json_path"],
                project_name=project_name,
                dataset_name=dataset_name,
                processing_status="processed",
                dataloop_status="pending"
            )
            db.add(record)

        db.commit()

        return {
            "message": "Audio processed successfully",
            "audio_file_name": result["audio_file_name"],
            "transcript_json_path": result["output_json_path"],
            "annotations_count": result["annotations_count"],
            "output_json": result["output_json"]
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/files-by-language")
def files_by_language(language: str, db: Session = Depends(get_db)):
    try:
        ModelClass = get_model_by_language(language)
        rows = db.query(ModelClass).all()

        files = []
        for row in rows:
            files.append({
                "file_name": row.file_name,
                "audio_file_path": row.audio_file_path,
                "transcript_json_path": row.transcript_json_path,
                "project_name": row.project_name,
                "dataset_name": row.dataset_name,
                "processing_status": row.processing_status,
                "dataloop_status": row.dataloop_status,
            })

        return {"language": language, "files": files}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/json/{file_name}")
def get_json(file_name: str, language: str, db: Session = Depends(get_db)):
    try:
        ModelClass = get_model_by_language(language)
        row = db.query(ModelClass).filter(ModelClass.file_name == file_name).first()

        if not row:
            raise HTTPException(status_code=404, detail="File not found")

        if not row.transcript_json_path:
            raise HTTPException(status_code=404, detail="Transcript JSON path not found")

        if not os.path.exists(row.transcript_json_path):
            raise HTTPException(status_code=404, detail="JSON file does not exist on disk")

        with open(row.transcript_json_path, "r", encoding="utf-8") as f:
            json_data = json.load(f)

        return {
            "file_name": row.file_name,
            "language": language,
            "json_data": json_data
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/json/{file_name}")
def update_json(
    file_name: str,
    language: str,
    payload: dict = Body(...),
    db: Session = Depends(get_db)
):
    try:
        ModelClass = get_model_by_language(language)
        row = db.query(ModelClass).filter(ModelClass.file_name == file_name).first()

        if not row:
            raise HTTPException(status_code=404, detail="File not found")

        if not row.transcript_json_path:
            raise HTTPException(status_code=404, detail="Transcript JSON path not found")

        os.makedirs(os.path.dirname(row.transcript_json_path), exist_ok=True)

        with open(row.transcript_json_path, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)

        return {
            "message": "JSON updated successfully",
            "file_name": file_name,
            "language": language
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))