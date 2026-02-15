"use client";

import { useEffect } from 'react';

/**
 * Admin Favicon Setter
 * Dynamically sets admin favicons when on admin pages
 * Uses href updates instead of DOM removal to avoid React conflicts
 */
export function AdminFaviconSetter() {
  useEffect(() => {
    if (typeof window === 'undefined' || !document.head) return;

    const updateFavicon = () => {
      const timestamp = Date.now();
      
      // Update existing favicon links instead of removing them (avoids React conflicts)
      const existingFavicons = document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"]');
      existingFavicons.forEach(link => {
        try {
          const rel = link.getAttribute('rel');
          const sizes = link.getAttribute('sizes');
          
          if (sizes === '512x512') {
            link.setAttribute('href', `/admin-icon-512x512.png?v=${timestamp}`);
          } else if (sizes === '192x192') {
            link.setAttribute('href', `/admin-icon-192x192.png?v=${timestamp}`);
          } else if (rel === 'shortcut icon' || rel === 'icon') {
            link.setAttribute('href', `/admin-favicon.ico?v=${timestamp}`);
          }
        } catch (e) {
          // Ignore errors
        }
      });

      // Add missing favicon links if they don't exist
      const existingIcon512 = document.querySelector('link[rel="icon"][sizes="512x512"]');
      const existingIcon192 = document.querySelector('link[rel="icon"][sizes="192x192"]');
      const existingShortcut = document.querySelector('link[rel="shortcut icon"]');
      const existingApple = document.querySelector('link[rel="apple-touch-icon"]');

      if (!existingIcon512) {
        const link = document.createElement('link');
        link.setAttribute('rel', 'icon');
        link.setAttribute('type', 'image/png');
        link.setAttribute('sizes', '512x512');
        link.setAttribute('href', `/admin-icon-512x512.png?v=${timestamp}`);
        document.head.appendChild(link);
      }

      if (!existingIcon192) {
        const link = document.createElement('link');
        link.setAttribute('rel', 'icon');
        link.setAttribute('type', 'image/png');
        link.setAttribute('sizes', '192x192');
        link.setAttribute('href', `/admin-icon-192x192.png?v=${timestamp}`);
        document.head.appendChild(link);
      }

      if (!existingShortcut) {
        const link = document.createElement('link');
        link.setAttribute('rel', 'shortcut icon');
        link.setAttribute('type', 'image/x-icon');
        link.setAttribute('href', `/admin-favicon.ico?v=${timestamp}`);
        document.head.appendChild(link);
      }

      if (!existingApple) {
        const link = document.createElement('link');
        link.setAttribute('rel', 'apple-touch-icon');
        link.setAttribute('sizes', '180x180');
        link.setAttribute('href', `/admin-apple-touch-icon.png?v=${timestamp}`);
        document.head.appendChild(link);
      } else {
        existingApple.setAttribute('href', `/admin-apple-touch-icon.png?v=${timestamp}`);
      }

      // Update theme color
      let themeColor = document.querySelector('meta[name="theme-color"]');
      if (themeColor) {
        themeColor.setAttribute('content', '#D37E91');
      } else {
        themeColor = document.createElement('meta');
        themeColor.setAttribute('name', 'theme-color');
        themeColor.setAttribute('content', '#D37E91');
        document.head.appendChild(themeColor);
      }

      // Update manifest link for PWA
      let manifestLink = document.querySelector('link[rel="manifest"]');
      if (manifestLink) {
        manifestLink.setAttribute('href', '/admin-manifest.json');
      } else {
        manifestLink = document.createElement('link');
        manifestLink.setAttribute('rel', 'manifest');
        manifestLink.setAttribute('href', '/admin-manifest.json');
        document.head.appendChild(manifestLink);
      }
    };

    // Update immediately
    updateFavicon();

    // Also update on visibility change (when tab becomes visible)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updateFavicon();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return null;
}

