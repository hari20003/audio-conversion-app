import json
import os
import tempfile

from fastapi import APIRouter, UploadFile, File, HTTPException

router = APIRouter()


def convert_json_data_fallback(data: dict) -> dict:
    """
    Temporary fallback conversion.
    Replace this with your real convert_to_output_v1.py callable function.
    """
    annotations = data.get("annotations", [])
    transcript_json = []

    for item in annotations:
        label = item.get("label", "")
        text = item.get("coordinates", {}).get("text", "")
        start_time = item.get("metadata", {}).get("system", {}).get("startTime", 0)
        end_time = item.get("metadata", {}).get("system", {}).get("endTime", 0)

        transcript_json.append({
            "speaker": label,
            "text": text,
            "startTime": start_time,
            "endTime": end_time,
        })

    return {
        "transcriptJson": transcript_json
    }


@router.post("/convert-local-json")
async def convert_local_json(file: UploadFile = File(...)):
    try:
        content = await file.read()
        data = json.loads(content.decode("utf-8"))

        converted = convert_json_data_fallback(data)

        return {
            "message": "Conversion successful",
            "file_name": file.filename,
            "converted_json": converted
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))