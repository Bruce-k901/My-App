import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import PostFinishChecklistComponent from "@/components/PostFinishChecklistComponent";

console.log("🔄 PostFinishChecklist extension loaded");

export const PostFinishChecklist = Node.create({
  name: "postFinishChecklist",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      items: { default: [] }
    };
  },

  parseHTML() {
    return [{ tag: "div[data-type='post-finish-checklist']" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", { 
      ...HTMLAttributes, 
      'data-type': 'post-finish-checklist'
    }];
  },

  addNodeView() {
    return ReactNodeViewRenderer(PostFinishChecklistComponent);
  }
});
