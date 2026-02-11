"use client";

import { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { 
  Truck,
  Clock,
  Calendar,
  AlertTriangle,
  Info,
  Loader2
} from '@/components/ui/icons';

interface DeliveryInfo {
  next_delivery_date: string;
  order_by_date: string;
  order_by_time: string;
  lead_time_days: number;
  area_name: string;
  uses_third_party: boolean;
}

interface DeliveryScheduleInfoProps {
  supplierId: string;
  onDeliveryDateChange?: (date: string) => void;
}

export default function DeliveryScheduleInfo({ 
  supplierId,
  onDeliveryDateChange 
}: DeliveryScheduleInfoProps) {
  const { siteId } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [deliveryInfo, setDeliveryInfo] = useState<DeliveryInfo | null>(null);
  const [supplier, setSupplier] = useState<{ name: string; delivery_days: string[] | null; minimum_order_value: number | null } | null>(null);

  useEffect(() => {
    if (supplierId && siteId) {
      loadDeliveryInfo();
      loadSupplier();
    }
  }, [supplierId, siteId]);

  async function loadSupplier() {
    const { data } = await supabase
      .from('suppliers')
      .select('name, delivery_days, minimum_order_value, order_cutoff_time')
      .eq('id', supplierId)
      .single();
    
    setSupplier(data);
  }

  async function loadDeliveryInfo() {
    if (!supplierId || !siteId) return;
    setLoading(true);
    
    try {
      // Calculate delivery date based on supplier lead time
      // RPC function get_next_delivery_date may not exist, so use direct calculation
      const { data: supplierData } = await supabase
        .from('suppliers')
        .select('lead_time_days, delivery_days, order_cutoff_time')
        .eq('id', supplierId)
        .single();
      
      if (supplierData) {
        const leadTime = supplierData.lead_time_days || 1;
        const deliveryDate = new Date();
        deliveryDate.setDate(deliveryDate.getDate() + leadTime);
        
        // Calculate order by date (typically same day, cutoff at supplier's order_cutoff_time or default 14:00)
        const orderByDate = new Date();
        const orderByTime = supplierData.order_cutoff_time || '14:00';
        
        setDeliveryInfo({
          next_delivery_date: deliveryDate.toISOString().split('T')[0],
          order_by_date: orderByDate.toISOString().split('T')[0],
          order_by_time: orderByTime,
          lead_time_days: leadTime,
          area_name: 'Default',
          uses_third_party: false
        });
        
        if (onDeliveryDateChange) {
          onDeliveryDateChange(deliveryDate.toISOString().split('T')[0]);
        }
      }
    } catch (error) {
      console.error('Error loading delivery info:', error);
    } finally {
      setLoading(false);
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
  };

  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    return `${hour > 12 ? hour - 12 : hour}:${minutes}${hour >= 12 ? 'pm' : 'am'}`;
  };

  const isOrderCutoffPassed = () => {
    if (!deliveryInfo) return false;
    const now = new Date();
    const cutoffDate = new Date(deliveryInfo.order_by_date);
    const [hours, minutes] = deliveryInfo.order_by_time.split(':');
    cutoffDate.setHours(parseInt(hours), parseInt(minutes));
    return now > cutoffDate;
  };

  if (!supplierId) return null;

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-500 dark:text-white/40 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading delivery schedule...
      </div>
    );
  }

  if (!deliveryInfo) return null;

  const cutoffPassed = isOrderCutoffPassed();

  return (
    <div className={`rounded-lg p-4 border ${
      cutoffPassed 
        ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30' 
        : 'bg-white dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06]'
    }`}>
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${
          cutoffPassed 
            ? 'bg-amber-100 dark:bg-amber-500/20' 
            : 'bg-blue-50 dark:bg-blue-500/20'
        }`}>
          <Truck className={`w-5 h-5 ${
            cutoffPassed 
              ? 'text-amber-600 dark:text-amber-400' 
              : 'text-blue-600 dark:text-blue-400'
          }`} />
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-gray-900 dark:text-white font-medium">Delivery Schedule</span>
            {deliveryInfo.uses_third_party && (
              <span className="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 text-xs rounded">
                3rd Party Logistics
              </span>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="flex items-center gap-1.5 text-gray-600 dark:text-white/60 mb-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>Next Delivery</span>
              </div>
              <p className="text-gray-900 dark:text-white font-medium">
                {formatDate(deliveryInfo.next_delivery_date)}
              </p>
            </div>
            
            <div>
              <div className="flex items-center gap-1.5 text-gray-600 dark:text-white/60 mb-1">
                <Clock className="w-3.5 h-3.5" />
                <span>Order By</span>
              </div>
              <p className={`font-medium ${
                cutoffPassed 
                  ? 'text-amber-700 dark:text-amber-400' 
                  : 'text-gray-900 dark:text-white'
              }`}>
                {formatDate(deliveryInfo.order_by_date)} at {formatTime(deliveryInfo.order_by_time)}
              </p>
            </div>
          </div>
          
          {cutoffPassed && (
            <div className="flex items-center gap-2 mt-3 text-amber-700 dark:text-amber-400 text-sm">
              <AlertTriangle className="w-4 h-4" />
              <span>Cutoff passed - delivery will be later than shown</span>
            </div>
          )}
          
          {deliveryInfo.uses_third_party && (
            <div className="flex items-center gap-2 mt-3 text-yellow-700 dark:text-yellow-400/80 text-xs">
              <Info className="w-3.5 h-3.5" />
              <span>Delivered via 3rd party - times may vary</span>
            </div>
          )}

          {/* Delivery days if available */}
          {supplier?.delivery_days && supplier.delivery_days.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-white/[0.06]">
              <p className="text-gray-500 dark:text-white/40 text-xs mb-1">Delivery days:</p>
              <div className="flex gap-1">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => {
                  const dayLower = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'][i];
                  const isDeliveryDay = supplier.delivery_days?.includes(dayLower);
                  return (
                    <span
                      key={day}
                      className={`px-2 py-0.5 rounded text-xs ${
                        isDeliveryDay 
                          ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400' 
                          : 'bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-white/20'
                      }`}
                    >
                      {day}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

