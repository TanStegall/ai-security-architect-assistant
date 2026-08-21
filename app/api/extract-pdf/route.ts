import { NextRequest, NextResponse } from "next/server";
import { extractText, getDocumentProxy } from "unpdf";

/**
 * Accepts a PDF file upload and returns its extracted text.
 * The frontend then drops that text straight into the existing
 * "Describe the architecture" textarea — the rest of the pipeline
 * (Analyze -> Claude -> MCP -> findings) is completely unchanged,
 * since it only ever cared about receiving a text description.
 *
 * Uses unpdf instead of pdf-parse — pdf-parse's module packaging
 * repeatedly broke under Next.js's bundler (default export mismatches,
 * MODULE_NOT_FOUND on internal paths). unpdf is a modern package built
 * specifically for serverless/edge Node environments like this one.
 */

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Only PDF files are supported." }, { status: 400 });
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: "File is too large. Max size is 10MB." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    const pdf = await getDocumentProxy(uint8Array);
    const { text } = await extractText(pdf, { mergePages: true });
    const trimmed = text.trim();

    if (!trimmed) {
      return NextResponse.json(
        { error: "Couldn't find any text in that PDF — it may be a scanned image without a text layer." },
        { status: 422 }
      );
    }

    return NextResponse.json({ text: trimmed });
  } catch (err) {
    console.error("PDF extraction error:", err);
    return NextResponse.json({ error: "Something went wrong reading that PDF." }, { status: 500 });
  }
}
