import React, { useState, useEffect } from 'react';
import { Slide } from '@/data/courses/schema';
import { DndContext, useDraggable, useDroppable, DragEndEvent } from '@dnd-kit/core';
import { useCourseStore } from '@/stores/course-store';
import { CheckCircle, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DragSortSlideProps {
  slide: Slide;
}

interface DraggableItemProps {
  id: string;
  label: string;
}

const DraggableItem: React.FC<DraggableItemProps> = ({ id, label }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: id,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "bg-white p-3 rounded-lg shadow-sm border border-gray-200 cursor-grab active:cursor-grabbing hover:shadow-md transition-all text-sm font-medium text-slate-700 select-none touch-none",
        isDragging && "opacity-50 z-50 shadow-xl scale-105"
      )}
    >
      {label}
    </div>
  );
};

interface DroppableZoneProps {
  id: string;
  label: string;
  items: { id: string; label: string }[];
  isCorrect?: boolean;
}

const DroppableZone: React.FC<DroppableZoneProps> = ({ id, label, items, isCorrect }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: id,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "bg-gray-50 rounded-xl p-4 border-2 transition-colors min-h-[160px] flex flex-col",
        isOver ? "border-blue-400 bg-blue-50/50" : "border-dashed border-gray-300",
        isCorrect && "border-green-500 bg-green-50 border-solid"
      )}
    >
      <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 text-center">{label}</h3>
      <div className="space-y-2 flex-1">
        {items.map(item => (
          <DraggableItem key={item.id} id={item.id} label={item.label} />
        ))}
        {items.length === 0 && (
            <div className="h-full flex items-center justify-center text-gray-300 text-xs italic">
                Drop items here
            </div>
        )}
      </div>
    </div>
  );
};

export const DragSortSlide: React.FC<DragSortSlideProps> = ({ slide }) => {
  const { markSlideComplete } = useCourseStore();
  const { dragSortData } = slide;
  
  // State to track where items are dropped
  // Map of itemId -> categoryId (or 'pool' if not dropped yet)
  const [itemLocations, setItemLocations] = useState<Record<string, string>>({});
  const [isComplete, setIsComplete] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Initialize items in the 'pool'
  useEffect(() => {
    if (dragSortData) {
        const initialLocations: Record<string, string> = {};
        dragSortData.items.forEach(item => {
            initialLocations[item.id] = 'pool';
        });
        setItemLocations(initialLocations);
    }
  }, [dragSortData]);

  if (!dragSortData) return <div>Error: Missing drag sort data</div>;

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setItemLocations((prev) => ({
        ...prev,
        [active.id]: over.id as string,
      }));
      setFeedback(null); // Clear feedback on move
    }
  };

  const checkAnswers = () => {
    let allCorrect = true;
    
    dragSortData.items.forEach(item => {
        if (itemLocations[item.id] !== item.categoryId) {
            allCorrect = false;
        }
    });

    if (allCorrect) {
        setIsComplete(true);
        markSlideComplete(slide.id);
        setFeedback("Correct! You've identified all the hazards.");
    } else {
        setFeedback("Not quite right. Check where you've placed the items.");
    }
  };

  // Group items by their current location for rendering
  const poolItems = dragSortData.items.filter(item => itemLocations[item.id] === 'pool');
  
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">{slide.title}</h2>
        <p className="text-slate-600">{slide.content}</p>
      </div>

      <DndContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {dragSortData.categories.map(category => (
            <DroppableZone 
                key={category.id} 
                id={category.id} 
                label={category.label}
                items={dragSortData.items.filter(item => itemLocations[item.id] === category.id)}
                isCorrect={isComplete}
            />
          ))}
        </div>

        {/* Pool of unsorted items */}
        {!isComplete && poolItems.length > 0 && (
            <div className="bg-slate-100 p-6 rounded-xl border border-slate-200">
                <h3 className="text-sm font-bold text-slate-500 mb-4 flex items-center gap-2">
                    <HelpCircle className="w-4 h-4" />
                    Unsorted Items
                </h3>
                <div className="flex flex-wrap gap-3">
                    {poolItems.map(item => (
                        <DraggableItem key={item.id} id={item.id} label={item.label} />
                    ))}
                </div>
            </div>
        )}
      </DndContext>

      {/* Feedback & Actions */}
      <div className="mt-8 flex flex-col items-center gap-4">
        {feedback && (
            <div className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium animate-in fade-in slide-in-from-bottom-2",
                isComplete ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
            )}>
                {feedback}
            </div>
        )}
        
        {!isComplete && poolItems.length === 0 && (
            <button 
                onClick={checkAnswers}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
            >
                Check Answers
            </button>
        )}

        {isComplete && (
             <div className="flex items-center gap-2 text-green-600 font-bold text-lg animate-in zoom-in duration-300">
                <CheckCircle className="w-6 h-6" />
                <span>Well Done!</span>
             </div>
        )}
      </div>
    </div>
  );
};
