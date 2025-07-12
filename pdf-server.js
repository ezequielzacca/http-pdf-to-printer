#!/usr/bin/env node

const http = require("http");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const { PDFDocument, degrees } = require("pdf-lib");

const PORT = 3011;
const TEMP_FILE = path.join(__dirname, "temp.pdf");
const PDFTOPRINTER_PATH = path.join(__dirname, "PDFtoPrinter.exe"); // Bundle this alongside the exe

function printPDF(filePath, callback) {
  if (fs.existsSync(PDFTOPRINTER_PATH)) {
    // Use PDFtoPrinter.exe
    const cmd = `"${PDFTOPRINTER_PATH}" "${filePath}"`;
    exec(cmd, callback);
  } else {
    // Fallback: use Windows ShellExecute
    const fallbackCmd = `start /min "" /print "${filePath}"`;
    exec(fallbackCmd, callback);
  }
}

const server = http.createServer(async (req, res) => {
  // Handle CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  if (req.method === "POST" && req.url === "/imprimir-pdf") {
    let data = [];

    req.on("data", chunk => data.push(chunk));
    req.on("end", async () => {
      const buffer = Buffer.concat(data);

      if (!buffer.length) {
        res.writeHead(400, { "Content-Type": "text/plain" });
        return res.end("No PDF enviado");
      }

      try {
        // Save original
        fs.writeFileSync(TEMP_FILE, buffer);

        // Rotate landscape pages
        const pdfDoc = await PDFDocument.load(buffer);
        const pages = pdfDoc.getPages();
        for (const page of pages) {
          const rotation = page.getRotation().angle;
          if (page.getWidth() > page.getHeight()) {
            page.setRotation(degrees((rotation + 270) % 360));
          }
        }

        const rotatedBytes = await pdfDoc.save();
        fs.writeFileSync(TEMP_FILE, rotatedBytes);

        // Print and clean up
        printPDF(TEMP_FILE, (err) => {
          if (fs.existsSync(TEMP_FILE)) fs.unlinkSync(TEMP_FILE);

          if (err) {
            console.error("Error imprimiendo:", err);
            res.writeHead(500, { "Content-Type": "text/plain" });
            return res.end("Error imprimiendo PDF");
          }

          res.writeHead(200, { "Content-Type": "text/plain" });
          res.end("PDF impreso correctamente");
        });
      } catch (err) {
        console.error("Error en el servidor:", err);
        res.writeHead(500, { "Content-Type": "text/plain" });
        res.end("Error procesando el PDF");
      }
    });
  } else {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Ruta no encontrada");
  }
});

server.listen(PORT, () => {
  console.log(`🖨️ Servidor PDF escuchando en http://localhost:${PORT}`);
});
