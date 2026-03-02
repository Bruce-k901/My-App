"use client";

import React, { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { Plus, Search, Filter, BookOpen, Download, Eye, Star, Tag } from '@/components/ui/icons';

interface LibraryItem {
  id: string;
  title: string;
  description: string;
  type: 'document' | 'template' | 'guide' | 'reference';
  category: string;
  file_url?: string;
  created_at: string;
  updated_at: string;
  is_favorite: boolean;
  tags: string[];
}

export default function LibraryPage() {
  const { profile } = useAppContext();
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  useEffect(() => {
    if (profile?.company_id) {
      loadLibraryItems();
    }
  }, [profile?.company_id]);

  const loadLibraryItems = async () => {
    if (!profile?.company_id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('library_items')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setLibraryItems(data || []);
    } catch (err) {
      console.error('Error loading library items:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = libraryItems.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = filterType === 'all' || item.type === filterType;
    const matchesCategory = filterCategory === 'all' || item.category === filterCategory;
    return matchesSearch && matchesType && matchesCategory;
  });

  const types = [...new Set(libraryItems.map(item => item.type))];
  const categories = [...new Set(libraryItems.map(item => item.category))];

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'document': return <BookOpen className="w-4 h-4" />;
      case 'template': return <Download className="w-4 h-4" />;
      case 'guide': return <Eye className="w-4 h-4" />;
      case 'reference': return <Star className="w-4 h-4" />;
      default: return <BookOpen className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'document': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      case 'template': return 'text-green-400 bg-green-500/10 border-green-500/20';
      case 'guide': return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
      case 'reference': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
      default: return 'text-theme-tertiary bg-theme-surface-elevated0/10 border-gray-500/20';
    }
  };

  const handleDownload = (item: LibraryItem) => {
    if (item.file_url) {
      window.open(item.file_url, '_blank');
    }
  };

  const handleToggleFavorite = (itemId: string) => {
    setLibraryItems(items => 
      items.map(item => 
        item.id === itemId 
          ? { ...item, is_favorite: !item.is_favorite }
          : item
      )
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-magenta-600/20 to-blue-600/20 rounded-2xl p-6 border border-magenta-500/30">
        <h1 className="text-2xl font-semibold mb-2">Library</h1>
        <p className="text-theme-tertiary text-sm">Reference materials, guides, and resources</p>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-theme-tertiary w-4 h-4" />
          <input
            type="text"
            placeholder="Search library..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/[0.06] border border-white/[0.1] rounded-lg text-theme-primary placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-module-fg/[0.40]"
          />
        </div>
        
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-4 py-2 bg-white/[0.06] border border-white/[0.1] rounded-lg text-theme-primary focus:outline-none focus:ring-2 focus:ring-module-fg/[0.40]"
        >
          <option value="all">All Types</option>
          {types.map(type => (
            <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
          ))}
        </select>

        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-4 py-2 bg-white/[0.06] border border-white/[0.1] rounded-lg text-theme-primary focus:outline-none focus:ring-2 focus:ring-module-fg/[0.40]"
        >
          <option value="all">All Categories</option>
          {categories.map(category => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>

        <button className="flex items-center gap-2 px-4 py-2 bg-module-fg/[0.25] border border-module-fg/[0.40] rounded-lg text-module-fg hover:bg-module-fg/[0.35] transition-colors">
          <Plus className="w-4 h-4" />
          Add Item
        </button>
      </div>

      {/* Library Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-module-fg mx-auto"></div>
            <p className="text-theme-tertiary mt-2">Loading library items...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <div className="w-16 h-16 bg-theme-surface-elevated0/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-8 h-8 text-theme-tertiary" />
            </div>
            <h3 className="text-lg font-medium text-theme-primary mb-2">No library items found</h3>
            <p className="text-theme-tertiary">Add your first library item to get started</p>
          </div>
        ) : (
          filteredItems.map((item) => (
            <div
              key={item.id}
              className="p-6 bg-white/[0.03] border border-white/[0.06] rounded-xl hover:bg-white/[0.05] transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {getTypeIcon(item.type)}
                    <h3 className="text-lg font-medium text-theme-primary">{item.title}</h3>
                    {item.is_favorite && (
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    )}
                  </div>
                  <p className="text-theme-tertiary text-sm mb-3">{item.description}</p>
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`px-2 py-1 text-xs rounded-full border ${getTypeColor(item.type)}`}>
                      {item.type}
                    </span>
                    <span className="px-2 py-1 text-xs bg-theme-surface-elevated0/10 text-theme-tertiary rounded-full border border-gray-500/20">
                      {item.category}
                    </span>
                  </div>
                  {item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {item.tags.map((tag, index) => (
                        <span key={index} className="px-2 py-1 text-xs bg-module-fg/[0.15] text-module-fg rounded-full border border-module-fg/[0.20]">
                          <Tag className="w-3 h-3 inline mr-1" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleToggleFavorite(item.id)}
                    className={`p-2 transition-colors ${
                      item.is_favorite 
                        ? 'text-yellow-400 hover:text-yellow-300' 
                        : 'text-theme-tertiary hover:text-yellow-400'
                    }`}
                    title={item.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    <Star className={`w-4 h-4 ${item.is_favorite ? 'fill-current' : ''}`} />
                  </button>
                  <button
                    onClick={() => handleDownload(item)}
                    className="p-2 text-theme-tertiary hover:text-white transition-colors"
                    title="Download"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="flex items-center justify-between text-sm text-theme-tertiary">
                <span>Updated {new Date(item.updated_at).toLocaleDateString()}</span>
                <span className="text-xs">{item.type}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
