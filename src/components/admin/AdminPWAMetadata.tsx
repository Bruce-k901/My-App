"use client";

import { useEffect } from 'react';

/**
 * Admin PWA Metadata Component
 * Injects PWA-specific metadata for admin pages
 */
export function AdminPWAMetadata() {
  useEffect(() => {
    // Update theme color for admin pages
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
      themeColorMeta.setAttribute('content', '#EC4899');
    } else {
      const meta = document.createElement('meta');
      meta.name = 'theme-color';
      meta.content = '#EC4899';
      document.head.appendChild(meta);
    }

    // Add apple-mobile-web-app-capable if not present
    let appleCapable = document.querySelector('meta[name="apple-mobile-web-app-capable"]');
    if (!appleCapable) {
      appleCapable = document.createElement('meta');
      appleCapable.setAttribute('name', 'apple-mobile-web-app-capable');
      appleCapable.setAttribute('content', 'yes');
      document.head.appendChild(appleCapable);
    }

    // Add apple-mobile-web-app-status-bar-style
    let appleStatusBar = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (!appleStatusBar) {
      appleStatusBar = document.createElement('meta');
      appleStatusBar.setAttribute('name', 'apple-mobile-web-app-status-bar-style');
      appleStatusBar.setAttribute('content', 'black-translucent');
      document.head.appendChild(appleStatusBar);
    }

    // Add apple-mobile-web-app-title
    let appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    if (!appleTitle) {
      appleTitle = document.createElement('meta');
      appleTitle.setAttribute('name', 'apple-mobile-web-app-title');
      appleTitle.setAttribute('content', 'Checkly Admin');
      document.head.appendChild(appleTitle);
    }

    // Replace favicon and icons with admin versions
    const replaceFavicon = () => {
      // Remove ALL existing favicon/icon links
      const existingFavicons = document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]');
      existingFavicons.forEach(link => link.remove());

      // Force browser cache clear by using timestamp
      const timestamp = new Date().getTime();

      // Add admin favicon as primary icon (browsers look for this first)
      const faviconLink = document.createElement('link');
      faviconLink.rel = 'icon';
      faviconLink.type = 'image/png';
      faviconLink.href = `/admin-icon-192x192.png?v=${timestamp}`;
      document.head.insertBefore(faviconLink, document.head.firstChild);

      // Add shortcut icon (some browsers prefer this)
      const shortcutLink = document.createElement('link');
      shortcutLink.rel = 'shortcut icon';
      shortcutLink.type = 'image/png';
      shortcutLink.href = `/admin-icon-192x192.png?v=${timestamp}`;
      document.head.appendChild(shortcutLink);

      // Add sized icons
      const icon192 = document.createElement('link');
      icon192.rel = 'icon';
      icon192.type = 'image/png';
      icon192.sizes = '192x192';
      icon192.href = `/admin-icon-192x192.png?v=${timestamp}`;
      document.head.appendChild(icon192);

      const icon512 = document.createElement('link');
      icon512.rel = 'icon';
      icon512.type = 'image/png';
      icon512.sizes = '512x512';
      icon512.href = `/admin-icon-512x512.png?v=${timestamp}`;
      document.head.appendChild(icon512);

      // Add apple touch icon
      const appleIcon = document.createElement('link');
      appleIcon.rel = 'apple-touch-icon';
      appleIcon.sizes = '180x180';
      appleIcon.href = `/admin-apple-touch-icon.png?v=${timestamp}`;
      document.head.appendChild(appleIcon);

      // Force favicon reload by creating a new link element
      const forceReload = () => {
        const newLink = document.createElement('link');
        newLink.rel = 'icon';
        newLink.href = `/admin-icon-192x192.png?v=${Date.now()}`;
        const oldLink = document.querySelector('link[rel="icon"]');
        if (oldLink && oldLink.parentNode) {
          oldLink.parentNode.replaceChild(newLink, oldLink);
        }
      };

      // Try multiple times to ensure it sticks
      setTimeout(forceReload, 50);
      setTimeout(forceReload, 200);
      setTimeout(forceReload, 500);
    };

    // Replace favicon immediately
    replaceFavicon();
  }, []);

  return null;
}

