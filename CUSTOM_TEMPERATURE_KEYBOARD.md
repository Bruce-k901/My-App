# Custom Temperature Keyboard with Minus Button

## Problem

Temperature input fields on mobile devices use `inputMode="decimal"` which shows a numeric keyboard, but this keyboard doesn't include a minus (-) button. This makes it impossible to enter negative temperatures (e.g., freezer temperatures like -20°C) on mobile devices.

## Solution

Created a custom numeric keyboard component that includes:

- Numbers 0-9
- Decimal point (.)
- **Minus sign (-)** - the key missing feature
- Backspace button
- Enter button (optional)

The keyboard only appears on mobile/touch devices and automatically hides on desktop where users can use their physical keyboard.

## Components Created

### 1. `NumericKeyboard` Component

**Location:** `src/components/ui/NumericKeyboard.tsx`

A reusable keyboard component that displays a custom numeric keypad with all necessary buttons for temperature input.

**Features:**

- Only renders on mobile/touch devices
- Fixed position at bottom of screen
- Matches app's dark theme styling
- Touch-optimized buttons with active states
- Includes minus button for negative numbers

### 2. `TemperatureInput` Component

**Location:** `src/components/ui/TemperatureInput.tsx`

A wrapper component that combines a regular input field with the custom keyboard.

**Features:**

- Automatically shows custom keyboard on mobile when focused
- Hides default keyboard on mobile (`inputMode="none"` when keyboard is visible)
- Validates input to only allow valid temperature values
- Handles minus sign toggle (can add/remove at start)
- Prevents multiple decimal points
- Maintains focus while using custom keyboard
- Prevents iOS zoom on focus (16px font size)

## Files Updated

### Components Using New TemperatureInput:

1. **`src/components/templates/features/TemperatureLoggingFeature.tsx`**
   - Temperature input in task completion modals
   - Used for compliance task temperature logging

2. **`src/components/assets/AssetForm.tsx`**
   - Working Temp Min field
   - Working Temp Max field
   - Used when creating/editing assets

3. **`src/app/logs/temperature/page.tsx`**
   - Temperature reading input
   - Used in the temperature logs page

### Exports:

- **`src/components/ui/index.ts`**
  - Added exports for `TemperatureInput` and `NumericKeyboard`

## Usage

### Basic Usage:

```tsx
import { TemperatureInput } from "@/components/ui";

<TemperatureInput
  value={temperature}
  onChange={(value) => setTemperature(value)}
  placeholder="Temperature (°C)"
  className="px-4 py-2 rounded-lg bg-[#0f1220] border border-neutral-800 text-white w-full"
/>;
```

### With Submit Handler:

```tsx
<TemperatureInput
  value={temperature}
  onChange={(value) => setTemperature(value)}
  onSubmit={() => handleSubmit()}
  placeholder="Temperature (°C)"
/>
```

## Behavior

### Mobile Devices:

- When input is focused, custom keyboard appears at bottom
- Default keyboard is hidden
- User can tap buttons to enter numbers, decimal, or minus
- Keyboard hides when input loses focus

### Desktop:

- Custom keyboard never appears
- Standard keyboard input works normally
- No changes to desktop experience

## Styling

The keyboard matches the app's design system:

- Background: `bg-[#0B0D13]` (main app background)
- Borders: `border-white/[0.06]` (card borders)
- Buttons: `bg-white/[0.03]` with `border-white/[0.06]`
- Active states: `active:bg-white/[0.08]`
- Enter button: Magenta accent (`bg-[#EC4899]/20` with `border-[#EC4899]`)

## Technical Details

### Input Validation:

- Allows empty string
- Allows single minus sign
- Allows negative numbers: `-123.45`
- Allows positive numbers: `123.45`
- Prevents multiple decimal points
- Prevents invalid characters

### Keyboard Logic:

- **Minus button**: Toggles minus at start of number
- **Decimal button**: Only adds if not already present
- **Backspace**: Removes last character
- **Enter**: Calls optional `onSubmit` handler and blurs input

### Mobile Detection:

```typescript
const isMobile =
  typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0);
```

## Testing

To test the custom keyboard:

1. Open the app on a mobile device or use browser dev tools mobile emulation
2. Navigate to any temperature input field:
   - Task completion modal with temperature logging
   - Asset form (working temp min/max)
   - Temperature logs page
3. Tap the temperature input field
4. Verify custom keyboard appears at bottom
5. Test entering:
   - Positive numbers: `5`, `12.5`
   - Negative numbers: `-20`, `-18.5`
   - Decimal numbers: `4.5`, `-15.2`
6. Test backspace button
7. Test that keyboard hides when input loses focus

## Future Enhancements

Potential improvements:

- Add unit toggle (°C/°F) button
- Add quick preset buttons (e.g., -20, 0, 4, 5)
- Add haptic feedback on button press
- Add keyboard animations
- Support for other numeric inputs (not just temperature)












