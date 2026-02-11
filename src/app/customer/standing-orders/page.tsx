'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Edit, Pause, Play, Loader2, Plus, Minus } from '@/components/ui/icons';
import { Button } from '@/components/ui';
import {
  getCustomerProfile,
  getStandingOrders,
  updateStandingOrder,
  getProductCatalog,
  type Customer,
  type StandingOrder,
  type Product,
  type OrderItem,
} from '@/lib/order-book/customer';

export default function StandingOrdersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [standingOrder, setStandingOrder] = useState<StandingOrder | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editedItems, setEditedItems] = useState<OrderItem[]>([]);
  const [editedDeliveryDays, setEditedDeliveryDays] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);

      const customerData = await getCustomerProfile();
      if (!customerData) {
        router.push('/customer/login');
        return;
      }
      setCustomer(customerData);

      // Load standing orders
      const standingOrders = await getStandingOrders({
        customer_id: customerData.id,
      });

      if (standingOrders.length > 0) {
        const so = standingOrders[0];
        setStandingOrder(so);
        setEditedItems(so.items || []);
        setEditedDeliveryDays(so.delivery_days || []);
      }

      // Load products
      const productsData = await getProductCatalog(customerData.site_id);
      setProducts(productsData);
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load standing order. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!standingOrder) return;

    try {
      setSaving(true);
      setError(null);

      await updateStandingOrder(standingOrder.id, {
        delivery_days: editedDeliveryDays,
        items: editedItems,
      });

      await loadData(); // Reload to get updated data
      setIsEditing(false);
    } catch (error: any) {
      console.error('Error updating standing order:', error);
      setError(error.message || 'Failed to update standing order. Please try again.');
      setSaving(false);
    }
  }

  async function handleTogglePause() {
    if (!standingOrder) return;

    try {
      setSaving(true);
      setError(null);

      await updateStandingOrder(standingOrder.id, {
        is_paused: !standingOrder.is_paused,
      });

      await loadData();
    } catch (error: any) {
      console.error('Error toggling pause:', error);
      setError(error.message || 'Failed to update standing order. Please try again.');
      setSaving(false);
    }
  }

  function addProduct(productId: string) {
    const existingItem = editedItems.find((item) => item.product_id === productId);
    if (existingItem) {
      setEditedItems(
        editedItems.map((item) =>
          item.product_id === productId ? { ...item, quantity: (item.quantity || 0) + 1 } : item
        )
      );
    } else {
      setEditedItems([...editedItems, { product_id: productId, quantity: 1 }]);
    }
  }

  function updateItemQuantity(productId: string, quantity: number) {
    if (quantity <= 0) {
      setEditedItems(editedItems.filter((item) => item.product_id !== productId));
      return;
    }
    setEditedItems(
      editedItems.map((item) => (item.product_id === productId ? { ...item, quantity } : item))
    );
  }

  function toggleDeliveryDay(day: string) {
    if (editedDeliveryDays.includes(day)) {
      setEditedDeliveryDays(editedDeliveryDays.filter((d) => d !== day));
    } else {
      setEditedDeliveryDays([...editedDeliveryDays, day]);
    }
  }

  const DAYS = [
    { value: 'monday', label: 'Monday' },
    { value: 'tuesday', label: 'Tuesday' },
    { value: 'wednesday', label: 'Wednesday' },
    { value: 'thursday', label: 'Thursday' },
    { value: 'friday', label: 'Friday' },
    { value: 'saturday', label: 'Saturday' },
    { value: 'sunday', label: 'Sunday' },
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-[#D37E91] animate-spin" />
      </div>
    );
  }

  if (!standingOrder) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="mb-6">
          <Link
            href="/customer/dashboard"
            className="inline-flex items-center gap-2 text-white/60 hover:text-white text-sm mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Standing Orders</h1>
        </div>
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-8 sm:p-12 text-center">
          <p className="text-white/60 text-sm sm:text-base mb-4">
            You don't have a standing order yet.
          </p>
          <Link href="/customer/order/new">
            <Button
              variant="primary"
              className="bg-transparent text-[#D37E91] border border-[#D37E91] hover:shadow-[0_0_12px_rgba(211,126,145,0.7)] min-h-[44px]"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Standing Order
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/customer/dashboard"
          className="inline-flex items-center gap-2 text-white/60 hover:text-white text-sm mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Standing Order</h1>
          {!isEditing && (
            <div className="flex gap-2">
              <Button
                onClick={handleTogglePause}
                variant="ghost"
                className="text-[#D37E91] border border-[#D37E91] hover:shadow-[0_0_12px_rgba(211,126,145,0.7)] min-h-[44px]"
                disabled={saving}
              >
                {standingOrder.is_paused ? (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Resume
                  </>
                ) : (
                  <>
                    <Pause className="w-4 h-4 mr-2" />
                    Pause
                  </>
                )}
              </Button>
              <Button
                onClick={() => setIsEditing(true)}
                variant="ghost"
                className="text-[#D37E91] border border-[#D37E91] hover:shadow-[0_0_12px_rgba(211,126,145,0.7)] min-h-[44px]"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Status Badge */}
      {!standingOrder.is_active && (
        <div className="mb-4 p-3 bg-yellow-500/20 border border-yellow-500/30 rounded-lg text-sm text-yellow-300">
          This standing order is not active
        </div>
      )}
      {standingOrder.is_paused && (
        <div className="mb-4 p-3 bg-blue-500/20 border border-blue-500/30 rounded-lg text-sm text-blue-300">
          This standing order is paused
        </div>
      )}

      {/* Delivery Days */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 sm:p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4">Delivery Days</h2>
        {isEditing ? (
          <div className="flex flex-wrap gap-2">
            {DAYS.map((day) => (
              <button
                key={day.value}
                type="button"
                onClick={() => toggleDeliveryDay(day.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium min-h-[44px] transition-all ${
                  editedDeliveryDays.includes(day.value)
                    ? 'bg-[#D37E91]/20 text-[#D37E91] border border-[#D37E91]'
                    : 'bg-white/[0.03] text-white/60 border border-white/[0.06] hover:bg-white/[0.05]'
                }`}
              >
                {day.label}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {standingOrder.delivery_days.map((day) => {
              const dayLabel = DAYS.find((d) => d.value === day)?.label || day;
              return (
                <span
                  key={day}
                  className="px-4 py-2 bg-[#D37E91]/20 text-[#D37E91] border border-[#D37E91] rounded-lg text-sm font-medium"
                >
                  {dayLabel}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Items */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 sm:p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4">Items</h2>

        {isEditing ? (
          <>
            {/* Add Products */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-white/60 mb-3">Add Products</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {products
                  .filter((p) => p.is_active && p.is_available)
                  .map((product) => {
                    const item = editedItems.find((i) => i.product_id === product.id);
                    const quantity = item?.quantity || 0;

                    return (
                      <div
                        key={product.id}
                        className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-white text-sm truncate">
                              {product.name}
                            </h4>
                            <p className="text-[#D37E91] text-xs mt-1">
                              {formatCurrency(product.base_price)} / {product.unit}
                            </p>
                          </div>
                        </div>
                        {quantity > 0 ? (
                          <div className="flex items-center gap-3 mt-2">
                            <button
                              type="button"
                              onClick={() => updateItemQuantity(product.id, quantity - 1)}
                              className="w-10 h-10 rounded-lg border border-white/[0.2] text-white hover:bg-white/[0.1] flex items-center justify-center min-h-[44px] min-w-[44px]"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="text-white font-medium w-8 text-center">
                              {quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateItemQuantity(product.id, quantity + 1)}
                              className="w-10 h-10 rounded-lg border border-white/[0.2] text-white hover:bg-white/[0.1] flex items-center justify-center min-h-[44px] min-w-[44px]"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <Button
                            type="button"
                            onClick={() => addProduct(product.id)}
                            variant="ghost"
                            className="w-full mt-2 text-[#D37E91] border border-[#D37E91] hover:shadow-[0_0_12px_rgba(211,126,145,0.7)] min-h-[44px]"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add
                          </Button>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Save/Cancel */}
            <div className="flex gap-3 pt-4 border-t border-white/[0.06]">
              <Button
                onClick={handleSave}
                variant="primary"
                className="flex-1 bg-transparent text-[#D37E91] border border-[#D37E91] hover:shadow-[0_0_12px_rgba(211,126,145,0.7)] min-h-[44px]"
                disabled={saving || editedDeliveryDays.length === 0 || editedItems.length === 0}
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
              <Button
                onClick={() => {
                  setIsEditing(false);
                  setEditedItems(standingOrder.items || []);
                  setEditedDeliveryDays(standingOrder.delivery_days || []);
                  setError(null);
                }}
                variant="ghost"
                className="bg-white/[0.03] border border-white/[0.06] text-white/60 hover:text-white min-h-[44px]"
                disabled={saving}
              >
                Cancel
              </Button>
            </div>
          </>
        ) : (
          <div className="space-y-3">
            {standingOrder.items && standingOrder.items.length > 0 ? (
              standingOrder.items.map((item, idx) => {
                const product = products.find((p) => p.id === item.product_id);
                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/[0.06] rounded-lg"
                  >
                    <div>
                      <div className="text-white font-medium">{product?.name || 'Unknown Product'}</div>
                      <div className="text-sm text-white/60">
                        {formatCurrency(product?.base_price || 0)} / {product?.unit || 'unit'}
                      </div>
                    </div>
                    <div className="text-white font-semibold">{item.quantity}x</div>
                  </div>
                );
              })
            ) : (
              <p className="text-white/60 text-sm">No items in this standing order</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

