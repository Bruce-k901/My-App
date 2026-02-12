"use client";

import { useState } from 'react';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight, DollarSign } from '@/components/ui/icons';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useMonthlySales } from '@/hooks/planly/useMonthlySales';
import { useAppContext } from '@/context/AppContext';
import { MonthlySalesEntry } from '@/types/planly';

export default function MonthlySalesPage() {
  const { siteId } = useAppContext();
  const [currentDate, setCurrentDate] = useState(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  const { data, isLoading, error } = useMonthlySales(year, month, siteId);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 2, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month, 1));
  };

  if (!siteId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-theme-tertiary">Please select a site</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-theme-tertiary">Loading monthly sales...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-red-600 dark:text-red-400">Error loading monthly sales</div>
      </div>
    );
  }

  const entries = (data as { entries: MonthlySalesEntry[] })?.entries || [];

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-theme-primary">Monthly Sales by Site</h1>
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={handlePrevMonth}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous Month
          </Button>
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-module-fg" />
            <span className="text-theme-primary font-medium">
              {format(currentDate, 'MMMM yyyy')}
            </span>
          </div>
          <Button variant="outline" onClick={handleNextMonth}>
            Next Month
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {entries.map((entry) => (
          <Card key={entry.customer_id} className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-theme-primary">{entry.customer_name}</h3>
              <div className="text-right">
                <div className="text-sm text-theme-tertiary">Gross Total</div>
                <div className="text-xl font-bold text-theme-primary">£{entry.gross_total.toFixed(2)}</div>
                {entry.credits_total > 0 && (
                  <>
                    <div className="text-sm text-theme-tertiary mt-1">Credits</div>
                    <div className="text-lg font-semibold text-red-600 dark:text-red-400">-£{entry.credits_total.toFixed(2)}</div>
                  </>
                )}
                <div className="text-sm text-theme-tertiary mt-2">Net Total</div>
                <div className="text-2xl font-bold text-module-fg">£{entry.net_total.toFixed(2)}</div>
              </div>
            </div>

            <div className="border-t border-theme pt-4 mt-4">
              <div className="space-y-2">
                {entry.products.map((product, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <div className="text-theme-primary">
                      {product.product_name} × {product.total_quantity}
                    </div>
                    <div className="text-theme-tertiary">
                      £{product.unit_price.toFixed(2)} each • £{product.total_value.toFixed(2)} total
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        ))}

        {entries.length === 0 && (
          <Card className="p-12 text-center">
            <div className="text-theme-tertiary">
              No sales data for {format(currentDate, 'MMMM yyyy')}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
