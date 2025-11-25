import { CreditCard, Package, Sparkles, AlertCircle } from "lucide-react";

interface CostBreakdownProps {
  subscription: any;
  siteCount: number;
  purchasedAddons: any[];
  plans: any[];
}

export function CostBreakdown({ subscription, siteCount, purchasedAddons, plans }: CostBreakdownProps) {
  if (!subscription) return null;

  // Calculate Monthly Costs
  const planPrice = subscription.plan?.price_per_site_monthly || 0;
  const basePlanCost = planPrice * siteCount;
  
  const monthlyAddons = purchasedAddons.filter(addon => 
    addon.monthly_recurring_cost && Number(addon.monthly_recurring_cost) > 0
  );
  
  const monthlyAddonsCost = monthlyAddons.reduce((sum, addon) => 
    sum + Number(addon.monthly_recurring_cost), 0
  );

  const totalMonthly = basePlanCost + monthlyAddonsCost;

  // Calculate One-off Costs (Just for display if we had recent purchases, 
  // but typically this shows what *will* be charged or what *was* charged.
  // For now, let's show active recurring costs primarily, and maybe a section for "Recent One-off Charges" if we had that data,
  // but based on the prompt, we want to separate them clearly).
  
  // Actually, the prompt implies showing potential costs or current active costs. 
  // Let's focus on the Monthly Recurring total as that's the primary "Bill".
  
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6">
      <h3 className="text-xl font-bold text-white flex items-center gap-2">
        <CreditCard className="w-5 h-5 text-pink-400" />
        Monthly Cost Breakdown
      </h3>

      <div className="space-y-4">
        {/* Base Plan */}
        <div className="flex justify-between items-start pb-4 border-b border-white/5">
          <div>
            <div className="text-white font-medium flex items-center gap-2">
              <Package className="w-4 h-4 text-blue-400" />
              {subscription.plan?.display_name} Plan
            </div>
            <div className="text-sm text-white/60 mt-1">
              £{planPrice.toFixed(2)} × {siteCount} sites
            </div>
          </div>
          <div className="text-white font-bold">
            £{basePlanCost.toFixed(2)}
          </div>
        </div>

        {/* Recurring Add-ons */}
        {monthlyAddons.length > 0 && (
          <div className="pb-4 border-b border-white/5 space-y-3">
            <div className="text-xs font-semibold text-white/40 uppercase tracking-wider">
              Recurring Add-ons
            </div>
            {monthlyAddons.map((addon) => (
              <div key={addon.id} className="flex justify-between items-center">
                <div className="text-sm text-white/80 flex items-center gap-2">
                  <Sparkles className="w-3 h-3 text-purple-400" />
                  {addon.addon.display_name}
                  {addon.quantity_per_site > 1 && (
                    <span className="text-white/40 text-xs">({addon.quantity_per_site}/site)</span>
                  )}
                </div>
                <div className="text-sm text-white">
                  £{Number(addon.monthly_recurring_cost).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Total */}
        <div className="flex justify-between items-center pt-2">
          <div className="text-lg font-bold text-white">Total Monthly</div>
          <div className="text-2xl font-bold text-pink-400">
            £{totalMonthly.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Note about One-off costs */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 flex gap-3">
        <AlertCircle className="w-5 h-5 text-blue-400 shrink-0" />
        <div className="text-sm text-blue-200/80">
          <span className="text-blue-200 font-medium block mb-1">One-off Hardware Costs</span>
          Hardware purchases (Sensors, Gateways) are charged immediately upon order and are not included in your monthly subscription total.
        </div>
      </div>
    </div>
  );
}
