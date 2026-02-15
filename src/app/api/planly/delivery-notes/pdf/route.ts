import { NextRequest, NextResponse } from 'next/server';

// Vercel function config
export const maxDuration = 30;

/**
 * GET /api/planly/delivery-notes/pdf?date=YYYY-MM-DD&siteId=xxx
 *
 * Launches headless Chrome, navigates to the delivery notes page,
 * waits for data to load, then generates and returns a 4-up A4 portrait PDF.
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

  const pageUrl = `${baseUrl}/dashboard/planly/delivery-notes?date=${encodeURIComponent(date)}&siteId=${encodeURIComponent(siteId)}`;

  // Forward auth cookies
  const cookieHeader = request.headers.get('cookie') || '';

  let browser;
  try {
    browser = await launchBrowser();
    const page = await browser.newPage();

    // A4 portrait at 96dpi: 210mm ≈ 794px, 297mm ≈ 1123px
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });

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

    // Use print media so @media print CSS rules apply (page breaks, layout resets)
    await page.emulateMediaType('print');

    // Navigate to delivery notes page
    await page.goto(pageUrl, {
      waitUntil: 'networkidle0',
      timeout: 25000,
    });

    // Wait for delivery note sheets to render
    await page.waitForSelector('.delivery-note-sheet', { timeout: 20000 });

    // Small delay for final React renders
    await new Promise((r) => setTimeout(r, 1000));

    // Minimal DOM cleanup — the @media print CSS handles layout
    await page.evaluate(() => {
      // Remove fixed-position overlays (toasters, modals)
      document.querySelectorAll([
        '.fixed',
        '[style*="position: fixed"]',
        '[style*="position:fixed"]',
        '[data-sonner-toaster]',
      ].join(',')).forEach((el) => el.remove());

      // Force light theme
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');

      // Ensure body can grow beyond a single page
      document.documentElement.style.cssText = 'width:210mm!important;height:auto!important;overflow:visible!important;';
      document.body.style.cssText = 'width:210mm!important;height:auto!important;margin:0!important;padding:0!important;overflow:visible!important;background:white!important;';

      // Override inline styles on main (sidebar marginLeft/width)
      const main = document.querySelector('main');
      if (main) {
        (main as HTMLElement).style.cssText = 'margin:0!important;padding:0!important;width:210mm!important;max-width:210mm!important;display:block!important;overflow:visible!important;';
      }

      // Override inline styles on main's inner div (paddingBottom etc.)
      if (main) {
        const inner = main.querySelector(':scope > div');
        if (inner) {
          (inner as HTMLElement).style.cssText = 'margin:0!important;padding:0!important;width:100%!important;max-width:100%!important;overflow:visible!important;';
        }
      }
    });

    // Generate A4 portrait PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      landscape: false,
      printBackground: true,
      margin: { top: '0mm', bottom: '0mm', left: '0mm', right: '0mm' },
    });

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="delivery-notes-${date}.pdf"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: any) {
    console.error('[delivery-notes-pdf] PDF generation failed:', error);
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
