import { useCallback, useState } from "react";

const RENDER_WIDTH = 1400;
const LOGO_URL = "/media/621866bf89891ec2.jpg";

// Carrega a logo e retorna uma data URL PNG com fundo transparente (marca d'água) e uma JPEG normal (rodapé)
async function loadLogoImages() {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      // Marca d'água: remove o fundo do JPEG (claro ou escuro) deixando apenas a logo,
      // e reduz a opacidade dos pixels restantes para ~6%. PNG preserva a transparência.
      const wmCanvas = document.createElement("canvas");
      wmCanvas.width = 600;
      wmCanvas.height = 600;
      const wmCtx = wmCanvas.getContext("2d");
      wmCtx.drawImage(img, 0, 0, 600, 600);
      try {
        const imageData = wmCtx.getImageData(0, 0, 600, 600);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
          if (brightness > 235 || brightness < 50) {
            // Fundo (claro ou escuro): totalmente transparente
            data[i + 3] = 0;
          } else {
            // Logo: reduz para ~6% de opacidade
            data[i + 3] = Math.round(data[i + 3] * 0.06);
          }
        }
        wmCtx.putImageData(imageData, 0, 0);
      } catch (e) {
        // Fallback CORS: usa globalAlpha (pode mostrar fundo do JPEG)
        wmCtx.clearRect(0, 0, 600, 600);
        wmCtx.globalAlpha = 0.06;
        wmCtx.drawImage(img, 0, 0, 600, 600);
        wmCtx.globalAlpha = 1;
      }
      const watermarkData = wmCanvas.toDataURL("image/png");

      // versão rodapé (pequena, opacidade normal)
      const ftCanvas = document.createElement("canvas");
      ftCanvas.width = 120;
      ftCanvas.height = 120;
      const ftCtx = ftCanvas.getContext("2d");
      ftCtx.drawImage(img, 0, 0, 120, 120);
      const footerLogoData = ftCanvas.toDataURL("image/jpeg", 0.92);

      resolve({ watermarkData, footerLogoData });
    };
    img.onerror = () => resolve({ watermarkData: null, footerLogoData: null });
    img.src = LOGO_URL;
  });
}

export function usePdfExport() {
  const [exporting, setExporting] = useState(false);

  const exportToPdf = useCallback(async ({ elementId, filename }) => {
    setExporting(true);
    try {
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([import('jspdf'), import('html2canvas')]);
      const element = document.getElementById(elementId);
      if (!element) throw new Error("Elemento não encontrado: " + elementId);

      const { watermarkData, footerLogoData } = await loadLogoImages();

      // ── 1. Clone the element into an off-screen container at fixed width ──
      const wrapper = document.createElement("div");
      wrapper.style.cssText = `
        position: fixed;
        top: -99999px;
        left: -99999px;
        width: ${RENDER_WIDTH}px;
        background: #ffffff;
        padding: 24px;
        box-sizing: border-box;
        font-family: inherit;
        z-index: -1;
      `;

      const clone = element.cloneNode(true);
      clone.style.cssText = `
        width: ${RENDER_WIDTH - 48}px;
        background: #ffffff;
        overflow: visible;
      `;
      wrapper.appendChild(clone);
      document.body.appendChild(wrapper);

      // Let the browser render and settle
      await new Promise((r) => setTimeout(r, 400));

      // ── 2. Capture with html2canvas ──
      const canvas = await html2canvas(wrapper, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        width: RENDER_WIDTH,
        height: wrapper.scrollHeight,
        windowWidth: RENDER_WIDTH,
        scrollY: 0,
        scrollX: 0,
      });

      document.body.removeChild(wrapper);

      // ── 3. PDF layout ──
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const headerH = 14;
      const footerH = 8;
      const contentW = pageW - margin * 2;
      const contentAreaH = pageH - headerH - footerH - margin * 0.5;

      const imgW = canvas.width;
      const imgH = canvas.height;
      const pxPerMm = imgW / contentW;
      const totalHeightMm = imgH / pxPerMm;

      // ── 4. Smart page breaking: snap to <tr> boundaries ──
      const cloneForRows = clone; // already removed from DOM but we can query it
      const rows = Array.from(element.querySelectorAll("tr"));
      // Measure row positions relative to the original element
      const elementRect = element.getBoundingClientRect();
      const rowBreaksMm = rows.map((tr) => {
        const rect = tr.getBoundingClientRect();
        const relBottomPx = (rect.bottom - elementRect.top + element.scrollTop) * 2; // *2 for scale
        // adjust for wrapper padding (24px * 2 scale = 48px)
        return (relBottomPx + 48) / pxPerMm;
      });

      const slices = [];
      let cursor = 0;

      while (cursor < totalHeightMm) {
        const idealEnd = cursor + contentAreaH;

        if (idealEnd >= totalHeightMm) {
          slices.push({ start: cursor, end: totalHeightMm });
          break;
        }

        // Find the last row bottom that fits before the page end
        const fitting = rowBreaksMm.filter((b) => b > cursor + 5 && b <= idealEnd - 1);
        const breakAt = fitting.length > 0 ? fitting[fitting.length - 1] + 0.5 : idealEnd;

        slices.push({ start: cursor, end: breakAt });
        cursor = breakAt;
      }

      const totalPages = slices.length;

      const drawHeader = (doc, pageNum) => {
        doc.setFillColor(10, 22, 40);
        doc.rect(0, 0, pageW, headerH, "F");
        doc.setFillColor(251, 191, 36);
        doc.rect(0, headerH, pageW, 1.5, "F");

        if (footerLogoData) {
          try { doc.addImage(footerLogoData, "JPEG", margin, 2, 10, 10); } catch (e) {}
        }

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text("KartVicio", margin + 13, 9);

        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(180, 200, 230);
        const now = new Date();
        const dateStr = `${now.toLocaleDateString("pt-BR")} às ${now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
        doc.text(dateStr, pageW / 2, 9, { align: "center" });
        doc.text(`Pág. ${pageNum} / ${totalPages}`, pageW - margin, 9, { align: "right" });
      };

      const drawFooter = (doc) => {
        doc.setFillColor(248, 248, 248);
        doc.rect(0, pageH - footerH, pageW, footerH, "F");
        doc.setDrawColor(220, 220, 220);
        doc.line(margin, pageH - footerH, pageW - margin, pageH - footerH);

        if (footerLogoData) {
          try { doc.addImage(footerLogoData, "JPEG", margin, pageH - footerH + 1, 6, 6); } catch (e) {}
        }

        doc.setTextColor(150, 150, 150);
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        const footerText = "KartVicio — Sistema de Gestão de Campeonatos de Kart";
        const textX = footerLogoData ? pageW / 2 + 3 : pageW / 2;
        doc.text(footerText, textX, pageH - 2, { align: "center" });
      };

      // Marca d'água central — sutil como papel de parede, não atrapalha a leitura
      const drawWatermark = (doc) => {
        if (!watermarkData) return;
        const wmSize = Math.min(pageW, pageH) * 0.55;
        const wmX = (pageW - wmSize) / 2;
        const wmY = headerH + (pageH - headerH - footerH - wmSize) / 2;
        try { doc.addImage(watermarkData, "PNG", wmX, wmY, wmSize, wmSize); } catch (e) {}
      };

      // ── 5. Render each slice ──
      for (let i = 0; i < slices.length; i++) {
        if (i > 0) pdf.addPage();

        drawHeader(pdf, i + 1);

        const { start, end } = slices[i];
        const sliceHmm = end - start;
        const startPx = start * pxPerMm;
        const sliceHpx = sliceHmm * pxPerMm;

        const sliceCanvas = document.createElement("canvas");
        sliceCanvas.width = imgW;
        sliceCanvas.height = Math.ceil(sliceHpx);
        const ctx = sliceCanvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
        ctx.drawImage(canvas, 0, startPx, imgW, sliceHpx, 0, 0, imgW, sliceHpx);

        const imgData = sliceCanvas.toDataURL("image/jpeg", 0.97);
        pdf.addImage(imgData, "JPEG", margin, headerH + 1.5, contentW, sliceHmm);

        // Marca d'água desenhada sobre o conteúdo (muito sutil) + rodapé por cima
        drawWatermark(pdf);
        drawFooter(pdf);
      }

      pdf.save(filename);
    } finally {
      setExporting(false);
    }
  }, []);

  return { exportToPdf, exporting };
}
