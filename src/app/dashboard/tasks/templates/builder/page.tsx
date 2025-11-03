"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { MasterTemplateModal } from '@/components/templates/MasterTemplateModal';

export default function TemplateBuilderPage() {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(true);

  const handleClose = () => {
    setIsModalOpen(false);
    router.push('/dashboard/tasks/templates');
  };

  const handleSave = (templateConfig: any) => {
    router.push('/dashboard/tasks/templates');
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Template Builder</h1>
        <p className="text-white/60">Create a custom task template</p>
      </div>

      <MasterTemplateModal 
        isOpen={isModalOpen}
        onClose={handleClose}
        onSave={handleSave}
      />
    </div>
  );
}

