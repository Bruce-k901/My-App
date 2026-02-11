'use client';

import { useState, useEffect, useRef } from 'react';
import { Check, ChevronDown, Search, X, Plus } from '@/components/ui/icons';
import { cn } from '@/lib/utils';
import { CreateCustomerModal } from '@/components/planly/customers/CreateCustomerModal';

interface Customer {
  id: string;
  name: string;
  contact_name?: string;
  is_ad_hoc: boolean;
  is_active: boolean;
  destination_group?: {
    name: string;
  };
}

interface CustomerSelectorProps {
  siteId: string;
  value: string;
  onChange: (id: string, name: string) => void;
}

export function CustomerSelector({ siteId, value, onChange }: CustomerSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (siteId) {
      loadCustomers();
    }
  }, [siteId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadCustomers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/planly/customers?siteId=${siteId}&isActive=true`);
      if (res.ok) {
        const data = await res.json();
        setCustomers(data);
      }
    } catch (err) {
      console.error('Failed to load customers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedCustomer = customers.find(c => c.id === value);

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.contact_name?.toLowerCase().includes(search.toLowerCase())
  );

  const regularCustomers = filteredCustomers.filter(c => !c.is_ad_hoc);
  const adHocCustomers = filteredCustomers.filter(c => c.is_ad_hoc);

  const handleSelect = (customer: Customer) => {
    onChange(customer.id, customer.name);
    setOpen(false);
    setSearch('');
  };

  const handleCreateCustomer = () => {
    setOpen(false);
    setShowCreateModal(true);
  };

  const handleCustomerCreated = (customer: { id: string; name: string }) => {
    // Reload customers and select the new one
    loadCustomers();
    onChange(customer.id, customer.name);
  };

  return (
    <>
      <div ref={containerRef} className="relative">
        {/* Trigger Button */}
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className={cn(
            'w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-left',
            'bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] text-gray-900 dark:text-white',
            'hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors',
            open && 'ring-2 ring-[#14B8A6]/50'
          )}
        >
          {selectedCustomer ? (
            <span className="flex items-center gap-2 min-w-0 flex-1">
              <span className="font-medium truncate">{selectedCustomer.name}</span>
              {selectedCustomer.destination_group && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-white/40 uppercase tracking-wide shrink-0">
                  {selectedCustomer.destination_group.name}
                </span>
              )}
            </span>
          ) : (
            <span className="text-gray-400 dark:text-white/40">Select customer...</span>
          )}
          <ChevronDown className={cn(
            'h-4 w-4 text-gray-400 dark:text-white/60 transition-transform shrink-0 ml-2',
            open && 'rotate-180'
          )} />
        </button>

        {/* Dropdown */}
        {open && (
          <div className="absolute z-[200] mt-1 w-full bg-white dark:bg-neutral-900 border border-gray-200 dark:border-white/10 rounded-lg shadow-xl">
            {/* Search Input */}
            <div className="p-2 border-b border-gray-200 dark:border-white/10">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-white/40" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search customers..."
                  className="w-full pl-9 pr-8 py-2 bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-md text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/50"
                  autoFocus
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-white/40 hover:text-gray-600 dark:hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Create New Customer Option */}
            <button
              type="button"
              onClick={handleCreateCustomer}
              className="w-full flex items-center gap-3 px-3 py-3 text-left border-b border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/[0.06] transition-colors"
            >
              <div className="w-6 h-6 rounded-full bg-[#14B8A6]/10 flex items-center justify-center">
                <Plus className="h-4 w-4 text-[#14B8A6]" />
              </div>
              <span className="font-medium text-[#14B8A6]">Create new customer</span>
            </button>

            {/* Customer List */}
            <div className="max-h-[300px] overflow-y-scroll rounded-b-lg">
              {isLoading ? (
                <div className="py-8 text-center text-gray-400 dark:text-white/40">Loading...</div>
              ) : filteredCustomers.length === 0 ? (
                <div className="py-8 text-center text-gray-400 dark:text-white/40">No customers found</div>
              ) : (
                <>
                  {/* Regular Customers */}
                  {regularCustomers.length > 0 && (
                    <div>
                      <div className="px-3 py-2 text-xs uppercase text-gray-500 dark:text-white/40 font-semibold">
                        Customers ({regularCustomers.length})
                      </div>
                      {regularCustomers.map(customer => (
                        <button
                          key={customer.id}
                          type="button"
                          onClick={() => handleSelect(customer)}
                          className={cn(
                            'w-full flex items-center gap-3 px-3 py-2 text-left transition-colors',
                            'hover:bg-gray-50 dark:hover:bg-white/[0.06]',
                            value === customer.id && 'bg-gray-50 dark:bg-white/[0.03]'
                          )}
                        >
                          <div className={cn(
                            'w-4 h-4 rounded border flex items-center justify-center shrink-0',
                            value === customer.id
                              ? 'bg-[#14B8A6] border-[#14B8A6]'
                              : 'border-gray-300 dark:border-white/20'
                          )}>
                            {value === customer.id && (
                              <Check className="h-3 w-3 text-white" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-gray-900 dark:text-white font-medium">{customer.name}</span>
                              {customer.destination_group && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-white/40 uppercase tracking-wide">
                                  {customer.destination_group.name}
                                </span>
                              )}
                            </div>
                            {customer.contact_name && (
                              <div className="text-xs text-gray-500 dark:text-white/40 truncate">{customer.contact_name}</div>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Ad-hoc Customers */}
                  {adHocCustomers.length > 0 && (
                    <div>
                      <div className="px-3 py-2 text-xs uppercase text-gray-500 dark:text-white/40 font-semibold border-t border-gray-200 dark:border-white/[0.06]">
                        Ad-hoc ({adHocCustomers.length})
                      </div>
                      {adHocCustomers.map(customer => (
                        <button
                          key={customer.id}
                          type="button"
                          onClick={() => handleSelect(customer)}
                          className={cn(
                            'w-full flex items-center gap-3 px-3 py-2 text-left transition-colors',
                            'hover:bg-gray-50 dark:hover:bg-white/[0.06]',
                            value === customer.id && 'bg-gray-50 dark:bg-white/[0.03]'
                          )}
                        >
                          <div className={cn(
                            'w-4 h-4 rounded border flex items-center justify-center shrink-0',
                            value === customer.id
                              ? 'bg-[#14B8A6] border-[#14B8A6]'
                              : 'border-gray-300 dark:border-white/20'
                          )}>
                            {value === customer.id && (
                              <Check className="h-3 w-3 text-white" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-gray-900 dark:text-white truncate">{customer.name}</div>
                          </div>
                          <span className="text-xs px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
                            Ad-hoc
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Create Customer Modal */}
      <CreateCustomerModal
        siteId={siteId}
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleCustomerCreated}
      />
    </>
  );
}
