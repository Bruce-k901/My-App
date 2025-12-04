# Clear Browser Cache - Step by Step

The browser is using cached JavaScript. Follow these steps EXACTLY:

## Step 1: Stop Dev Server

- Press `Ctrl + C` in the terminal where `npm run dev` is running
- Wait for it to completely stop

## Step 2: Delete Build Cache

The `.next` folder has been deleted. Now restart:

```bash
npm run dev
```

## Step 3: Clear Browser Cache COMPLETELY

### Chrome/Edge:

1. Press `F12` to open DevTools
2. Right-click the **refresh button** (not the page)
3. Click **"Empty Cache and Hard Reload"**
4. OR: Go to Settings → Privacy → Clear browsing data → Check "Cached images and files" → Clear data

### Firefox:

1. Press `Ctrl + Shift + Delete`
2. Select "Cache" only
3. Click "Clear Now"
4. Then hard refresh with `Ctrl + F5`

## Step 4: Try in Incognito/Private Window

- Open a new incognito/private window
- Navigate to your app
- Try adding a contractor

## Step 5: Check Console

After trying to save, you should see:

- `🚀 [AddContractorModal] handleSave called - NEW CODE VERSION`
- `🔵 [AddContractorModal] Inserting directly into maintenance_contractors`

If you DON'T see these logs, the cache is still active.

## Step 6: Nuclear Option - Disable Cache in DevTools

1. Open DevTools (F12)
2. Go to Network tab
3. Check "Disable cache" checkbox
4. Keep DevTools open while testing
5. Hard refresh (Ctrl + Shift + R)
