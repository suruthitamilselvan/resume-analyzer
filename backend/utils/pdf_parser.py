import io

def extract_text_from_file(file_obj, extension: str) -> str:
    extension = extension.lower().strip(".")

    if extension == "txt":
        return file_obj.read().decode("utf-8", errors="ignore")

    elif extension == "pdf":
        try:
            import fitz  # PyMuPDF
            data = file_obj.read()
            doc = fitz.open(stream=data, filetype="pdf")
            text = ""
            for page in doc:
                text += page.get_text()
            return text.strip()
        except ImportError:
            try:
                import PyPDF2
                reader = PyPDF2.PdfReader(io.BytesIO(file_obj.read()))
                text = ""
                for page in reader.pages:
                    text += page.extract_text() or ""
                return text.strip()
            except:
                raise Exception("PDF parsing failed. Try pasting text directly.")

    elif extension in ("docx", "doc"):
        try:
            from docx import Document
            doc = Document(io.BytesIO(file_obj.read()))
            return "\n".join(para.text for para in doc.paragraphs if para.text.strip())
        except ImportError:
            raise Exception("Run: pip install python-docx")

    else:
        raise Exception(f"Unsupported file type: {extension}")