import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import AttachmentComponent from "@/components/editor/AttachmentComponent";

export const AttachmentBlock = Node.create({
  name: "attachmentBlock",
  group: "block",
  atom: true,
  addAttributes() {
    return {
      fileName: { default: "" },
      fileUrl: { default: "" },
      fileType: { default: "" },
      fileSize: { default: 0 }
    };
  },
  parseHTML() {
    return [{ tag: "attachment-block" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["attachment-block", mergeAttributes(HTMLAttributes)];
  },
  addNodeView() {
    return ReactNodeViewRenderer(AttachmentComponent);
  }
});
