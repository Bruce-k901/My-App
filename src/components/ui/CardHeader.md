# CardHeader Component

## Purpose

The `CardHeader` component provides a **unified header interface** for all dashboard cards. It handles only the header portion (title, subtitle, chevron) and does NOT impose any constraints on expanded content.

## Design Principles

- **Header Only**: Only manages the card header - title, subtitle, and expand/collapse functionality
- **Content Agnostic**: Does not control or style expanded content in any way
- **Flexible Styling**: Expanded content can have completely different layouts, buttons, and styling
- **Consistent UX**: Provides consistent header behavior across all dashboard cards

## Props

```typescript
interface CardHeaderProps {
  title: string; // Main title text
  subtitle?: string; // Optional subtitle text
  showChevron?: boolean; // Show expand/collapse chevron
  onToggle?: () => void; // Toggle handler for expand/collapse
  expanded?: boolean; // Current expanded state
  className?: string; // Additional CSS classes
}
```

## Usage Examples

### Basic Header (No Expansion)

```tsx
<CardHeader title="Site Name" subtitle="Location details" />
```

### Expandable Header

```tsx
<CardHeader
  title="User Name"
  subtitle="user@email.com • Manager • Site A"
  showChevron
  onToggle={handleToggle}
  expanded={isExpanded}
/>
```

## Implementation Pattern

```tsx
export default function MyCard() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="card-container">
      <CardHeader
        title="Card Title"
        subtitle="Card subtitle"
        showChevron
        onToggle={() => setIsExpanded(!isExpanded)}
        expanded={isExpanded}
      />

      {isExpanded && (
        <div className="px-4 pb-3">
          {/* COMPLETELY FLEXIBLE CONTENT */}
          {/* Custom layouts, buttons, forms, etc. */}
          {/* No styling constraints from CardHeader */}
        </div>
      )}
    </div>
  );
}
```

## What CardHeader Does NOT Do

- ❌ Does not style expanded content
- ❌ Does not impose button styling
- ❌ Does not control content layout
- ❌ Does not manage form state
- ❌ Does not provide content containers

## Migration from EntityCard

Replace EntityCard usage with CardHeader + custom content wrapper:

**Before:**

```tsx
<EntityCard title={title} rightActions={<CardChevron />}>
  {/* content */}
</EntityCard>
```

**After:**

```tsx
<div className="card-wrapper">
  <CardHeader title={title} showChevron onToggle={toggle} expanded={isExpanded} />
  {isExpanded && <div className="custom-content-wrapper">{/* completely custom content */}</div>}
</div>
```
