import { useState, useEffect } from 'react';

type SopType = "Cleaning" | "Cooking" | "Prep" | "Service" | "Manual Handling";
type BlockType = "prepHeader" | "ppeList" | "ingredientTable" | "equipmentList" | "processSteps" | "storageInfo" | "preStartChecklist" | "postFinishChecklist" | "sopComplianceCheck";

const SOP_TYPE_CONFIG: Record<SopType, BlockType[]> = {
  "Cleaning": ["prepHeader", "ppeList", "equipmentList", "processSteps", "preStartChecklist", "postFinishChecklist", "sopComplianceCheck"],
  "Cooking": ["prepHeader", "ppeList", "ingredientTable", "equipmentList", "processSteps", "storageInfo", "preStartChecklist", "postFinishChecklist", "sopComplianceCheck"],
  "Prep": ["prepHeader", "ppeList", "ingredientTable", "equipmentList", "processSteps", "storageInfo", "preStartChecklist", "postFinishChecklist", "sopComplianceCheck"],
  "Service": ["prepHeader", "ppeList", "equipmentList", "processSteps", "preStartChecklist", "postFinishChecklist", "sopComplianceCheck"],
  "Manual Handling": ["prepHeader", "ppeList", "equipmentList", "processSteps", "preStartChecklist", "postFinishChecklist", "sopComplianceCheck"],
};

export function useSOPTypeVisibility(currentSopType: SopType) {
  const [visibleBlocks, setVisibleBlocks] = useState<Set<BlockType>>(new Set());

  useEffect(() => {
    const blocksForType = SOP_TYPE_CONFIG[currentSopType] || [];
    setVisibleBlocks(new Set(blocksForType));
  }, [currentSopType]);

  const isBlockVisible = (blockType: BlockType) => visibleBlocks.has(blockType);

  return { isBlockVisible };
}
