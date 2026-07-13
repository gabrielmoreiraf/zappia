import PDFDocument from "pdfkit";
import sharp from "sharp";

/**
 * Gerador de PDF com a cara da marca: logo do cliente + nome no cabeçalho,
 * quem exportou e quando, tabela de dados, e o rodapé com a logo do Zappia.
 * Pensado pra qualquer exportação (leads hoje, outras telas depois).
 */

const ZAPPIA_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#10b981"/>
  <g transform="translate(14,14) scale(1.5)" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 8V4H8"/>
    <rect width="16" height="12" x="4" y="8" rx="2"/>
    <path d="M2 14h2"/>
    <path d="M20 14h2"/>
    <path d="M15 13v2"/>
    <path d="M9 13v2"/>
  </g>
</svg>`;

let zappiaLogoCache: Buffer | null = null;
async function getZappiaLogoPng(): Promise<Buffer> {
  if (!zappiaLogoCache) {
    zappiaLogoCache = await sharp(Buffer.from(ZAPPIA_ICON_SVG)).resize(64, 64).png().toBuffer();
  }
  return zappiaLogoCache;
}

function decodeDataUrlImage(dataUrl: string): Buffer | null {
  const m = /^data:image\/[^;]+;base64,(.+)$/.exec(dataUrl);
  return m ? Buffer.from(m[1], "base64") : null;
}

export interface PdfColumn {
  label: string;
  width: number;
}

export interface BrandedTablePdfOptions {
  title: string;
  subtitle?: string;
  clientName: string;
  clientLogoDataUrl?: string | null;
  exportedByName: string;
  exportedByEmail: string;
  columns: PdfColumn[];
  rows: string[][];
}

export async function buildBrandedTablePdf(
  opts: BrandedTablePdfOptions,
): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", margin: 40, bufferPages: true });
  const chunks: Buffer[] = [];
  doc.on("data", (c) => chunks.push(c));
  const done = new Promise<Buffer>((resolve) =>
    doc.on("end", () => resolve(Buffer.concat(chunks))),
  );

  const [zappiaLogo, clientLogo] = await Promise.all([
    getZappiaLogoPng(),
    opts.clientLogoDataUrl
      ? Promise.resolve(decodeDataUrlImage(opts.clientLogoDataUrl))
      : Promise.resolve(null),
  ]);

  const left = doc.page.margins.left;
  const pageWidth = doc.page.width - left - doc.page.margins.right;
  const now = new Date();
  const dateTimeLabel =
    now.toLocaleDateString("pt-BR") +
    " às " +
    now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  function drawHeader() {
    const top = doc.page.margins.top;
    const hasLogo = !!clientLogo;
    if (clientLogo) {
      doc.image(clientLogo, left, top, { width: 32, height: 32 });
    }
    doc
      .font("Helvetica-Bold")
      .fontSize(13)
      .fillColor("#0f172a")
      .text(opts.clientName, left + (hasLogo ? 42 : 0), top + (hasLogo ? 4 : 0), {
        width: pageWidth - 200,
      });
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor("#64748b")
      .text(
        `Exportado por ${opts.exportedByName} (${opts.exportedByEmail})`,
        left + (hasLogo ? 42 : 0),
        top + (hasLogo ? 20 : 18),
        { width: pageWidth - 200 },
      );
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#64748b")
      .text(dateTimeLabel, left, top, { width: pageWidth, align: "right" });

    const lineY = top + 40;
    doc
      .moveTo(left, lineY)
      .lineTo(left + pageWidth, lineY)
      .strokeColor("#e2e8f0")
      .lineWidth(1)
      .stroke();
    doc.y = lineY + 12;
  }

  function drawFooter(pageNum: number) {
    // Dentro da margem inferior (não abaixo dela), senão o PDFKit entende que
    // estourou a página e insere uma página em branco só pro rodapé.
    const bottom = doc.page.height - doc.page.margins.bottom - 14;
    doc.image(zappiaLogo, left, bottom, { width: 12, height: 12 });
    doc
      .font("Helvetica")
      .fontSize(7.5)
      .fillColor("#94a3b8")
      .text("Gerado pelo Zappia", left + 16, bottom + 1.5);
    doc
      .font("Helvetica")
      .fontSize(7.5)
      .fillColor("#94a3b8")
      .text(`Página ${pageNum}`, left, bottom + 1.5, {
        width: pageWidth,
        align: "right",
      });
  }

  const colXs: number[] = [];
  {
    let x = left;
    for (const c of opts.columns) {
      colXs.push(x);
      x += c.width;
    }
  }

  function drawTableHeader() {
    const y = doc.y;
    doc.rect(left, y, pageWidth, 20).fill("#f1f5f9");
    doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#334155");
    opts.columns.forEach((c, i) => {
      doc.text(c.label, colXs[i] + 5, y + 6, { width: c.width - 10 });
    });
    doc.y = y + 20;
  }

  let pageNum = 1;
  drawHeader();

  doc.font("Helvetica-Bold").fontSize(16).fillColor("#0f172a").text(opts.title, left, doc.y);
  if (opts.subtitle) {
    doc.font("Helvetica").fontSize(9.5).fillColor("#64748b").text(opts.subtitle, left);
  }
  doc.moveDown(0.9);

  drawTableHeader();
  doc.font("Helvetica").fontSize(8.5);

  const ROW_HEIGHT = 20;
  const bottomLimit = doc.page.height - doc.page.margins.bottom - 26;

  if (opts.rows.length === 0) {
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#94a3b8")
      .text("Nenhum registro por aqui ainda.", left, doc.y + 8);
  }

  opts.rows.forEach((row, i) => {
    if (doc.y + ROW_HEIGHT > bottomLimit) {
      drawFooter(pageNum);
      doc.addPage();
      pageNum++;
      drawHeader();
      drawTableHeader();
      doc.font("Helvetica").fontSize(8.5);
    }
    const y = doc.y;
    if (i % 2 === 1) {
      doc.rect(left, y, pageWidth, ROW_HEIGHT).fill("#f8fafc");
    }
    doc.fillColor("#334155");
    row.forEach((cell, ci) => {
      doc.text(cell, colXs[ci] + 5, y + 5, {
        width: opts.columns[ci].width - 10,
        ellipsis: true,
        lineBreak: false,
      });
    });
    doc.y = y + ROW_HEIGHT;
  });

  drawFooter(pageNum);
  doc.end();
  return done;
}
