const { chromium } = require('playwright');
const m = require(process.argv[2]);
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  for (const d of m) {
    await p.goto('file://' + d.html, { waitUntil: 'load' });
    const color = d.status === 'APPROVED' ? '#1d6b3a' : d.status === 'DRAFT' ? '#8a5a00' : '#4a1d3f';
    const label = d.status === 'MIXED' ? 'APPROVED + DRAFT' : d.status;
    await p.pdf({ path: d.pdf, format: 'Letter', landscape: d.land, printBackground: true, displayHeaderFooter: true,
      margin: { top: '16mm', bottom: '16mm', left: '14mm', right: '14mm' },
      headerTemplate: `<div style="font-size:7.5px;width:100%;padding:0 14mm;font-family:Arial;color:#888;display:flex;justify-content:space-between"><span>${d.footer}</span><span style="color:${color};font-weight:bold;letter-spacing:.1em">${label}</span></div>`,
      footerTemplate: `<div style="font-size:7.5px;width:100%;padding:0 14mm;font-family:Arial;color:#888;display:flex;justify-content:space-between"><span>A Lime Lizard Games concept · Confidential working document</span><span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>` });
    console.log('pdf', d.pdf.split('/').pop());
  }
  await b.close();
})();
