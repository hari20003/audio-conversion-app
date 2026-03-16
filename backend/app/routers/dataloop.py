import os
import shutil

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db import get_db
from app.services.dataloop_service import (
    upload_selected_files_to_dataloop,
    upload_local_file_to_dataloop,
)

router = APIRouter()


class BulkUploadRequest(BaseModel):
    language: str
    file_names: list[str]
    project_name: str | None = None
    dataset_name: str | None = None


@router.post("/bulk-upload")
def bulk_upload_to_dataloop(payload: BulkUploadRequest, db: Session = Depends(get_db)):
    try:
        return upload_selected_files_to_dataloop(payload, db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/upload-local-file")
async def upload_local_file(
    file: UploadFile = File(...),
    language: str = Form(...),
    project_name: str = Form(...),
    dataset_name: str = Form(...),
):
    try:
        temp_upload_dir = "uploads"
        os.makedirs(temp_upload_dir, exist_ok=True)

        temp_file_path = os.path.join(temp_upload_dir, file.filename)

        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        result = upload_local_file_to_dataloop(
            file_path=temp_file_path,
            original_filename=file.filename,
            project_name=project_name,
            dataset_name=dataset_name,
        )

        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))