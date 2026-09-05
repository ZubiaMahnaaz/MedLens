import fs from 'fs';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';

/**
 * OCR & Text Extraction Service
 * Reads PDF files or text documents and extracts complete text content with layout coordinates.
 */
export async function extractTextFromFile(filePath, mimeType) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found at ${filePath}`);
  }

  if (mimeType === 'application/pdf' || filePath.toLowerCase().endsWith('.pdf')) {
    const dataBuffer = fs.readFileSync(filePath);
    
    // Primary engine: pdfjs-dist
    try {
      const uint8 = new Uint8Array(dataBuffer);
      const loadingTask = pdfjsLib.getDocument({
        data: uint8,
        isEvalSupported: false,
        useSystemFonts: true
      });
      const pdf = await loadingTask.promise;
      
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        let lastY = null;
        let pageText = '';

        for (const item of textContent.items) {
          if (!item.str && item.str !== '') continue;
          
          if (lastY !== null && Math.abs(item.transform[5] - lastY) > 5) {
            pageText += '\n';
          } else if (pageText.length > 0 && !pageText.endsWith('\n') && !pageText.endsWith(' ')) {
            pageText += ' ';
          }
          pageText += item.str;
          lastY = item.transform[5];
        }
        fullText += pageText + '\n';
      }

      const cleanText = fullText.trim();
      if (cleanText.length > 0) {
        return {
          text: cleanText,
          numPages: pdf.numPages,
          info: {}
        };
      }
    } catch (pdfjsErr) {
      console.warn('pdfjs-dist primary extraction failed, attempting pdf-parse fallback:', pdfjsErr.message);
    }

    // Secondary fallback engine: pdf-parse
    try {
      const pdfData = await pdfParse(dataBuffer);
      if (pdfData.text && pdfData.text.trim().length > 0) {
        return {
          text: pdfData.text.trim(),
          numPages: pdfData.numpages || 1,
          info: pdfData.info || {}
        };
      }
    } catch (fallbackErr) {
      console.error('All PDF extraction engines failed:', fallbackErr.message);
    }

    throw new Error('Unable to extract text content from the uploaded PDF document. Please ensure it is a valid text-based or OCR-readable PDF.');
  }

  // Text file handler
  if (mimeType.startsWith('text/') || filePath.endsWith('.txt')) {
    const text = fs.readFileSync(filePath, 'utf8');
    return {
      text: text.trim(),
      numPages: 1,
      info: {}
    };
  }

  return {
    text: '',
    numPages: 1,
    info: {}
  };
}
