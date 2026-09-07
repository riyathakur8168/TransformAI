import os
from typing import List, Dict, Any
import fitz  # PyMuPDF
import docx
import pptx

def extract_text_from_file(file_path: str, file_type: str) -> Dict[str, Any]:
    """
    Extracts raw text and metadata (page numbers, sections) from various file formats.
    """
    ext = os.path.splitext(file_path)[1].lower() if file_path else f".{file_type.lower()}"
    raw_text = ""
    pages = []

    if ext == ".pdf":
        doc = fitz.open(file_path)
        for page_num in range(len(doc)):
            page = doc[page_num]
            text = page.get_text("text")
            raw_text += f"\n--- Page {page_num + 1} ---\n" + text
            pages.append({
                "page_number": page_num + 1,
                "content": text.strip()
            })
        doc.close()

    elif ext == ".docx":
        doc = docx.Document(file_path)
        full_text = []
        for i, para in enumerate(doc.paragraphs):
            if para.text.strip():
                full_text.append(para.text)
                pages.append({
                    "page_number": (i // 10) + 1,
                    "section": para.style.name if hasattr(para, "style") else "Paragraph",
                    "content": para.text.strip()
                })
        raw_text = "\n\n".join(full_text)

    elif ext == ".pptx":
        prs = pptx.Presentation(file_path)
        full_text = []
        for idx, slide in enumerate(prs.slides):
            slide_text = []
            for shape in slide.shapes:
                if hasattr(shape, "text") and shape.text.strip():
                    slide_text.append(shape.text.strip())
            combined = "\n".join(slide_text)
            full_text.append(f"--- Slide {idx + 1} ---\n" + combined)
            pages.append({
                "page_number": idx + 1,
                "section": f"Slide {idx + 1}",
                "content": combined
            })
        raw_text = "\n\n".join(full_text)

    else:  # TXT or plain text fallback
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            raw_text = f.read()
        pages.append({
            "page_number": 1,
            "content": raw_text.strip()
        })

    cleaned_text = clean_text(raw_text)
    chunks = chunk_text(cleaned_text, pages)

    return {
        "raw_text": cleaned_text,
        "pages": pages,
        "chunks": chunks
    }

def clean_text(text: str) -> str:
    """Clean redundant whitespace and artifacts."""
    lines = [line.strip() for line in text.splitlines()]
    non_empty = [line for line in lines if line]
    return "\n".join(non_empty)

def chunk_text(text: str, pages: List[Dict[str, Any]], max_chunk_size: int = 1500) -> List[Dict[str, Any]]:
    """Splits document text into logical chunks for analysis."""
    chunks = []
    paragraphs = text.split("\n\n")
    current_chunk = ""
    chunk_index = 0

    for para in paragraphs:
        if len(current_chunk) + len(para) > max_chunk_size and current_chunk:
            chunks.append({
                "chunk_index": chunk_index,
                "content": current_chunk.strip(),
                "page_number": 1
            })
            chunk_index += 1
            current_chunk = para
        else:
            current_chunk += "\n\n" + para if current_chunk else para

    if current_chunk:
        chunks.append({
            "chunk_index": chunk_index,
            "content": current_chunk.strip(),
            "page_number": 1
        })

    return chunks
