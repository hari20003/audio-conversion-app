import os
import shutil
import tempfile
from pathlib import Path

from app.utils.language_table import get_model_by_language
from scripts.dataloop_core import bulk_import_from_web

def upload_selected_files_to_dataloop(payload, db):
    """
    Upload files that already exist in the database.
    """

    ModelClass = get_model_by_language(payload.language)

    rows = db.query(ModelClass).filter(
        ModelClass.file_name.in_(payload.file_names)
    ).all()

    if not rows:
        return {
            "message": "No matching files found",
            "uploaded_files": [],
            "skipped_files": payload.file_names,
            "logs": []
        }

    temp_dir = tempfile.mkdtemp(prefix="dataloop_bulk_")

    uploaded_files = []
    skipped_files = []

    project_name = payload.project_name
    dataset_name = payload.dataset_name

    if not project_name or not dataset_name:
        first_row = rows[0]
        project_name = project_name or first_row.project_name
        dataset_name = dataset_name or first_row.dataset_name

    for row in rows:

        if not row.transcript_json_path:
            skipped_files.append({
                "file_name": row.file_name,
                "reason": "Transcript JSON path missing"
            })
            continue

        if not os.path.exists(row.transcript_json_path):
            skipped_files.append({
                "file_name": row.file_name,
                "reason": "Transcript JSON file not found"
            })
            continue

        src = Path(row.transcript_json_path)
        dst = Path(temp_dir) / src.name

        shutil.copy2(src, dst)

        uploaded_files.append(row.file_name)

    if not uploaded_files:
        return {
            "message": "No valid JSON files found for upload",
            "uploaded_files": [],
            "skipped_files": skipped_files,
            "logs": []
        }

    result = bulk_import_from_web(
        project_name=project_name,
        dataset_name=dataset_name,
        folder=temp_dir
    )

    for row in rows:
        if row.file_name in uploaded_files:
            row.dataloop_status = "uploaded"

    db.commit()

    return {
        "message": result.get("message", "Upload completed"),
        "uploaded_files": uploaded_files,
        "skipped_files": skipped_files,
        "logs": result.get("logs", [])
    }


def upload_local_file_to_dataloop(file_path, original_filename, project_name, dataset_name):
    """
    Upload a file directly from local drive.
    """

    temp_dir = tempfile.mkdtemp(prefix="dataloop_local_")

    src = Path(file_path)
    dst = Path(temp_dir) / src.name

    shutil.copy2(src, dst)

    result = bulk_import_from_web(
        project_name=project_name,
        dataset_name=dataset_name,
        folder=temp_dir
    )

    return {
        "message": f"{original_filename} uploaded successfully",
        "file_name": original_filename,
        "logs": result.get("logs", [])
    }