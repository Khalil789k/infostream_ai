

import PyPDF2
import pdfplumber
from typing import Optional
import io


class PDFProcessor:

    
    @staticmethod
    def extract_text(file_path: Optional[str] = None, file_bytes: Optional[bytes] = None) -> str:

        if not file_path and not file_bytes:
            raise ValueError("Either file_path or file_bytes must be provided")
        
        text_content = []
        
        # Try pdfplumber first (better for complex PDFs)
        try:
            if file_bytes:
                with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
                    for page in pdf.pages:
                        page_text = page.extract_text()
                        if page_text:
                            text_content.append(page_text)
            else:
                with pdfplumber.open(file_path) as pdf:
                    for page in pdf.pages:
                        page_text = page.extract_text()
                        if page_text:
                            text_content.append(page_text)
        except Exception as e:
            print(f"pdfplumber extraction failed: {e}, trying PyPDF2...")
        
        # Fallback to PyPDF2 if pdfplumber failed or no content extracted
        if not text_content:
            try:
                if file_bytes:
                    pdf_file = io.BytesIO(file_bytes)
                else:
                    pdf_file = open(file_path, 'rb')
                
                pdf_reader = PyPDF2.PdfReader(pdf_file)
                
                for page in pdf_reader.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text_content.append(page_text)
                
                if not file_bytes:
                    pdf_file.close()
            except Exception as e:
                print(f"PyPDF2 extraction failed: {e}")
                raise Exception(f"Failed to extract text from PDF: {str(e)}")
        
        full_text = '\n\n'.join(text_content)
        
        if not full_text.strip():
            raise Exception("No text content found in PDF")
        
        return full_text.strip()

