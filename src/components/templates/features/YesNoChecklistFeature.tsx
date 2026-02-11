'use client';

interface YesNoChecklistFeatureProps {
  items: Array<{ text: string; answer: 'yes' | 'no' | null }>;
  onChange: (items: Array<{ text: string; answer: 'yes' | 'no' | null }>) => void;
  onMonitorCallout?: (monitor: boolean, callout: boolean, notes?: string, itemIndex?: number) => void;
  contractorType?: string;
}

export function YesNoChecklistFeature({
  items,
  onChange,
  onMonitorCallout,
  contractorType
}: YesNoChecklistFeatureProps) {
  const updateItem = (index: number, text: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], text };
    onChange(newItems);
  };

  const updateAnswer = (index: number, answer: 'yes' | 'no') => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], answer };
    onChange(newItems);

    // If answer is 'no', trigger monitor/callout
    if (answer === 'no' && onMonitorCallout) {
      onMonitorCallout(true, true, `Item "${newItems[index].text}" marked as No`, index);
    }
  };

  const addItem = () => {
    onChange([...items, { text: '', answer: null }]);
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <div className="border-t border-gray-200 dark:border-white/10 pt-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Yes/No Checklist</h2>
      <p className="text-sm text-gray-600 dark:text-white/60 mb-4">
        Answer Yes or No for each item. Selecting "No" will trigger monitor/callout options.
      </p>
      
      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={index} className="bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg p-4">
            <input
              type="text"
              value={item.text}
              onChange={(e) => updateItem(index, e.target.value)}
              placeholder="Enter question/item"
              className="w-full px-4 py-2 rounded-lg bg-white dark:bg-[#0f1220] border border-gray-300 dark:border-neutral-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#D37E91] focus:border-[#D37E91] mb-3"
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => updateAnswer(index, 'yes')}
                className={`flex-1 px-4 py-2 rounded-lg border-2 transition-colors ${
                  item.answer === 'yes'
                    ? 'bg-green-50 dark:bg-green-500/20 border-green-500 text-green-600 dark:text-green-400'
                    : 'bg-white dark:bg-[#0f1220] border-gray-300 dark:border-neutral-800 text-gray-700 dark:text-white hover:border-green-500/50'
                }`}
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => updateAnswer(index, 'no')}
                className={`flex-1 px-4 py-2 rounded-lg border-2 transition-colors ${
                  item.answer === 'no'
                    ? 'bg-red-50 dark:bg-red-500/20 border-red-500 text-red-600 dark:text-red-400'
                    : 'bg-white dark:bg-[#0f1220] border-gray-300 dark:border-neutral-800 text-gray-700 dark:text-white hover:border-red-500/50'
                }`}
              >
                No
              </button>
              <button
                type="button"
                onClick={() => removeItem(index)}
                className="px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
        
        <button
          type="button"
          onClick={addItem}
          className="text-sm text-[#D37E91] dark:text-[#D37E91] hover:text-[#D37E91] dark:hover:text-[#D37E91] transition-colors"
        >
          + Add Yes/No Question
        </button>
      </div>
    </div>
  );
}

