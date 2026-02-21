import { PDFParse } from "pdf-parse";

export async function extractPdf(buffer: Buffer): Promise<string> {
  const pdf = new PDFParse({ data: new Uint8Array(buffer) });
  const result = await pdf.getText();
  return result.text;
}
