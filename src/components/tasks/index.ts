// Task Completion System - Refactored
// Export all components from this index for easy imports

// Main modal
export { TaskCompletionModalNew } from './TaskCompletionModalNew'

// Legacy task forms (for backwards compatibility)
export { TemperatureTaskForm } from './task-forms/TemperatureTaskForm'

// Shared components
export { AssetTemperatureInput } from './components/AssetTemperatureInput'
export { OutOfRangeWarning } from './components/OutOfRangeWarning'

// Renderers
export { TemplateRenderer } from './renderers/TemplateRenderer'
export { TemperatureRenderer } from './renderers/features/TemperatureRenderer'
export { ChecklistRenderer } from './renderers/features/ChecklistRenderer'
export { YesNoChecklistRenderer } from './renderers/features/YesNoChecklistRenderer'
export { PhotoEvidenceRenderer } from './renderers/features/PhotoEvidenceRenderer'
