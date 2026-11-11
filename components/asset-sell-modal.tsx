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
import { saveTransaction } from "@/lib/portfolio-tracker"

interface AssetSellModalProps {
  asset: any
  assetType: "stock" | "crypto"
  open: boolean
  onClose: () => void
}

export default function AssetSellModal({ asset, assetType, open, onClose }: AssetSellModalProps) {
  const [quantity, setQuantity] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleSell = () => {
    setIsLoading(true)
    
    // Get existing portfolio from localStorage
    const portfolioKey = assetType === "stock" ? "userStocks" : "userCrypto";
    const existingPortfolio = JSON.parse(localStorage.getItem(portfolioKey) || "[]");
    
    // Find the asset in the portfolio
    const assetIndex = existingPortfolio.findIndex((item: any) => item.id === asset.id);
    const quantityNum = Number.parseFloat(quantity);
    const totalAmount = getTotalAmount();
    
    if (assetIndex !== -1) {
      const existingAsset = existingPortfolio[assetIndex];
      const remainingQuantity = existingAsset.quantity - quantityNum;
      
      if (remainingQuantity <= 0) {
        // Remove the asset from portfolio if all is sold
        existingPortfolio.splice(assetIndex, 1);
      } else {
        // Update the asset with remaining quantity
        const newTotalValue = (existingAsset.avgBuyPrice * remainingQuantity);
        
        existingPortfolio[assetIndex] = {
          ...existingAsset,
          quantity: remainingQuantity,
          totalValue: newTotalValue,
          // Recalculate profit based on current price
          profit: (asset.price * remainingQuantity) - newTotalValue,
          profitPercentage: ((asset.price / existingAsset.avgBuyPrice) - 1) * 100
        };
      }
      
      // Save updated portfolio back to localStorage
      localStorage.setItem(portfolioKey, JSON.stringify(existingPortfolio));
      
      // Save transaction record
      saveTransaction({
        id: `tx-${Date.now()}`,
        assetId: asset.id,
        assetName: asset.name,
        assetType: assetType,
        type: "sell",
        quantity: quantityNum,
        price: asset.price,
        totalValue: totalAmount,
        timestamp: Date.now()
      });
    }

    // Simulate API call
    setTimeout(() => {
      setIsLoading(false)
      toast({
        title: "Sale Successful",
        description: `You have successfully sold ${quantity} ${assetType === "stock" ? "shares" : "units"} of ${asset.name}.`,
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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Sell {asset.name}</DialogTitle>
          <DialogDescription>
            Enter the number of {assetType === "stock" ? "shares" : "units"} you want to sell.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <div className="col-span-3">
              <p>{asset.name}</p>
              <p className="text-sm text-muted-foreground">{asset.ticker}</p>
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="holdings" className="text-right">
              Your Holdings
            </Label>
            <div className="col-span-3">
              <p>
                {asset.quantity} {assetType === "stock" ? "shares" : "units"}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="price" className="text-right">
              Current Price
            </Label>
            <div className="col-span-3">
              <p>₹{asset.price.toLocaleString("en-IN")}</p>
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="quantity" className="text-right">
              Quantity
            </Label>
            <div className="col-span-3">
              <Input
                id="quantity"
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder={assetType === "stock" ? "Number of shares" : "Amount of crypto"}
                min="0"
                max={asset.quantity.toString()}
                step={assetType === "stock" ? "1" : "0.01"}
              />
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="total" className="text-right">
              Total Amount
            </Label>
            <div className="col-span-3">
              <p className="font-bold">₹{getTotalAmount().toLocaleString("en-IN")}</p>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSell}
            className="bg-action-sell-light text-action-sell hover:bg-action-sell hover:text-white transition-colors"
            disabled={!quantity || isNaN(Number.parseFloat(quantity)) || Number.parseFloat(quantity) <= 0 || isLoading}
          >
            {isLoading ? "Processing..." : "Sell Now"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
