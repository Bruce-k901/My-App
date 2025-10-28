import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import ImageComponent from "@/components/editor/ImageComponent";

export const ImageBlock = Node.create({
  name: "imageBlock",
  group: "block",
  atom: true,
  addAttributes() {
    return {
      src: { default: null },
      caption: { default: "" },
      alt: { default: "" }
    };
  },
  parseHTML() {
    return [{ tag: "image-block" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["image-block", mergeAttributes(HTMLAttributes)];
  },
  addNodeView() {
    return ReactNodeViewRenderer(ImageComponent);
  }
});
