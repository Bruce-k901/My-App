import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import IngredientTableComponent from "@/components/IngredientTableComponent";

console.log("🔄 IngredientTable extension loaded");

export const IngredientTable = Node.create({
  name: "ingredientTable",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      activeBatch: {
        default: "x1"
      },
      rows: {
        default: []
      }
    };
  },

  parseHTML() {
    return [{ tag: "ingredient-table" }];
  },

  // Let React handle rendering
  renderHTML({ HTMLAttributes }) {
    return ["ingredient-table", mergeAttributes(HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(IngredientTableComponent);
  }
});
