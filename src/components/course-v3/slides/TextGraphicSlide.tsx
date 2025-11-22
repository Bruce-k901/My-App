import React from 'react';
import { Slide } from '@/data/courses/schema';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';

interface TextGraphicSlideProps {
  slide: Slide;
}

export const TextGraphicSlide: React.FC<TextGraphicSlideProps> = ({ slide }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start animate-in fade-in duration-500">
      {/* Text Content */}
      <div className="flex flex-col justify-center">
        <h2 className="text-4xl font-extrabold text-slate-900 mb-8 tracking-tight">{slide.title}</h2>
        {slide.content && (
            <div className="text-slate-700 text-lg leading-relaxed">
                <ReactMarkdown
                  components={{
                    h1: ({node, ...props}) => <h3 className="text-2xl font-bold text-slate-900 mt-8 mb-4" {...props} />,
                    h2: ({node, ...props}) => <h3 className="text-2xl font-bold text-slate-900 mt-8 mb-4" {...props} />,
                    h3: ({node, ...props}) => <h4 className="text-xl font-semibold text-slate-800 mt-6 mb-3" {...props} />,
                    p: ({node, ...props}) => <p className="mb-6 text-slate-700" {...props} />,
                    ul: ({node, ...props}) => <ul className="space-y-3 mb-6 pl-1" {...props} />,
                    li: ({node, ...props}) => (
                      <li className="flex items-start gap-3 text-slate-700" {...props}>
                        <span className="mt-2 block w-1.5 h-1.5 rounded-full bg-blue-600 flex-shrink-0" />
                        <span className="flex-1">{props.children}</span>
                      </li>
                    ),
                    strong: ({node, ...props}) => <strong className="font-bold text-slate-900" {...props} />,
                  }}
                >
                  {slide.content}
                </ReactMarkdown>
            </div>
        )}
      </div>

      {/* Graphic/Media */}
      {slide.mediaUrl && (
        <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-slate-200/50 aspect-[4/3] lg:aspect-square bg-white ring-1 ring-slate-900/5">
            <img 
                src={slide.mediaUrl} 
                alt={slide.title}
                className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 ring-1 ring-inset ring-black/5 rounded-2xl" />
        </div>
      )}
    </div>
  );
};
