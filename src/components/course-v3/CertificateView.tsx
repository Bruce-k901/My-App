'use client';

import React, { useEffect, useState } from 'react';
import { Course } from '@/data/courses/schema';
import { Award, Calendar, RefreshCw, Download } from 'lucide-react';
import { format, addYears } from 'date-fns';
import { createClient } from '@/lib/supabaseClient';

interface CertificateViewProps {
  course: Course;
  completionDate?: Date;
}

export const CertificateView: React.FC<CertificateViewProps> = ({ 
  course, 
  completionDate = new Date() 
}) => {
  const [userName, setUserName] = useState<string>('Loading...');
  const refresherDate = addYears(completionDate, course.refresherYears);
  const certificateId = Math.random().toString(36).substr(2, 9).toUpperCase();

  useEffect(() => {
    async function fetchUserName() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Try to get full name from profile, fallback to email
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();
        
        setUserName(profile?.full_name || user.email?.split('@')[0] || 'User');
      }
    }

    fetchUserName();
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="bg-gradient-to-br from-white to-blue-50 border-8 border-double border-blue-200 p-12 rounded-lg shadow-2xl text-center relative overflow-hidden">
        {/* Decorative Background */}
        <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
            <div className="absolute -top-20 -left-20 w-64 h-64 bg-blue-500 rounded-full blur-3xl" />
            <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-green-500 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10">
            <Award className="w-24 h-24 text-blue-600 mx-auto mb-6" />
            
            <h1 className="text-4xl md:text-5xl font-serif font-bold text-slate-900 mb-4 tracking-tight">
                Certificate of Completion
            </h1>
            
            <p className="text-xl text-slate-500 mb-12 font-light">
                This is to certify that
            </p>

            <div className="text-3xl md:text-4xl font-bold text-slate-800 border-b-4 border-blue-600 pb-4 mb-12 inline-block min-w-[300px]">
                {userName}
            </div>

            <p className="text-xl text-slate-500 mb-6">
                has successfully completed the course
            </p>

            <h2 className="text-2xl md:text-3xl font-bold text-blue-900 mb-4">
                {course.title}
            </h2>
            
            <p className="text-lg text-slate-600 mb-16">
                and has demonstrated competency in all required areas
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto mb-8">
                <div className="bg-white p-6 rounded-xl border-2 border-slate-200 shadow-md">
                    <div className="flex items-center justify-center gap-2 text-slate-500 mb-2">
                        <Calendar className="w-5 h-5" />
                        <span className="text-sm uppercase tracking-wider font-bold">Issue Date</span>
                    </div>
                    <div className="text-lg font-bold text-slate-900">
                        {format(completionDate, 'dd MMM yyyy')}
                    </div>
                </div>

                <div className="bg-blue-50 p-6 rounded-xl border-2 border-blue-200 shadow-md">
                    <div className="flex items-center justify-center gap-2 text-blue-600 mb-2">
                        <RefreshCw className="w-5 h-5" />
                        <span className="text-sm uppercase tracking-wider font-bold">Valid Until</span>
                    </div>
                    <div className="text-lg font-bold text-blue-900">
                        {format(refresherDate, 'dd MMM yyyy')}
                    </div>
                </div>

                <div className="bg-green-50 p-6 rounded-xl border-2 border-green-200 shadow-md">
                    <div className="flex items-center justify-center gap-2 text-green-600 mb-2">
                        <Award className="w-5 h-5" />
                        <span className="text-sm uppercase tracking-wider font-bold">Certificate ID</span>
                    </div>
                    <div className="text-lg font-bold text-green-900 font-mono">
                        {certificateId}
                    </div>
                </div>
            </div>

            <div className="text-sm text-slate-500 italic">
                This certificate is valid for {course.refresherYears} {course.refresherYears === 1 ? 'year' : 'years'} from the issue date
            </div>
        </div>
      </div>

      <div className="mt-8 flex gap-4 justify-center">
        <button 
            onClick={() => window.print()}
            className="px-8 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-lg flex items-center gap-2"
        >
            <Download className="w-5 h-5" />
            Download Certificate
        </button>
      </div>
    </div>
  );
};
