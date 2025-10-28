import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import PPEListComponent from "@/components/PPEListComponent";

console.log("🔄 PPEList extension loaded");

export const PPEList = Node.create({
  name: "ppeList",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      items: { 
        default: []
      }
    };
  },

  parseHTML() {
    return [{ 
      tag: "div[data-type='ppe-list']"
    }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", { 
      ...HTMLAttributes, 
      'data-type': 'ppe-list'
    }];
  },

  addNodeView() {
    return ReactNodeViewRenderer(PPEListComponent);
  }
});
