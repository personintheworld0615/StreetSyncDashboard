import { jsPDF } from "jspdf";
import { format } from "date-fns";
import { categoryLabel } from "@/lib/categories";
import { reportTitle, statusLabel } from "@/lib/format";
import { reportImageCandidates } from "@/lib/report-image";
import type { Report, ReportStatus, ReportUpdate } from "@/lib/types";

type ImagePayload = {
  dataUrl: string;
  format: "JPEG" | "PNG";
  width: number;
  height: number;
};

const COLORS = {
  ink: [17, 24, 39] as const,
  muted: [107, 114, 128] as const,
  soft: [156, 163, 175] as const,
  line: [229, 231, 235] as const,
  panel: [247, 248, 250] as const,
  white: [255, 255, 255] as const,
  accent: [17, 24, 39] as const,
  openBg: [243, 244, 246] as const,
  openFg: [75, 85, 99] as const,
  activeBg: [255, 241, 232] as const,
  activeFg: [234, 88, 12] as const,
  resolvedBg: [230, 244, 241] as const,
  resolvedFg: [15, 118, 110] as const,
};

function pdfSafe(text: string) {
  return text
    .replace(/[→➜➔⟶]/g, " to ")
    .replace(/[—–]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'");
}

function statusChip(status: string) {
  if (status === "In Progress") return "Active";
  return status;
}

function statusPalette(status: ReportStatus) {
  if (status === "In Progress") {
    return { bg: COLORS.activeBg, fg: COLORS.activeFg };
  }
  if (status === "Resolved") {
    return { bg: COLORS.resolvedBg, fg: COLORS.resolvedFg };
  }
  return { bg: COLORS.openBg, fg: COLORS.openFg };
}

function setFill(doc: jsPDF, rgb: readonly [number, number, number]) {
  doc.setFillColor(rgb[0], rgb[1], rgb[2]);
}

function setStroke(doc: jsPDF, rgb: readonly [number, number, number]) {
  doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
}

function setText(doc: jsPDF, rgb: readonly [number, number, number]) {
  doc.setTextColor(rgb[0], rgb[1], rgb[2]);
}

async function fetchImageBlob(imageUrl: string): Promise<Blob | null> {
  const sources: string[] = [];
  for (const candidate of reportImageCandidates(imageUrl)) {
    sources.push(candidate);
    sources.push(`/api/image-proxy?url=${encodeURIComponent(candidate)}`);
  }

  for (const src of sources) {
    try {
      const res = await fetch(src, { cache: "no-store" });
      if (!res.ok) continue;
      const blob = await res.blob();
      if (blob.size < 32) continue;
      // Storage often labels JPEGs as octet-stream. Decode instead of trusting type.
      const bitmap = await createImageBitmap(blob);
      bitmap.close();
      return blob;
    } catch {
      // try the next URL
    }
  }
  return null;
}

async function loadReportImage(
  imageUrl: string,
  preview?: HTMLImageElement | null
): Promise<ImagePayload | null> {
  if (preview && preview.complete && preview.naturalWidth > 0) {
    try {
      const maxSide = 1400;
      const scale = Math.min(
        1,
        maxSide / Math.max(preview.naturalWidth, preview.naturalHeight)
      );
      const width = Math.max(1, Math.round(preview.naturalWidth * scale));
      const height = Math.max(1, Math.round(preview.naturalHeight * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(preview, 0, 0, width, height);
        return {
          dataUrl: canvas.toDataURL("image/jpeg", 0.86),
          format: "JPEG",
          width,
          height,
        };
      }
    } catch {
      // Canvas can be tainted; fall through to a same-origin fetch.
    }
  }

  try {
    const blob = await fetchImageBlob(imageUrl);
    if (!blob) return null;

    const bitmap = await createImageBitmap(blob);
    try {
      const maxSide = 1400;
      const scale = Math.min(
        1,
        maxSide / Math.max(bitmap.width, bitmap.height)
      );
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(bitmap, 0, 0, width, height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.86);

      return { dataUrl, format: "JPEG", width, height };
    } finally {
      bitmap.close();
    }
  } catch {
    return null;
  }
}

function ensureSpace(doc: jsPDF, y: number, needed: number, margin: number) {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y + needed <= pageHeight - margin) return y;
  doc.addPage();
  return margin;
}

function drawPill(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  bg: readonly [number, number, number],
  fg: readonly [number, number, number]
) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  const padX = 8;
  const w = doc.getTextWidth(text) + padX * 2;
  const h = 16;
  setFill(doc, bg);
  doc.roundedRect(x, y - 11, w, h, 8, 8, "F");
  setText(doc, fg);
  doc.text(text, x + padX, y);
  setText(doc, COLORS.ink);
  return w;
}

function drawSectionLabel(doc: jsPDF, label: string, x: number, y: number) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  setText(doc, COLORS.muted);
  doc.text(label.toUpperCase(), x, y);
  setText(doc, COLORS.ink);
}

function drawCard(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number
) {
  setFill(doc, COLORS.white);
  setStroke(doc, COLORS.line);
  doc.setLineWidth(1);
  doc.roundedRect(x, y, w, h, 10, 10, "FD");
}

export async function downloadWorkOrderPdf(
  report: Report,
  updates: ReportUpdate[],
  previewImage?: HTMLImageElement | null
) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // Header band
  setFill(doc, COLORS.accent);
  doc.rect(0, 0, pageWidth, 78, "F");
  setText(doc, COLORS.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("StreetSync", margin, 34);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Municipal Work Order", margin, 52);
  doc.setFontSize(9);
  doc.text(
    `Generated ${format(new Date(), "MMM d, yyyy · h:mm a")}`,
    pageWidth - margin,
    34,
    { align: "right" }
  );
  doc.text("Plainsboro, NJ", pageWidth - margin, 52, { align: "right" });
  setText(doc, COLORS.ink);
  y = 98;

  // Title + status
  const title = reportTitle(report);
  const titleLines = doc.splitTextToSize(title, contentWidth - 110);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(titleLines, margin, y);
  const status = statusPalette(report.status);
  drawPill(
    doc,
    statusLabel(report.status),
    pageWidth - margin - 70,
    y,
    status.bg,
    status.fg
  );
  y += titleLines.length * 22 + 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  setText(doc, COLORS.muted);
  doc.text(
    `${categoryLabel(report.category)}  ·  Report #${report.id}`,
    margin,
    y
  );
  setText(doc, COLORS.ink);
  y += 18;

  // Details card
  const filed = Number.isNaN(+new Date(report.time))
    ? report.time
    : format(new Date(report.time), "MMM d, yyyy · h:mm a");
  const details: [string, string][] = [
    ["Location", report.location || "Unknown"],
    [
      "Coordinates",
      `${report.latitude.toFixed(5)}, ${report.longitude.toFixed(5)}`,
    ],
    ["Filed", filed],
    ["Category", categoryLabel(report.category)],
  ];

  const detailRows = details.map(([label, value]) => {
    const lines = doc.splitTextToSize(value, contentWidth / 2 - 28);
    return { label, lines, height: Math.max(28, 14 + lines.length * 12) };
  });
  const leftH = detailRows[0].height + detailRows[2].height;
  const rightH = detailRows[1].height + detailRows[3].height;
  const detailsH = Math.max(leftH, rightH) + 36;

  y = ensureSpace(doc, y, detailsH + 16, margin);
  drawSectionLabel(doc, "Details", margin, y);
  y += 10;
  drawCard(doc, margin, y, contentWidth, detailsH);
  const cardTop = y + 18;
  const colGap = 16;
  const colW = (contentWidth - 32 - colGap) / 2;
  const col1X = margin + 16;
  const col2X = col1X + colW + colGap;

  const drawDetail = (
    item: { label: string; lines: string[] },
    x: number,
    rowY: number
  ) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    setText(doc, COLORS.soft);
    doc.text(item.label.toUpperCase(), x, rowY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    setText(doc, COLORS.ink);
    doc.text(item.lines, x, rowY + 14);
  };

  drawDetail(detailRows[0], col1X, cardTop);
  drawDetail(detailRows[1], col2X, cardTop);
  drawDetail(detailRows[2], col1X, cardTop + detailRows[0].height);
  drawDetail(detailRows[3], col2X, cardTop + detailRows[1].height);
  y += detailsH + 20;

  // Description
  const description = report.description || "No description provided.";
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  const descLines = doc.splitTextToSize(description, contentWidth - 32);
  const descH = 28 + descLines.length * 15;
  y = ensureSpace(doc, y, descH + 24, margin);
  drawSectionLabel(doc, "Description", margin, y);
  y += 10;
  drawCard(doc, margin, y, contentWidth, descH);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  setText(doc, COLORS.ink);
  doc.text(descLines, margin + 16, y + 22);
  y += descH + 20;

  // Photo
  if (report.image?.trim()) {
    const image = await loadReportImage(report.image.trim(), previewImage);
    if (image) {
      const maxW = contentWidth - 32;
      const maxH = 230;
      const ratio = Math.min(maxW / image.width, maxH / image.height);
      const drawW = image.width * ratio;
      const drawH = image.height * ratio;
      const photoH = drawH + 28;
      y = ensureSpace(doc, y, photoH + 24, margin);
      drawSectionLabel(doc, "Photo evidence", margin, y);
      y += 10;
      drawCard(doc, margin, y, contentWidth, photoH);
      try {
        doc.addImage(
          image.dataUrl,
          image.format,
          margin + 16,
          y + 14,
          drawW,
          drawH,
          undefined,
          "FAST"
        );
      } catch {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        setText(doc, COLORS.muted);
        doc.text("Photo could not be embedded.", margin + 16, y + 28);
        setText(doc, COLORS.ink);
      }
      y += photoH + 20;
    } else {
      y = ensureSpace(doc, y, 64, margin);
      drawSectionLabel(doc, "Photo evidence", margin, y);
      y += 10;
      drawCard(doc, margin, y, contentWidth, 48);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      setText(doc, COLORS.muted);
      doc.text(
        "A photo is attached to this report but could not be loaded.",
        margin + 16,
        y + 28
      );
      setText(doc, COLORS.ink);
      y += 64;
    }
  }

  // Update history
  y = ensureSpace(doc, y, 40, margin);
  drawSectionLabel(doc, "Update history", margin, y);
  y += 14;

  if (updates.length === 0) {
    y = ensureSpace(doc, y, 48, margin);
    drawCard(doc, margin, y, contentWidth, 40);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    setText(doc, COLORS.muted);
    doc.text("No updates yet.", margin + 16, y + 24);
    setText(doc, COLORS.ink);
    y += 52;
  } else {
    const chronological = [...updates].reverse();
    for (const update of chronological) {
      const statusChanged = update.old_status !== update.new_status;
      const headline = pdfSafe(
        statusChanged
          ? `${statusChip(update.old_status)} to ${statusChip(update.new_status)}`
          : "Staff comment"
      );
      const when = Number.isNaN(+new Date(update.created_at))
        ? update.created_at
        : format(new Date(update.created_at), "MMM d, yyyy · h:mm a");
      const comment = pdfSafe(update.comment?.trim() || "");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const commentLines = comment
        ? doc.splitTextToSize(comment, contentWidth - 40)
        : [];
      const blockHeight = 36 + (commentLines.length ? 8 + commentLines.length * 13 : 0);

      y = ensureSpace(doc, y, blockHeight + 10, margin);
      setFill(doc, COLORS.panel);
      setStroke(doc, COLORS.line);
      doc.roundedRect(margin, y, contentWidth, blockHeight, 10, 10, "FD");

      // accent bar
      setFill(doc, COLORS.accent);
      doc.roundedRect(margin, y, 4, blockHeight, 2, 2, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      setText(doc, COLORS.ink);
      doc.text(headline, margin + 16, y + 18);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      setText(doc, COLORS.muted);
      doc.text(when, pageWidth - margin - 16, y + 18, { align: "right" });

      if (commentLines.length) {
        setText(doc, COLORS.ink);
        doc.setFontSize(10);
        doc.text(commentLines, margin + 16, y + 36);
      }
      y += blockHeight + 10;
    }
  }

  // Signature / sign-off
  const sigH = 126;
  y = ensureSpace(doc, y, sigH + 28, margin);
  drawSectionLabel(doc, "Sign-off", margin, y);
  y += 10;
  drawCard(doc, margin, y, contentWidth, sigH);

  const sigGap = 24;
  const sigColW = (contentWidth - 32 - sigGap) / 2;
  const sigLeft = margin + 16;
  const sigRight = sigLeft + sigColW + sigGap;
  const sigLineY = y + 58;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  setText(doc, COLORS.soft);
  doc.text("COMPLETED BY", sigLeft, y + 22);
  doc.text("DATE", sigRight, y + 22);

  setStroke(doc, COLORS.line);
  doc.setLineWidth(1);
  doc.line(sigLeft, sigLineY, sigLeft + sigColW, sigLineY);
  doc.line(sigRight, sigLineY, sigRight + sigColW, sigLineY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  setText(doc, COLORS.muted);
  doc.text("Signature / printed name", sigLeft, sigLineY + 14);
  doc.text("MM / DD / YYYY", sigRight, sigLineY + 14);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  setText(doc, COLORS.soft);
  doc.text("SUPERVISOR", sigLeft, y + 102);
  setStroke(doc, COLORS.line);
  doc.line(sigLeft + 78, y + 102, pageWidth - margin - 16, y + 102);
  setText(doc, COLORS.ink);

  // Footer on each page
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i += 1) {
    doc.setPage(i);
    setStroke(doc, COLORS.line);
    doc.setLineWidth(1);
    doc.line(margin, pageHeight - 28, pageWidth - margin, pageHeight - 28);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    setText(doc, COLORS.soft);
    doc.text("StreetSync · Internal use", margin, pageHeight - 14);
    doc.text(`Page ${i} of ${pages}`, pageWidth - margin, pageHeight - 14, {
      align: "right",
    });
  }

  doc.save(`work-order-${report.id}.pdf`);
}
