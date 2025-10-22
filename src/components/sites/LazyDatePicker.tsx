'use client';

import React, { Suspense } from 'react';

const DatePickerComponent = React.lazy(
  () => import('react-datepicker')
);

// Define a more flexible type for DatePicker props
type DatePickerProps = {
  selected?: Date | null;
  onChange?: (date: Date | null) => void;
  placeholderText?: string;
  className?: string;
  popperClassName?: string;
  calendarClassName?: string;
  minDate?: Date;
  openToDate?: Date;
  [key: string]: any; // Allow any additional props
};

const LazyDatePicker: React.FC<DatePickerProps> = (props) => {
  // Import CSS dynamically
  React.useEffect(() => {
    // Use require instead of import for CSS to avoid TypeScript errors
    if (typeof window !== 'undefined') {
      try {
        require('react-datepicker/dist/react-datepicker.css');
      } catch (error) {
        console.warn('Could not load react-datepicker CSS');
      }
    }
  }, []);

  return (
    <Suspense fallback={<div className="animate-pulse bg-neutral-700 h-10 rounded-md"></div>}>
      <DatePickerComponent {...props} />
    </Suspense>
  );
};

export default LazyDatePicker;