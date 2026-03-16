from app.models import TamilFile, EnglishFile, HindiFile


def get_model_by_language(language: str):
    language = language.lower()

    if language in ["ta", "tamil"]:
        return TamilFile
    elif language in ["en", "english"]:
        return EnglishFile
    elif language in ["hi", "hindi"]:
        return HindiFile
    else:
        raise ValueError(f"Unsupported language: {language}")