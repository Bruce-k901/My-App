import React from 'react';
import { Slide } from '@/data/courses/schema';
import { TextGraphicSlide } from './slides/TextGraphicSlide';
import { DragSortSlide } from './slides/DragSortSlide';
import { HotspotSlide } from './slides/HotspotSlide';
import { ScenarioSlide } from './slides/ScenarioSlide';
import QuizSlide from './slides/QuizSlide';
import { CertificateView } from './CertificateView';
import { useCourseStore } from '@/stores/course-store';

interface SlideViewerProps {
  slide: Slide;
}

export const SlideViewer: React.FC<SlideViewerProps> = ({ slide }) => {
  const { course } = useCourseStore();

  switch (slide.type) {
    case 'text-graphic-split':
      return <TextGraphicSlide key={slide.id} slide={slide} />;
    
    case 'drag-sort':
      return <DragSortSlide key={slide.id} slide={slide} />;

    case 'hotspot-explorer':
      return <HotspotSlide key={slide.id} slide={slide} />;

    case 'scenario-decision':
      return <ScenarioSlide key={slide.id} slide={slide} />;

    case 'quiz':
      return <QuizSlide key={slide.id} slide={slide} />;

    case 'certificate-download':
      if (!course) return null;
      return <CertificateView course={course} />;

    // Placeholder for other types
    default:
      return (
        <div className="p-8 bg-white rounded-xl shadow-sm border border-gray-100 min-h-[600px]">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">{slide.title}</h2>
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-500 uppercase tracking-wide font-semibold mb-2">Slide Type</p>
            <code className="text-blue-600 font-mono">{slide.type}</code>
          </div>
          <div className="mt-6 prose max-w-none">
             {slide.content && <div className="whitespace-pre-wrap">{slide.content}</div>}
          </div>
        </div>
      );
  }
};
