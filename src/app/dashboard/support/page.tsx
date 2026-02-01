"use client";

import React, { useState } from 'react';
import { Mail, MessageCircle, BookOpen, HelpCircle, Phone, Calendar, FileText, ExternalLink } from 'lucide-react';

export default function SupportPage() {
  const [activeTab, setActiveTab] = useState('help');

  const supportSections = [
    {
      id: 'help',
      title: 'Help Center',
      icon: HelpCircle,
      content: (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 bg-white/[0.03] border border-white/[0.06] rounded-xl">
              <h3 className="text-lg font-medium text-white mb-3">Getting Started</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>• Setting up your organization</li>
                <li>• Adding team members</li>
                <li>• Creating your first tasks</li>
                <li>• Understanding compliance templates</li>
              </ul>
            </div>
            
            <div className="p-6 bg-white/[0.03] border border-white/[0.06] rounded-xl">
              <h3 className="text-lg font-medium text-white mb-3">Common Tasks</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>• Managing assets and PPM schedules</li>
                <li>• Creating SOPs and templates</li>
                <li>• Setting up compliance workflows</li>
                <li>• Generating reports</li>
              </ul>
            </div>
          </div>
          
          <div className="p-6 bg-blue-500/10 border border-blue-500/20 rounded-xl">
            <h3 className="text-lg font-medium text-blue-300 mb-2">Quick Tips</h3>
            <p className="text-blue-200 text-sm">
              Use the search bar in any page to quickly find what you're looking for. 
              All pages have contextual help and tooltips to guide you through the process.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'contact',
      title: 'Contact Support',
      icon: MessageCircle,
      content: (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-white/[0.03] border border-white/[0.06] rounded-xl text-center">
              <Mail className="w-8 h-8 text-pink-400 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-white mb-2">Email Support</h3>
              <p className="text-gray-400 text-sm mb-4">Get help via email within 24 hours</p>
              <a 
                href="mailto:support@opsly.app"
                className="inline-flex items-center gap-2 px-4 py-2 bg-pink-500/20 border border-pink-500/40 rounded-lg text-pink-300 hover:bg-pink-500/30 transition-colors"
              >
                <Mail className="w-4 h-4" />
                Send Email
              </a>
            </div>
            
            <div className="p-6 bg-white/[0.03] border border-white/[0.06] rounded-xl text-center">
              <Phone className="w-8 h-8 text-blue-400 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-white mb-2">Phone Support</h3>
              <p className="text-gray-400 text-sm mb-4">Speak with our support team</p>
              <a 
                href="tel:+1234567890"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/20 border border-blue-500/40 rounded-lg text-blue-300 hover:bg-blue-500/30 transition-colors"
              >
                <Phone className="w-4 h-4" />
                Call Now
              </a>
            </div>
            
            <div className="p-6 bg-white/[0.03] border border-white/[0.06] rounded-xl text-center">
              <Calendar className="w-8 h-8 text-green-400 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-white mb-2">Schedule Call</h3>
              <p className="text-gray-400 text-sm mb-4">Book a time that works for you</p>
              <button className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/20 border border-green-500/40 rounded-lg text-green-300 hover:bg-green-500/30 transition-colors">
                <Calendar className="w-4 h-4" />
                Book Call
              </button>
            </div>
          </div>
          
          <div className="p-6 bg-white/[0.03] border border-white/[0.06] rounded-xl">
            <h3 className="text-lg font-medium text-white mb-3">Support Hours</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-400">
              <div>
                <p className="font-medium text-white">Monday - Friday</p>
                <p>9:00 AM - 6:00 PM EST</p>
              </div>
              <div>
                <p className="font-medium text-white">Weekend Support</p>
                <p>Emergency support only</p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'docs',
      title: 'Documentation',
      icon: BookOpen,
      content: (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 bg-white/[0.03] border border-white/[0.06] rounded-xl">
              <h3 className="text-lg font-medium text-white mb-3">User Guides</h3>
              <ul className="space-y-3">
                <li>
                  <a href="#" className="flex items-center gap-2 text-pink-300 hover:text-pink-200 transition-colors">
                    <FileText className="w-4 h-4" />
                    Getting Started Guide
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
                <li>
                  <a href="#" className="flex items-center gap-2 text-pink-300 hover:text-pink-200 transition-colors">
                    <FileText className="w-4 h-4" />
                    Compliance Templates
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
                <li>
                  <a href="#" className="flex items-center gap-2 text-pink-300 hover:text-pink-200 transition-colors">
                    <FileText className="w-4 h-4" />
                    Asset Management
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
                <li>
                  <a href="#" className="flex items-center gap-2 text-pink-300 hover:text-pink-200 transition-colors">
                    <FileText className="w-4 h-4" />
                    SOP Creation
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
              </ul>
            </div>
            
            <div className="p-6 bg-white/[0.03] border border-white/[0.06] rounded-xl">
              <h3 className="text-lg font-medium text-white mb-3">API Documentation</h3>
              <ul className="space-y-3">
                <li>
                  <a href="#" className="flex items-center gap-2 text-blue-300 hover:text-blue-200 transition-colors">
                    <FileText className="w-4 h-4" />
                    API Reference
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
                <li>
                  <a href="#" className="flex items-center gap-2 text-blue-300 hover:text-blue-200 transition-colors">
                    <FileText className="w-4 h-4" />
                    Authentication
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
                <li>
                  <a href="#" className="flex items-center gap-2 text-blue-300 hover:text-blue-200 transition-colors">
                    <FileText className="w-4 h-4" />
                    Webhooks
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
                <li>
                  <a href="#" className="flex items-center gap-2 text-blue-300 hover:text-blue-200 transition-colors">
                    <FileText className="w-4 h-4" />
                    Rate Limits
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="p-6 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl">
            <h3 className="text-lg font-medium text-purple-300 mb-2">Need More Help?</h3>
            <p className="text-purple-200 text-sm mb-4">
              Can't find what you're looking for? Our support team is here to help with any questions or issues you might have.
            </p>
            <button 
              onClick={() => setActiveTab('contact')}
              className="px-4 py-2 bg-purple-500/20 border border-purple-500/40 rounded-lg text-purple-300 hover:bg-purple-500/30 transition-colors"
            >
              Contact Support
            </button>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-magenta-600/20 to-blue-600/20 rounded-2xl p-6 border border-magenta-500/30">
        <h1 className="text-2xl font-semibold mb-2">Support</h1>
        <p className="text-neutral-300 text-sm">Get help, find documentation, and contact our support team</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-white/[0.06] p-1 rounded-lg">
        {supportSections.map((section) => {
          const Icon = section.icon;
          return (
            <button
              key={section.id}
              onClick={() => setActiveTab(section.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                activeTab === section.id
                  ? 'bg-pink-500/20 text-pink-300 border border-pink-500/40'
                  : 'text-gray-400 hover:text-white hover:bg-white/[0.08]'
              }`}
            >
              <Icon className="w-4 h-4" />
              {section.title}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {supportSections.find(section => section.id === activeTab)?.content}
      </div>
    </div>
  );
}
