'use client';

import html2canvas from 'html2canvas';

/**
 * Captures a screenshot of the current viewport, excluding the assistant widget
 * @param excludeSelector Optional CSS selector to exclude from capture
 * @returns Promise<Blob> - The screenshot as a PNG blob
 */
export async function captureScreenshot(excludeSelector?: string): Promise<Blob> {
  const element = document.body;
  
  const canvas = await html2canvas(element, {
    ignoreElements: (el) => {
      // Exclude assistant widget by data attribute
      if (el.closest('[data-assistant-widget]') !== null) {
        return true;
      }
      // Exclude by custom selector if provided
      if (excludeSelector && el.matches(excludeSelector)) {
        return true;
      }
      return false;
    },
    useCORS: true,
    logging: false,
    scale: 1,
    windowWidth: window.innerWidth,
    windowHeight: window.innerHeight
  });
  
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to convert canvas to blob'));
        }
      },
      'image/png',
      0.9 // Quality (0.9 = 90%)
    );
  });
}

/**
 * Converts a blob to a base64 data URL
 * @param blob The blob to convert
 * @returns Promise<string> - Base64 data URL
 */
export async function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert blob to data URL'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
