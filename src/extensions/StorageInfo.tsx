import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import StorageInfoComponent from "@/components/StorageInfoComponent";

export const StorageInfo = Node.create({
  name: "storageInfo",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      rows: {
        default: []
      },
      extraNotes: {
        default: ""
      }
    };
  },

  parseHTML() {
    return [{ tag: "storage-info" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["storage-info", mergeAttributes(HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(StorageInfoComponent);
  }
});
