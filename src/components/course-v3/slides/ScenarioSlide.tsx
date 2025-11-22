import React, { useState } from 'react';
import { Slide } from '@/data/courses/schema';
import { useCourseStore } from '@/stores/course-store';
import { ArrowRight, RotateCcw, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScenarioSlideProps {
  slide: Slide;
}

export const ScenarioSlide: React.FC<ScenarioSlideProps> = ({ slide }) => {
  const { markSlideComplete } = useCourseStore();
  const { scenarioData } = slide;
  
  const [currentNodeId, setCurrentNodeId] = useState<string>(scenarioData?.initialState || 'start');
  const [history, setHistory] = useState<string[]>([]);

  if (!scenarioData) return <div>Error: Missing scenario data</div>;

  const currentNode = scenarioData.nodes[currentNodeId];

  if (!currentNode) {
    return (
      <div className="p-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 text-red-600 mb-4">
          <XCircle className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-2">Scenario Error</h3>
        <p className="text-slate-600 mb-4">
          Could not find step: <code className="bg-slate-100 px-1 py-0.5 rounded">{currentNodeId}</code>
        </p>
        <button 
          onClick={() => {
            setHistory([]);
            setCurrentNodeId(scenarioData.initialState || 'start');
          }}
          className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          Restart Scenario
        </button>
      </div>
    );
  }

  const handleOptionClick = (nextNodeId: string) => {
    setHistory([...history, currentNodeId]);
    setCurrentNodeId(nextNodeId);

    // Check if this is a "terminal" correct node (no options, or specifically marked)
    // For this simple schema, we assume if there are no options, it's an end state.
    // We should check if it's a "success" end state.
    // In our data, "correct-bin" has no options. "wrong-rinse" has "Try Again".
    
    const nextNode = scenarioData.nodes[nextNodeId];
    if (nextNode.options.length === 0) {
        // Assume success if it's a terminal node without "Try Again" logic
        // Or we can just mark complete if they reach ANY terminal node?
        // Let's look at the content. "correct-bin" is the success state.
        if (nextNode.text.includes("Correct")) {
            markSlideComplete(slide.id);
        }
    }
  };

  const resetScenario = () => {
    setCurrentNodeId(scenarioData.initialState);
    setHistory([]);
  };

  const isSuccess = currentNode.text.includes("Correct");
  const isFailure = currentNode.text.includes("Incorrect");

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 p-8 text-white">
            <h2 className="text-2xl font-bold mb-2">{slide.title}</h2>
            <div className="flex items-center gap-2 text-slate-300 text-sm">
                <span className="px-2 py-1 bg-white/10 rounded uppercase tracking-wider font-bold text-xs">Scenario</span>
                <span>Make the right choice</span>
            </div>
        </div>

        {/* Content */}
        <div className="p-8 md:p-12">
            <div className={cn(
                "prose prose-lg max-w-none mb-8 transition-all duration-500",
                isSuccess ? "text-green-800" : isFailure ? "text-red-800" : "text-slate-700"
            )}>
                {/* Simple markdown rendering for bold text */}
                {currentNode.text.split('**').map((part, i) => 
                    i % 2 === 1 ? <strong key={i}>{part}</strong> : part
                )}
            </div>

            {/* Options */}
            <div className="space-y-4">
                {currentNode.options.map((option, index) => (
                    <button
                        key={index}
                        onClick={() => handleOptionClick(option.nextNodeId)}
                        className="w-full text-left p-6 rounded-xl border-2 border-gray-100 hover:border-blue-500 hover:bg-blue-50 transition-all group flex items-center justify-between"
                    >
                        <span className="font-medium text-slate-700 group-hover:text-blue-900">{option.label}</span>
                        <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-blue-500 transform group-hover:translate-x-1 transition-transform" />
                    </button>
                ))}

                {currentNode.options.length === 0 && (
                    <div className="flex justify-center mt-8">
                        {isSuccess ? (
                            <div className="flex flex-col items-center gap-4 animate-in zoom-in">
                                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                                    <CheckCircle className="w-8 h-8" />
                                </div>
                                <p className="font-bold text-green-800 text-lg">Scenario Completed</p>
                            </div>
                        ) : (
                            <button 
                                onClick={resetScenario}
                                className="flex items-center gap-2 px-6 py-3 bg-slate-100 text-slate-700 rounded-lg font-bold hover:bg-slate-200 transition-colors"
                            >
                                <RotateCcw className="w-5 h-5" />
                                Restart Scenario
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};
