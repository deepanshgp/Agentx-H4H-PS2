"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { AssetPriceChart } from "@/components/asset-price-chart";
import { saveTransaction } from "@/lib/portfolio-tracker";
import { ShoppingCart, CheckCircle2 } from "lucide-react";

interface AssetBuyModalProps {
  asset: any;
  assetType: "stock" | "crypto" | "insurance";
  open: boolean;
  onClose: () => void;
  /** Optional callback — called after a successful purchase so the parent
   *  can refresh its state without a full page reload. */
  onPurchased?: () => void;
}

export default function AssetBuyModal({
  asset,
  assetType,
  open,
  onClose,
  onPurchased,
}: AssetBuyModalProps) {
  const [quantity, setQuantity] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const getTotalAmount = () => {
    if (assetType === "insurance") return asset.premium;
    if (!quantity || isNaN(Number.parseFloat(quantity))) return 0;
    return Number.parseFloat(quantity) * asset.price;
  };

  const handleBuy = () => {
    setIsLoading(true);

    const portfolioKey =
      assetType === "stock"
        ? "userStocks"
        : assetType === "crypto"
        ? "userCrypto"
        : "userInsurance";

    const existingPortfolio = JSON.parse(localStorage.getItem(portfolioKey) || "[]");

    if (assetType === "insurance") {
      existingPortfolio.push({ ...asset, purchaseDate: Date.now(), status: "Active" });
    } else {
      const quantityNum = Number.parseFloat(quantity);
      const totalAmount = getTotalAmount();
      const idx = existingPortfolio.findIndex((item: any) => item.id === asset.id);

      if (idx !== -1) {
        const existing = existingPortfolio[idx];
        const newQty = existing.quantity + quantityNum;
        const newTotal = existing.totalValue + totalAmount;
        const newAvg = newTotal / newQty;
        existingPortfolio[idx] = {
          ...existing,
          quantity: newQty,
          totalValue: newTotal,
          avgBuyPrice: newAvg,
          profit: asset.price * newQty - newTotal,
          profitPercentage: (asset.price / newAvg - 1) * 100,
        };
      } else {
        existingPortfolio.push({
          ...asset,
          quantity: quantityNum,
          avgBuyPrice: asset.price,
          totalValue: totalAmount,
          profit: 0,
          profitPercentage: 0,
        });
      }
    }

    localStorage.setItem(portfolioKey, JSON.stringify(existingPortfolio));

    saveTransaction({
      id: `tx-${Date.now()}`,
      assetId: asset.id,
      assetName: asset.name,
      assetType,
      type: "buy",
      quantity: assetType === "insurance" ? 1 : Number.parseFloat(quantity),
      price: assetType === "insurance" ? asset.premium : asset.price,
      totalValue: getTotalAmount(),
      timestamp: Date.now(),
    });

    setTimeout(() => {
      setIsLoading(false);
      toast({
        title: "Purchase successful",
        description:
          assetType === "insurance"
            ? `${asset.name} insurance policy added to your portfolio.`
            : `Bought ${quantity} ${assetType === "stock" ? "shares" : "units"} of ${asset.name}.`,
      });
      setQuantity("");
      onClose();
      // Notify parent to refresh without a full page reload
      onPurchased?.();
    }, 1200);
  };

  const totalAmount = getTotalAmount();
  const isValid =
    assetType === "insurance" ||
    (quantity !== "" && !isNaN(Number.parseFloat(quantity)) && Number.parseFloat(quantity) > 0);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-action-buy" />
            Buy {asset.name}
          </DialogTitle>
          <DialogDescription>
            {assetType === "insurance"
              ? `Annual Premium: ₹${asset.premium?.toLocaleString("en-IN")}`
              : `Current price: ₹${asset.price?.toLocaleString("en-IN")}`}
          </DialogDescription>
        </DialogHeader>

        {assetType !== "insurance" && (
          <AssetPriceChart assetId={asset.id} assetType={assetType} />
        )}

        <div className="grid gap-4 py-2">
          {assetType !== "insurance" ? (
            <div className="space-y-1.5">
              <Label htmlFor="quantity">
                Quantity{" "}
                <span className="text-muted-foreground font-normal">
                  ({assetType === "crypto" ? "units" : "shares"})
                </span>
              </Label>
              <Input
                id="quantity"
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder={assetType === "crypto" ? "0.001" : "1"}
                min="0"
                step={assetType === "crypto" ? "0.000001" : "1"}
                className="focus-visible:ring-action-buy"
              />
            </div>
          ) : (
            <div className="rounded-lg border border-border p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Coverage</span>
                <span className="font-medium">{asset.coverage}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Term</span>
                <span className="font-medium">{asset.term}</span>
              </div>
            </div>
          )}

          {/* Total amount row */}
          <div className="flex items-center justify-between rounded-lg bg-muted px-4 py-3">
            <span className="text-sm text-muted-foreground">Total amount</span>
            <span className="text-lg font-bold text-dark">
              ₹{totalAmount.toLocaleString("en-IN")}
            </span>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleBuy}
            disabled={!isValid || isLoading}
            className="bg-action-buy hover:bg-action-buy-hover text-white min-w-[110px] gap-1.5"
          >
            {isLoading ? (
              <>
                <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Processing…
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" />
                Buy Now
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
