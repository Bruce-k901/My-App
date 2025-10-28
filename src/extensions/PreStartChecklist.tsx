import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import PreStartChecklistComponent from "@/components/PreStartChecklistComponent";

console.log("🔄 PreStartChecklist extension loaded");

export const PreStartChecklist = Node.create({
  name: "preStartChecklist",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      items: { default: [] }
    };
  },

  parseHTML() {
    return [{ tag: "div[data-type='pre-start-checklist']" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", { 
      ...HTMLAttributes, 
      'data-type': 'pre-start-checklist'
    }];
  },

  addNodeView() {
    return ReactNodeViewRenderer(PreStartChecklistComponent);
  }
});
