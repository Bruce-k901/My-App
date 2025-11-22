import React, { useState } from 'react';
import { Slide } from '@/data/courses/schema';
import { useCourseStore } from '@/stores/course-store';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HotspotSlideProps {
  slide: Slide;
}

export const HotspotSlide: React.FC<HotspotSlideProps> = ({ slide }) => {
  const { markSlideComplete } = useCourseStore();
  const { hotspotData } = slide;
  
  const [foundHotspots, setFoundHotspots] = useState<string[]>([]);
  const [activeHotspot, setActiveHotspot] = useState<string | null>(null);

  if (!hotspotData) return <div>Error: Missing hotspot data</div>;

  const handleHotspotClick = (id: string) => {
    setActiveHotspot(id);
    if (!foundHotspots.includes(id)) {
        const newFound = [...foundHotspots, id];
        setFoundHotspots(newFound);
        
        if (newFound.length === hotspotData.hotspots.length) {
            markSlideComplete(slide.id);
        }
    }
  };

  const isComplete = foundHotspots.length === hotspotData.hotspots.length;

  return (
    <div className="max-w-5xl mx-auto">
       <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">{slide.title}</h2>
        <p className="text-slate-600">{slide.content}</p>
        <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
            <span>Hazards Found: {foundHotspots.length} / {hotspotData.hotspots.length}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Image Area */}
        <div className="lg:col-span-2 relative rounded-xl overflow-hidden shadow-lg bg-gray-900 aspect-[4/3]">
            <img 
                src={hotspotData.imageUrl} 
                alt="Find the hazards" 
                className="w-full h-full object-cover opacity-90"
            />
            
            {/* Hotspots */}
            {hotspotData.hotspots.map(hotspot => {
                const isFound = foundHotspots.includes(hotspot.id);
                const isActive = activeHotspot === hotspot.id;

                return (
                    <button
                        key={hotspot.id}
                        onClick={() => handleHotspotClick(hotspot.id)}
                        style={{ left: `${hotspot.x}%`, top: `${hotspot.y}%` }}
                        className={cn(
                            "absolute w-12 h-12 -ml-6 -mt-6 rounded-full border-4 transition-all transform hover:scale-110 focus:outline-none flex items-center justify-center shadow-xl",
                            isFound ? "bg-green-500 border-white text-white" : "bg-white/20 border-white/50 hover:bg-white/40 animate-pulse",
                            isActive && isFound && "ring-4 ring-green-300 scale-110"
                        )}
                    >
                        {isFound ? <CheckCircle className="w-6 h-6" /> : <span className="sr-only">Hazard</span>}
                    </button>
                );
            })}
        </div>

        {/* Feedback Area */}
        <div className="lg:col-span-1 space-y-4">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-blue-600" />
                Identified Hazards
            </h3>
            
            <div className="space-y-3">
                {hotspotData.hotspots.map(hotspot => {
                    const isFound = foundHotspots.includes(hotspot.id);
                    const isActive = activeHotspot === hotspot.id;

                    return (
                        <div 
                            key={hotspot.id}
                            className={cn(
                                "p-4 rounded-lg border transition-all duration-500",
                                isFound ? "bg-white border-green-200 shadow-sm" : "bg-gray-50 border-transparent opacity-50 grayscale",
                                isActive && "ring-2 ring-blue-500 border-blue-200 shadow-md scale-105 z-10"
                            )}
                        >
                            <div className="flex items-start gap-3">
                                <div className={cn(
                                    "w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                                    isFound ? "bg-green-100 text-green-600" : "bg-gray-200 text-gray-400"
                                )}>
                                    {isFound ? <CheckCircle className="w-4 h-4" /> : "?"}
                                </div>
                                <div>
                                    <h4 className={cn("font-bold text-sm", isFound ? "text-slate-900" : "text-slate-400")}>
                                        {isFound ? hotspot.label : "Unknown Hazard"}
                                    </h4>
                                    {isFound && (
                                        <p className="text-xs text-slate-600 mt-1 leading-relaxed animate-in fade-in">
                                            {hotspot.description}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {isComplete && (
                <div className="mt-6 p-4 bg-green-50 text-green-800 rounded-lg text-center font-medium animate-in slide-in-from-bottom-4">
                    Excellent! You've spotted all the hazards.
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
