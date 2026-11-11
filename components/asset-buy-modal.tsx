"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { AssetPriceChart } from "@/components/asset-price-chart"
import { saveTransaction } from "@/lib/portfolio-tracker"

interface AssetBuyModalProps {
  asset: any
  assetType: "stock" | "crypto"
  open: boolean
  onClose: () => void
}

export default function AssetBuyModal({ asset, assetType, open, onClose }: AssetBuyModalProps) {
  const [quantity, setQuantity] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleBuy = () => {
    setIsLoading(true)

    // Get existing portfolio from localStorage or initialize empty array
    const portfolioKey = assetType === "stock" ? "userStocks" : "userCrypto";
    const existingPortfolio = JSON.parse(localStorage.getItem(portfolioKey) || "[]");

    // Check if asset already exists in portfolio
    const assetIndex = existingPortfolio.findIndex((item: any) => item.id === asset.id);
    const quantityNum = Number.parseFloat(quantity);
    const totalAmount = getTotalAmount();

    if (assetIndex !== -1) {
      const existingAsset = existingPortfolio[assetIndex];
      const newQuantity = existingAsset.quantity + quantityNum;
      const newTotalValue = existingAsset.totalValue + totalAmount;
      const newAvgBuyPrice = newTotalValue / newQuantity;

      existingPortfolio[assetIndex] = {
        ...existingAsset,
        quantity: newQuantity,
        totalValue: newTotalValue,
        avgBuyPrice: newAvgBuyPrice,
        profit: (asset.price * newQuantity) - newTotalValue,
        profitPercentage: ((asset.price / newAvgBuyPrice) - 1) * 100
      };
    } else {
      existingPortfolio.push({
        ...asset,
        quantity: quantityNum,
        avgBuyPrice: asset.price,
        totalValue: totalAmount,
        profit: 0,
        profitPercentage: 0
      });
    }

    // Save updated portfolio back to localStorage
    localStorage.setItem(portfolioKey, JSON.stringify(existingPortfolio));

    // Save transaction record
    saveTransaction({
      id: `tx-${Date.now()}`,
      assetId: asset.id,
      assetName: asset.name,
      assetType: assetType,
      type: "buy",
      quantity: Number.parseFloat(quantity),
      price: asset.price,
      totalValue: getTotalAmount(),
      timestamp: Date.now()
    });

    // Simulate API call
    setTimeout(() => {
      setIsLoading(false)
      toast({
        title: "Purchase Successful",
        description: `You have successfully purchased ${quantity} ${assetType === "stock" ? "shares" : "units"} of ${asset.name}.`,
      })
      onClose()

      // Force refresh the page to show updated portfolio
      window.location.reload();
    }, 1500)
  }

  const getTotalAmount = () => {
    if (!quantity || isNaN(Number.parseFloat(quantity))) return 0
    return Number.parseFloat(quantity) * asset.price
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Buy {asset.name}</DialogTitle>
          <DialogDescription>
            <>Enter the quantity you want to buy. Current price: ₹{asset.price.toLocaleString("en-IN")}</>
          </DialogDescription>
        </DialogHeader>

        <AssetPriceChart assetId={asset.id} assetType={assetType} />

        <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="quantity" className="text-right">
                Quantity
              </Label>
              <Input
                id="quantity"
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="col-span-3"
                min="0"
                step={assetType === "crypto" ? "0.000001" : "1"}
              />
            </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Total Amount</Label>
            <div className="col-span-3">
              ₹{getTotalAmount().toLocaleString("en-IN")}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleBuy}
            className="ml-2 bg-action-buy-light text-action-buy hover:bg-action-buy hover:text-white transition-colors"
            disabled={!quantity || isNaN(Number.parseFloat(quantity)) || Number.parseFloat(quantity) <= 0 || isLoading}
          >
            {isLoading ? "Processing..." : "Buy Now"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
