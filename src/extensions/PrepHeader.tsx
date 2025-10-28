import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import PrepHeaderComponent from "@/components/PrepHeaderComponent";

console.log("🔄 PrepHeader extension loaded");

export const PrepHeader = Node.create({
  name: "prepHeader",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      // Identity & Version Metadata
      title: { default: "" },
      ref_code: { default: "" },
      version: { default: "1.0" },
      category: { default: "Prep" },
      status: { default: "Draft" },
      author: { default: "" },
      last_edited: { default: "" },
      sopType: { default: "Cleaning" },
      // Existing HACCP fields
      yieldValue: { default: 0 },
      unit: { default: "" },
      toolColour: { default: "Brown – Bakery" },
      toolColourHex: { default: "#8B4513" },
      allergens: { default: [] },
      safetyNotes: { default: "" },
      subRecipes: { default: [] }
    };
  },

  parseHTML() {
    return [{ tag: "div[data-type='prep-header']" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", { 
      ...HTMLAttributes, 
      'data-type': 'prep-header'
    }];
  },

  addNodeView() {
    return ReactNodeViewRenderer(PrepHeaderComponent);
  }
});
