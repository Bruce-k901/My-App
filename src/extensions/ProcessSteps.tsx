import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import ProcessStepsComponent from "@/components/ProcessStepsComponent";

export const ProcessSteps = Node.create({
  name: "processSteps",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      steps: {
        default: []
      }
    };
  },

  parseHTML() {
    return [{ tag: "process-steps" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["process-steps", mergeAttributes(HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ProcessStepsComponent);
  }
});
