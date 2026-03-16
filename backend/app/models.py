from sqlalchemy import Column, String, Text, TIMESTAMP
from sqlalchemy.sql import func
from app.db import Base


class TamilFile(Base):
    __tablename__ = "tamil_files"

    file_name = Column(String(255), primary_key=True, index=True)
    audio_file_path = Column(Text)
    transcript_json_path = Column(Text)
    converted_json_path = Column(Text)
    project_name = Column(Text)
    dataset_name = Column(Text)
    processing_status = Column(String(50), default="pending")
    dataloop_status = Column(String(50), default="pending")
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())


class EnglishFile(Base):
    __tablename__ = "english_files"

    file_name = Column(String(255), primary_key=True, index=True)
    audio_file_path = Column(Text)
    transcript_json_path = Column(Text)
    converted_json_path = Column(Text)
    project_name = Column(Text)
    dataset_name = Column(Text)
    processing_status = Column(String(50), default="pending")
    dataloop_status = Column(String(50), default="pending")
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())


class HindiFile(Base):
    __tablename__ = "hindi_files"

    file_name = Column(String(255), primary_key=True, index=True)
    audio_file_path = Column(Text)
    transcript_json_path = Column(Text)
    converted_json_path = Column(Text)
    project_name = Column(Text)
    dataset_name = Column(Text)
    processing_status = Column(String(50), default="pending")
    dataloop_status = Column(String(50), default="pending")
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())