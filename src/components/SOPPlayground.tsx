'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Image } from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { BulletList } from '@tiptap/extension-bullet-list';
import { ListItem } from '@tiptap/extension-list-item';
import { DragHandle } from '@tiptap/extension-drag-handle';
import { 
  Bold, 
  Italic, 
  List, 
  ListOrdered, 
  Image as ImageIcon, 
  Table as TableIcon,
  Heading1,
  Heading2,
  Save,
  Shield,
  Package,
  FileText,
  Wrench,
  Play,
  Archive,
  CheckSquare,
  ClipboardCheck,
  ShieldCheck,
  Paperclip
} from '@/components/ui/icons';
import { PPEList } from '@/extensions/PPEList';
import { IngredientTable } from '@/extensions/IngredientTable';
import { PrepHeader } from '@/extensions/PrepHeader';
import { EquipmentList } from '@/extensions/EquipmentList';
import { ProcessSteps } from '@/extensions/ProcessSteps';
import { StorageInfo } from '@/extensions/StorageInfo';
import { PreStartChecklist } from '@/extensions/PreStartChecklist';
import { PostFinishChecklist } from '@/extensions/PostFinishChecklist';
import { SOPComplianceCheck } from '@/extensions/SOPComplianceCheck';
import { ImageBlock } from '@/extensions/ImageBlock';
import { AttachmentBlock } from '@/extensions/AttachmentBlock';
import { SOPProvider } from '@/context/SOPContext';
import { FOOD_SOP_TEMPLATE } from '@/lib/templates/foodSOPTemplate';

interface SOPPlaygroundProps {
  initialContent?: string;
  onSave?: (json: any) => void;
}

export default function SOPPlayground({ 
  initialContent = '',
  onSave 
}: SOPPlaygroundProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [jsonOutput, setJsonOutput] = useState<any>(null);
  const [templateLoaded, setTemplateLoaded] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        history: false,
      }),
      DragHandle.configure({
        dragHandleWidth: 40,
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'rounded-lg max-w-full h-auto',
        },
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'border-collapse border border-neutral-600',
        },
      }),
      TableRow,
      TableHeader.configure({
        HTMLAttributes: {
          class: 'border border-neutral-600 bg-neutral-800/50 px-4 py-2 font-semibold',
        },
      }),
      TableCell.configure({
        HTMLAttributes: {
          class: 'border border-neutral-600 px-4 py-2',
        },
      }),
      BulletList.configure({
        HTMLAttributes: {
          class: 'list-disc list-inside space-y-1',
        },
      }),
      ListItem,
      PPEList,
      IngredientTable,
      PrepHeader,
      EquipmentList,
      ProcessSteps,
      StorageInfo,
      PreStartChecklist,
      PostFinishChecklist,
      SOPComplianceCheck,
      ImageBlock,
      AttachmentBlock,
    ],
    content: {
      type: "doc",
      content: []
    },
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none focus:outline-none',
      },
    },
  });

  // Helper function to insert blocks at the end with scroll behavior
  const handleInsertBlock = useCallback((blockType: string) => {
    if (!editor) return;

    // Prevent duplicates for unique blocks
    if (["prepHeader", "sopComplianceCheck"].includes(blockType)) {
      const exists = editor.state.doc.content.some((node: any) => node.type === blockType);
      if (exists) {
        console.log(`${blockType} already exists, skipping insertion`);
        return;
      }
    }

    // Insert at the end of the document
    const docEndPos = editor.state.doc.content.size;
    editor
      .chain()
      .focus()
      .insertContentAt(docEndPos, [
        { type: blockType, attrs: {} },
        { type: "paragraph" } // Add spacer for continued typing
      ])
      .run();

    // Scroll to the new block after a short delay
    setTimeout(() => {
      const newBlock = document.querySelector(`[data-type="${blockType}"]:last-child`);
      if (newBlock) {
        newBlock.scrollIntoView({ 
          behavior: "smooth", 
          block: "center" 
        });
        // Add fade-in animation class
        newBlock.classList.add("sop-block-new");
        
        // Remove animation class after animation completes
        setTimeout(() => {
          newBlock.classList.remove("sop-block-new");
        }, 400);
      }
    }, 100);
  }, [editor]);

  const handleSave = useCallback(() => {
    console.log('🔥 Save button clicked!');
    try {
      if (editor) {
        console.log('🔥 Editor exists, getting JSON...');
        const json = editor.getJSON();
        console.log('🔥 JSON:', json);
        setJsonOutput(json);
        
        if (onSave) {
          onSave(json);
        }
      } else {
        console.error('🔥 No editor available!');
      }
    } catch (error) {
      console.error('Error saving:', error);
    }
  }, [editor, onSave]);

  const handleLoadTemplate = useCallback(() => {
    console.log('🔥🔥🔥 Load Template button clicked!');
    
    if (!editor) {
      console.error('🔥 Editor not available');
      alert('Editor not available');
      return;
    }

    try {
      console.log('🔥 Editor available, setting content...');
      console.log('🔥 Current editor content:', editor.getJSON());
      
      console.log('🔥 Loading Food SOP template...');
      const success = editor.commands.setContent(FOOD_SOP_TEMPLATE);
      console.log('🔥 setContent returned:', success);
      console.log('🔥 New editor content:', editor.getJSON());
      
      setTemplateLoaded(true);
      setTimeout(() => setTemplateLoaded(false), 2000);
      
    } catch (error) {
      console.error('🔥 Error loading template:', error);
      alert('Error: ' + error.message);
    }
  }, [editor]);

  if (!editor) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-theme-tertiary">Loading editor...</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-4">
      {/* Toolbar */}
      {editor && (
        <div className="sticky top-0 z-40 bg-neutral-800/30 rounded-xl p-2 backdrop-blur-sm border border-theme/50">
          <div className="flex flex-wrap gap-1">
            {/* Text Formatting */}
            <div className="flex gap-1 border-r border-neutral-600 pr-2 mr-2">
              <button
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={`p-1.5 rounded transition-colors ${
                  editor.isActive('bold') 
                    ? 'bg-magenta-600 text-white' 
                    : 'bg-neutral-700/50 text-theme-tertiary hover:bg-neutral-600'
                }`}
              >
                <Bold size={14} />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={`p-1.5 rounded transition-colors ${
                  editor.isActive('italic') 
                    ? 'bg-magenta-600 text-white' 
                    : 'bg-neutral-700/50 text-theme-tertiary hover:bg-neutral-600'
                }`}
              >
                <Italic size={14} />
              </button>
            </div>

            {/* Headings */}
            <div className="flex gap-1 border-r border-neutral-600 pr-2 mr-2">
              <button
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                className={`p-1.5 rounded transition-colors ${
                  editor.isActive('heading', { level: 1 }) 
                    ? 'bg-magenta-600 text-white' 
                    : 'bg-neutral-700/50 text-theme-tertiary hover:bg-neutral-600'
                }`}
              >
                <Heading1 size={14} />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                className={`p-1.5 rounded transition-colors ${
                  editor.isActive('heading', { level: 2 }) 
                    ? 'bg-magenta-600 text-white' 
                    : 'bg-neutral-700/50 text-theme-tertiary hover:bg-neutral-600'
                }`}
              >
                <Heading2 size={14} />
              </button>
            </div>

            {/* Lists */}
            <div className="flex gap-1 border-r border-neutral-600 pr-2 mr-2">
              <button
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                className={`p-1.5 rounded transition-colors ${
                  editor.isActive('bulletList') 
                    ? 'bg-magenta-600 text-white' 
                    : 'bg-neutral-700/50 text-theme-tertiary hover:bg-neutral-600'
                }`}
              >
                <List size={14} />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                className={`p-1.5 rounded transition-colors ${
                  editor.isActive('orderedList') 
                    ? 'bg-magenta-600 text-white' 
                    : 'bg-neutral-700/50 text-theme-tertiary hover:bg-neutral-600'
                }`}
              >
                <ListOrdered size={14} />
              </button>
            </div>

            {/* Media */}
            <div className="flex gap-1 border-r border-neutral-600 pr-2 mr-2">
              <button
                onClick={() => {
                  const url = window.prompt('Enter image URL:');
                  if (url) {
                    editor.chain().focus().setImage({ src: url }).run();
                  }
                }}
                className="p-1.5 rounded bg-neutral-700/50 text-theme-tertiary hover:bg-neutral-600 transition-colors"
              >
                <ImageIcon size={14} />
              </button>
              <button
                onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
                className="p-1.5 rounded bg-neutral-700/50 text-theme-tertiary hover:bg-neutral-600 transition-colors"
              >
                <TableIcon size={14} />
              </button>
            </div>

            {/* Actions */}
            <div className="flex gap-1 border-l border-neutral-600 pl-2 ml-2">
              <button
                onClick={(e) => {
                  console.log('🔥 Template button clicked from toolbar!');
                  handleLoadTemplate();
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 border transition-all ${
                  templateLoaded 
                    ? 'border-green-500 text-green-400 bg-green-500/10' 
                    : 'border-white/[0.12] text-theme-primary hover:bg-white/[0.12]'
                }`}
                type="button"
              >
                <FileText size={14} />
                {templateLoaded ? 'Template Loaded!' : 'Load Template'}
              </button>
              <button
                onClick={(e) => {
                  console.log('🔥 Save button clicked from toolbar!');
                  handleSave();
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 border border-magenta-500 text-magenta-400 hover:bg-magenta-500/10 transition-all"
                type="button"
              >
                <Save size={14} />
                Save
              </button>
            </div>

            {/* SOP Blocks */}
            <div className="flex gap-1 border-l border-neutral-600 pl-2 ml-2">
              <button
                onClick={() => handleInsertBlock("prepHeader")}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-theme-primary bg-white/[0.06] border border-white/[0.1] hover:bg-white/[0.12] hover:border-magenta-400 hover:shadow-[0_0_12px_rgba(211, 126, 145,0.4)] transition-all duration-150 backdrop-blur-md"
              >
                <FileText size={14} className="inline mr-1" />
                Header
              </button>
              <button
                onClick={() => handleInsertBlock("preStartChecklist")}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-theme-primary bg-white/[0.06] border border-white/[0.1] hover:bg-white/[0.12] hover:border-magenta-400 hover:shadow-[0_0_12px_rgba(211, 126, 145,0.4)] transition-all duration-150 backdrop-blur-md"
              >
                <CheckSquare size={14} className="inline mr-1" />
                Pre-Start
              </button>
              <button
                onClick={() => handleInsertBlock("equipmentList")}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-theme-primary bg-white/[0.06] border border-white/[0.1] hover:bg-white/[0.12] hover:border-magenta-400 hover:shadow-[0_0_12px_rgba(211, 126, 145,0.4)] transition-all duration-150 backdrop-blur-md"
              >
                <Wrench size={14} className="inline mr-1" />
                Equipment
              </button>
              <button
                onClick={() => handleInsertBlock("ppeList")}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-theme-primary bg-white/[0.06] border border-white/[0.1] hover:bg-white/[0.12] hover:border-magenta-400 hover:shadow-[0_0_12px_rgba(211, 126, 145,0.4)] transition-all duration-150 backdrop-blur-md"
              >
                <Shield size={14} className="inline mr-1" />
                PPE
              </button>
              <button
                onClick={() => handleInsertBlock("ingredientTable")}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-theme-primary bg-white/[0.06] border border-white/[0.1] hover:bg-white/[0.12] hover:border-magenta-400 hover:shadow-[0_0_12px_rgba(211, 126, 145,0.4)] transition-all duration-150 backdrop-blur-md"
              >
                <Package size={14} className="inline mr-1" />
                Ingredients
              </button>
              <button
                onClick={() => handleInsertBlock("processSteps")}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-theme-primary bg-white/[0.06] border border-white/[0.1] hover:bg-white/[0.12] hover:border-magenta-400 hover:shadow-[0_0_12px_rgba(211, 126, 145,0.4)] transition-all duration-150 backdrop-blur-md"
              >
                <Play size={14} className="inline mr-1" />
                Process
              </button>
              <button
                onClick={() => handleInsertBlock("storageInfo")}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-theme-primary bg-white/[0.06] border border-white/[0.1] hover:bg-white/[0.12] hover:border-magenta-400 hover:shadow-[0_0_12px_rgba(211, 126, 145,0.4)] transition-all duration-150 backdrop-blur-md"
              >
                <Archive size={14} className="inline mr-1" />
                Storage
              </button>
              <button
                onClick={() => handleInsertBlock("postFinishChecklist")}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-theme-primary bg-white/[0.06] border border-white/[0.1] hover:bg-white/[0.12] hover:border-magenta-400 hover:shadow-[0_0_12px_rgba(211, 126, 145,0.4)] transition-all duration-150 backdrop-blur-md"
              >
                <ClipboardCheck size={14} className="inline mr-1" />
                Post-Finish
              </button>
              <button
                onClick={() => handleInsertBlock("sopComplianceCheck")}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-theme-primary bg-white/[0.06] border border-white/[0.1] hover:bg-white/[0.12] hover:border-magenta-400 hover:shadow-[0_0_12px_rgba(211, 126, 145,0.4)] transition-all duration-150 backdrop-blur-md"
              >
                <ShieldCheck size={14} className="inline mr-1" />
                Compliance
              </button>
              <button
                onClick={() => handleInsertBlock("imageBlock")}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-theme-primary bg-white/[0.06] border border-white/[0.1] hover:bg-white/[0.12] hover:border-magenta-400 hover:shadow-[0_0_12px_rgba(211, 126, 145,0.4)] transition-all duration-150 backdrop-blur-md"
              >
                <ImageIcon size={14} className="inline mr-1" />
                Image
              </button>
              <button
                onClick={() => handleInsertBlock("attachmentBlock")}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-theme-primary bg-white/[0.06] border border-white/[0.1] hover:bg-white/[0.12] hover:border-magenta-400 hover:shadow-[0_0_12px_rgba(211, 126, 145,0.4)] transition-all duration-150 backdrop-blur-md"
              >
                <Paperclip size={14} className="inline mr-1" />
                Attachment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Editor */}
      <div className="bg-neutral-800/30 rounded-xl backdrop-blur-sm border border-theme/50 overflow-hidden relative z-0 mt-4">
        <SOPProvider>
          <EditorContent 
            editor={editor} 
            className="prose prose-invert max-w-none min-h-[400px] p-4"
          />
        </SOPProvider>
      </div>

      {/* JSON Preview */}
      {showPreview && jsonOutput && (
        <div className="bg-neutral-800/30 rounded-xl p-4 backdrop-blur-sm border border-theme/50">
          <h3 className="text-base font-semibold text-theme-primary mb-3">JSON Output</h3>
          <pre className="bg-neutral-900/50 rounded-lg p-3 overflow-x-auto text-sm text-theme-tertiary max-h-64">
            {JSON.stringify(jsonOutput, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}