import { NextRequest, NextResponse } from 'next/server';

// Vercel function config
export const maxDuration = 30;

/**
 * GET /api/planly/production-plan/pdf?date=YYYY-MM-DD&siteId=xxx
 *
 * Launches headless Chrome, navigates to the print-optimised worksheet page,
 * waits for data to load, then generates and returns a vector PDF.
 *
 * Uses @sparticuz/chromium on Vercel/Lambda, local Chrome in development.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  const siteId = searchParams.get('siteId');

  if (!date || !siteId) {
    return NextResponse.json(
      { error: 'Missing required params: date, siteId' },
      { status: 400 }
    );
  }

  // Determine base URL
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    'http://localhost:3000';

  const printUrl = `${baseUrl}/print/planly-worksheet?date=${encodeURIComponent(date)}&siteId=${encodeURIComponent(siteId)}`;

  // Forward auth cookies
  const cookieHeader = request.headers.get('cookie') || '';

  let browser;
  try {
    browser = await launchBrowser();
    const page = await browser.newPage();

    // Viewport ~matches A4 landscape printable area (277mm ≈ 1048px at 96dpi)
    // Keeps content at ~1:1 scale in the PDF for sharp, readable text
    await page.setViewport({ width: 1100, height: 800, deviceScaleFactor: 2 });

    // Forward cookies for Supabase auth
    if (cookieHeader) {
      const domain = new URL(baseUrl).hostname;
      const cookies = cookieHeader
        .split(';')
        .map((c) => {
          const eqIdx = c.indexOf('=');
          if (eqIdx === -1) return null;
          return {
            name: c.substring(0, eqIdx).trim(),
            value: c.substring(eqIdx + 1).trim(),
            domain,
            path: '/',
          };
        })
        .filter((c): c is NonNullable<typeof c> => c !== null && c.name !== '');

      if (cookies.length > 0) {
        await page.setCookie(...cookies);
      }
    }

    // Render in SCREEN mode — the page looks correct on screen already.
    // We prepare the DOM for PDF via evaluate() after load.
    await page.emulateMediaType('screen');

    // Navigate to print page and wait for content
    await page.goto(printUrl, {
      waitUntil: 'networkidle0',
      timeout: 25000,
    });

    // Wait for DailyWorksheet to finish loading (renders .ws-root when ready)
    await page.waitForSelector('.ws-root', { timeout: 20000 });

    // Small delay for any final React renders / repaints
    await new Promise((r) => setTimeout(r, 500));

    // Prepare the DOM for PDF output
    await page.evaluate(() => {
      // 1. Remove fixed-position overlays (PWA prompt, AI widget, toaster)
      document.querySelectorAll([
        '.fixed',
        '[style*="position: fixed"]',
        '[style*="position:fixed"]',
        '[data-sonner-toaster]',
      ].join(',')).forEach((el) => el.remove());

      // 2. Hide buttons, inputs, nav chrome, footer
      document.querySelectorAll(
        'button, input, select, textarea, nav, aside, footer, [role="navigation"], [role="contentinfo"], .no-print'
      ).forEach((el) => (el as HTMLElement).style.display = 'none');

      // 3. Force light theme
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
      document.body.style.background = 'white';
      document.body.style.color = 'black';

      // 4. Reset app-shell layout (remove sidebar/header offsets)
      const main = document.querySelector('main');
      if (main) {
        (main as HTMLElement).style.cssText = 'margin:0!important;padding:2px!important;width:100%!important;max-width:100%!important;';
      }

      // 5. Make scrollable areas visible
      document.querySelectorAll('.overflow-x-auto, .overflow-auto').forEach(
        (el) => ((el as HTMLElement).style.overflow = 'visible')
      );

      // 6. Convert sticky columns to static
      document.querySelectorAll('.sticky').forEach(
        (el) => ((el as HTMLElement).style.position = 'static')
      );

      // 7. Insert page-break after the packing plan section.
      // The packing plan is the first .ws-section inside .ws-root.
      // We find it and insert a page-break-after on it.
      const wsRoot = document.querySelector('.ws-root');
      if (wsRoot) {
        const sections = wsRoot.querySelectorAll('.ws-section');
        if (sections.length > 0) {
          (sections[0] as HTMLElement).style.pageBreakAfter = 'always';
          (sections[0] as HTMLElement).style.marginBottom = '0';
        }
      }

      // 8. Compact spacing for PDF density
      const root = document.querySelector('.ws-root') as HTMLElement;
      if (root) {
        root.style.gap = '4px';
        root.classList.remove('space-y-4');
      }

      // 9. Inject compact CSS for PDF density
      const style = document.createElement('style');
      style.textContent = `
        /* Tray + Confirmation tables — ultra-compact rows */
        .tray-confirmation-grid table {
          font-size: 7px !important;
        }
        .tray-confirmation-grid th,
        .tray-confirmation-grid td {
          padding: 0.5px 2px !important;
          line-height: 1 !important;
        }
        .tray-confirmation-grid th {
          padding: 1px 2px !important;
        }

        /* Prep section cards — compact */
        .ws-section {
          padding: 2px !important;
          margin-bottom: 2px !important;
        }
        .ws-section table {
          font-size: 8px !important;
        }
        .ws-section th,
        .ws-section td {
          padding: 0.5px 3px !important;
          line-height: 1.05 !important;
        }

        /* Tray + confirmation grid gap */
        .tray-confirmation-grid {
          gap: 3px !important;
        }

        /* Section headers — tighter */
        .ws-section > div:first-child {
          margin-bottom: 1px !important;
          padding-bottom: 0 !important;
        }

        /* Prep grid gap */
        .ws-root > div[class*="grid"] {
          gap: 3px !important;
        }
      `;
      document.head.appendChild(style);
    });

    // Generate A4 landscape PDF — sharp backgrounds, minimal margins
    const pdfBuffer = await page.pdf({
      format: 'A4',
      landscape: true,
      printBackground: true,
      margin: { top: '2mm', bottom: '2mm', left: '3mm', right: '3mm' },
    });

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="daily-worksheet-${date}.pdf"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: any) {
    console.error('[pdf-route] PDF generation failed:', error);
    return NextResponse.json(
      { error: 'PDF generation failed', details: error.message },
      { status: 500 }
    );
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}

// ─── Browser Launcher ────────────────────────────────────────────────────

async function launchBrowser() {
  const puppeteer = (await import('puppeteer-core')).default;

  const isServerless =
    !!process.env.VERCEL ||
    !!process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.NODE_ENV === 'production';

  if (isServerless) {
    const chromium = (await import('@sparticuz/chromium')).default;
    return puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });
  }

  // Local development — use installed Chrome
  const localPath = findLocalChrome();
  return puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    executablePath: localPath,
    headless: true,
  });
}

function findLocalChrome(): string {
  const fs = require('fs');
  const candidates = [
    // Windows
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    process.env.LOCALAPPDATA &&
      `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
    // macOS
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    // Linux
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
  ].filter(Boolean) as string[];

  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) return p;
    } catch {
      continue;
    }
  }

  throw new Error(
    'Chrome not found. Install Chrome or set CHROME_PATH env variable.'
  );
}
