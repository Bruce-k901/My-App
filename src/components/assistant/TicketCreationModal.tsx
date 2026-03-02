'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X, AlertTriangle, Lightbulb, HelpCircle, Eraser, Square } from '@/components/ui/icons';

interface TicketCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (title: string, description: string, screenshot?: string) => void;
  initialTitle: string;
  type: 'issue' | 'idea' | 'question';
  screenshot?: string;
}

interface BlurArea {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export function TicketCreationModal({
  isOpen,
  onClose,
  onSubmit,
  initialTitle,
  type,
  screenshot
}: TicketCreationModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [blurAreas, setBlurAreas] = useState<BlurArea[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [processedScreenshot, setProcessedScreenshot] = useState<string | undefined>(screenshot);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const typeConfig = {
    issue: { icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/10', border: 'border-red-200 dark:border-red-500/20' },
    idea: { icon: Lightbulb, color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-900/10', border: 'border-yellow-200 dark:border-yellow-500/20' },
    question: { icon: HelpCircle, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/10', border: 'border-blue-200 dark:border-blue-500/20' }
  };

  const config = typeConfig[type];
  const Icon = config.icon;

  // Load screenshot into canvas when modal opens
  useEffect(() => {
    if (screenshot && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Set canvas size to match image
        canvas.width = img.width;
        canvas.height = img.height;

        // Draw image
        if (ctx) {
          ctx.drawImage(img, 0, 0);
        }

        // Store image reference
        if (imageRef.current) {
          imageRef.current.src = screenshot;
        }
      };

      img.src = screenshot;
    }
  }, [screenshot]);

  // Redraw canvas with blur areas
  const redrawCanvas = () => {
    if (!canvasRef.current || !imageRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = imageRef.current;

    if (!ctx || !img.complete) return;

    // Clear and redraw original image
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);

    // Apply blur to each area
    blurAreas.forEach((area) => {
      // Extract the region
      const imageData = ctx.getImageData(area.x, area.y, area.width, area.height);

      // Apply blur effect (simple pixelation for performance)
      const pixelSize = 10;
      for (let y = 0; y < area.height; y += pixelSize) {
        for (let x = 0; x < area.width; x += pixelSize) {
          const pixelIndex = (y * area.width + x) * 4;
          const r = imageData.data[pixelIndex];
          const g = imageData.data[pixelIndex + 1];
          const b = imageData.data[pixelIndex + 2];

          // Fill pixelated block
          ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
          ctx.fillRect(area.x + x, area.y + y, pixelSize, pixelSize);
        }
      }

      // Draw border around blurred area
      ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
      ctx.lineWidth = 2;
      ctx.strokeRect(area.x, area.y, area.width, area.height);
    });
  };

  // Redraw when blur areas change
  useEffect(() => {
    redrawCanvas();
  }, [blurAreas]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    setIsDrawing(true);
    setStartPos({ x, y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !startPos || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;

    const currentX = (e.clientX - rect.left) * scaleX;
    const currentY = (e.clientY - rect.top) * scaleY;

    // Draw preview rectangle
    redrawCanvas();
    const ctx = canvasRef.current.getContext('2d');
    if (ctx) {
      ctx.strokeStyle = 'rgba(255, 0, 0, 0.7)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(
        startPos.x,
        startPos.y,
        currentX - startPos.x,
        currentY - startPos.y
      );
      ctx.setLineDash([]);
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !startPos || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;

    const endX = (e.clientX - rect.left) * scaleX;
    const endY = (e.clientY - rect.top) * scaleY;

    const width = endX - startPos.x;
    const height = endY - startPos.y;

    // Only add if area is significant
    if (Math.abs(width) > 10 && Math.abs(height) > 10) {
      const newArea: BlurArea = {
        id: crypto.randomUUID(),
        x: Math.min(startPos.x, endX),
        y: Math.min(startPos.y, endY),
        width: Math.abs(width),
        height: Math.abs(height)
      };

      setBlurAreas([...blurAreas, newArea]);
    }

    setIsDrawing(false);
    setStartPos(null);
  };

  const handleClearBlurs = () => {
    setBlurAreas([]);
  };

  const handleSubmit = () => {
    if (!title.trim()) {
      alert('Please enter a subject for your ticket.');
      return;
    }
    if (!description.trim()) {
      alert('Please enter a description for your ticket.');
      return;
    }

    // Get the processed screenshot with blurs applied
    let finalScreenshot = screenshot;
    if (canvasRef.current && blurAreas.length > 0) {
      finalScreenshot = canvasRef.current.toDataURL('image/png', 0.9);
    }

    onSubmit(title.trim(), description, finalScreenshot);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center sm:pr-[480px] bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden bg-white dark:bg-gray-800 rounded-lg shadow-2xl flex flex-col">
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b ${config.border} ${config.bg}`}>
          <div className="flex items-center gap-3">
            <Icon className={`h-6 w-6 ${config.color}`} />
            <h2 className="text-lg font-semibold text-theme-primary">
              Create {type.charAt(0).toUpperCase() + type.slice(1)} Ticket
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-theme-hover rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-theme-tertiary" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-theme-secondary mb-2">
              Subject
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={type === 'idea' ? 'Brief summary of your idea...' : 'Brief summary of the issue...'}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-gray-900 text-theme-primary
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-theme-secondary mb-2">
              Description / Additional Notes
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Please provide details about your issue, idea, or question..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-gray-900 text-theme-primary
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent
                       resize-none"
              rows={4}
            />
          </div>

          {/* Screenshot with blur controls */}
          {screenshot && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-theme-secondary">
                  Screenshot
                </label>
                <div className="flex gap-2">
                  {blurAreas.length > 0 && (
                    <button
                      onClick={handleClearBlurs}
                      className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-red-600 dark:text-red-400
                               hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <Eraser className="h-3 w-3" />
                      Clear Blurs ({blurAreas.length})
                    </button>
                  )}
                  <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <Square className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                    <span className="text-xs text-blue-600 dark:text-blue-400">
                      Click and drag to blur sensitive areas
                    </span>
                  </div>
                </div>
              </div>

              <div className="relative border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
                <canvas
                  ref={canvasRef}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={() => {
                    setIsDrawing(false);
                    setStartPos(null);
                  }}
                  className="w-full cursor-crosshair"
                  style={{ maxHeight: '400px', objectFit: 'contain' }}
                />
                <img ref={imageRef} className="hidden" alt="" />
              </div>

              {blurAreas.length > 0 && (
                <p className="text-xs text-theme-tertiary mt-2">
                  ✓ {blurAreas.length} area{blurAreas.length > 1 ? 's' : ''} will be blurred
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-theme">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-theme-secondary
                     hover:bg-theme-hover rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!title.trim() || !description.trim()}
            className="px-4 py-2 text-sm font-medium text-gray-900 bg-module-fg hover:bg-module-fg/90
                     rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create Ticket
          </button>
        </div>
      </div>
    </div>
  );
}
