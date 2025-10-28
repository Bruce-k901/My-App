import { Node, mergeAttributes } from "@tiptap/core"
import { ReactNodeViewRenderer } from "@tiptap/react"
import SOPComplianceComponent from "@/components/SOPComplianceComponent"

export const SOPComplianceCheck = Node.create({
  name: "sopComplianceCheck",
  group: "block",
  atom: true,
  draggable: true,
  
  addAttributes() {
    return {
      rules: { 
        default: [],
        parseHTML: element => {
          try {
            return JSON.parse(element.getAttribute('data-rules') || '[]');
          } catch {
            return [];
          }
        },
        renderHTML: attributes => {
          return {
            'data-rules': JSON.stringify(attributes.rules || [])
          };
        }
      },
      overallScore: { 
        default: 0,
        parseHTML: element => parseInt(element.getAttribute('data-score') || '0'),
        renderHTML: attributes => ({
          'data-score': attributes.overallScore?.toString() || '0'
        })
      },
      verifiedByManager: { 
        default: false,
        parseHTML: element => element.getAttribute('data-verified') === 'true',
        renderHTML: attributes => ({
          'data-verified': attributes.verifiedByManager?.toString() || 'false'
        })
      },
      evaluatedAt: { 
        default: null,
        parseHTML: element => element.getAttribute('data-evaluated') || null,
        renderHTML: attributes => ({
          'data-evaluated': attributes.evaluatedAt || ''
        })
      }
    }
  },

  parseHTML() {
    return [{ tag: "sop-compliance-check" }]
  },

  renderHTML({ HTMLAttributes }) {
    return ["sop-compliance-check", mergeAttributes(HTMLAttributes)]
  },

  addNodeView() {
    return ReactNodeViewRenderer(SOPComplianceComponent)
  },

  addCommands() {
    return {
      insertSOPComplianceCheck: () => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: {
            rules: [],
            overallScore: 0,
            verifiedByManager: false,
            evaluatedAt: null
          }
        });
      },
    }
  }
})
