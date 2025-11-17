# Clean Restart Instructions

To fix the hydration error, follow these steps:

1. **Stop the dev server** (Ctrl+C)

2. **Clear all caches**:

   ```powershell
   Remove-Item -Path .next -Recurse -Force -ErrorAction SilentlyContinue
   Remove-Item -Path node_modules/.cache -Recurse -Force -ErrorAction SilentlyContinue
   ```

3. **Restart the dev server**:

   ```powershell
   npm run dev
   ```

4. **Hard refresh your browser**:
   - Windows/Linux: Ctrl+Shift+R
   - Mac: Cmd+Shift+R

5. **Clear browser cache** (if still seeing issues):
   - Open DevTools (F12)
   - Right-click the refresh button
   - Select "Empty Cache and Hard Reload"

The hydration error is caused by Next.js serving cached HTML. After restarting the dev server, it should pick up the new code that always renders the same structure.
