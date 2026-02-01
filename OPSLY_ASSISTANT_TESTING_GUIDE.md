# Opsly Assistant Testing Guide

## Quick Fixes Applied

1. **Model Name Error Fixed**: Changed from `claude-3-5-sonnet-20240620` (not found) to `claude-3-5-sonnet-20241022` with fallback to `claude-3-haiku-20240307`
2. **Chat Reset Added**: Added "Reset Chat" button (rotating arrow icon) that appears when there are messages
3. **Module Indicator Added**: Shows which module you're currently in

## How to Test Dynamic Quick Actions

The quick actions change automatically based on which page you're on:

1. **Dashboard** (`/dashboard`):
   - Create an SOP
   - Report an issue
   - Platform help
   - Submit an idea

2. **Checkly Module** (`/dashboard/tasks`, `/dashboard/sops`, `/dashboard/incidents`, etc.):
   - Fridge temperatures
   - Create an SOP
   - Fire alarm testing
   - Report an issue

3. **Stockly Module** (`/dashboard/stockly/*`):
   - Process an invoice
   - Stock count help
   - Recipe costing
   - GP calculation

4. **Teamly Module** (`/dashboard/people/*`, `/dashboard/courses/*`):
   - Rota help
   - Leave request
   - Payroll query
   - Training courses

5. **Planly Module** (`/dashboard/planly/*`):
   - Production planning
   - Order management
   - Delivery scheduling
   - Cutoff rules

6. **Assetly Module** (`/dashboard/assets/*`, `/dashboard/ppm/*`):
   - Log an issue
   - PPM scheduling
   - Asset tracking
   - Contractor callout

7. **Msgly Module** (`/dashboard/messaging/*`):
   - Send announcement
   - Create group
   - File sharing
   - Team communication

## Testing Steps

1. **Restart your dev server** (important after cache clear)
2. **Navigate to different modules** and open the assistant - you should see different quick actions
3. **Check the module indicator** - it should show "Checkly Module", "Stockly Module", etc.
4. **Test ticket creation**: Click "Report an issue" → describe the issue → AI extracts title → choose screenshot option
5. **Test SOP generation**: Click "Create an SOP" → describe procedure → AI generates SOP → option to save
6. **Test chat reset**: Start a conversation → click the reset button (rotating arrow) → chat clears

## Troubleshooting

If quick actions don't change:

- Check browser console for module detection logs
- Verify you're on the correct URL path
- Hard refresh the page (Ctrl+Shift+R)
- Check that pathname is being captured (should log in console)

If SOP generation fails:

- Check server logs for model errors
- The system will automatically fallback to Haiku model if Sonnet not available
- Verify ANTHROPIC_API_KEY is set in environment

## Known Issues Fixed

✅ Model name error (404) - now uses correct model with fallback
✅ Chat reset functionality - added reset button
✅ Module detection - added logging and indicator
✅ Quick actions - should update when navigating between modules
