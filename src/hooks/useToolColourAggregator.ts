import { useEffect, useState } from "react";
import { useSOP } from "@/context/SOPContext";

export function useToolColourAggregator(editor: any) {
  const { updateToolColour } = useSOP();
  const [toolColours, setToolColours] = useState<string[]>([]);

  useEffect(() => {
    if (!editor) return;

    const updateToolColours = () => {
      try {
        const doc = editor.getJSON();
        const processStepsNodes = doc.content?.filter((node: any) => node.type === 'processSteps') || [];
        
        const allToolColours = processStepsNodes.flatMap((node: any) => 
          node.attrs?.steps?.map((step: any) => step.toolColour).filter(Boolean) || []
        );
        
        const uniqueToolColours = [...new Set(allToolColours)];
        setToolColours(uniqueToolColours);
        updateToolColour(uniqueToolColours);
      } catch (error) {
        console.error('Error updating tool colours:', error);
      }
    };

    // Initial update
    updateToolColours();

    // Listen for changes
    editor.on('update', updateToolColours);

    return () => {
      editor.off('update', updateToolColours);
    };
  }, [editor, updateToolColour]);

  return toolColours;
}
