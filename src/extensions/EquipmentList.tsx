import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import EquipmentListComponent from "@/components/EquipmentListComponent";

export const EquipmentList = Node.create({
  name: "equipmentList",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      rows: {
        default: []
      }
    };
  },

  parseHTML() {
    return [{ tag: "equipment-list" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["equipment-list", mergeAttributes(HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(EquipmentListComponent);
  }
});
