"use client"

import { useState } from "react"
import { CheckCircle2, ShoppingCart } from "lucide-react"
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
  onPurchased?: () => void
}

export default function AssetBuyModal({
  asset,
  assetType,
  open,
  onClose,
  onPurchased,
}: AssetBuyModalProps) {
  const [quantity, setQuantity] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const getTotalAmount = () => {
    if (!quantity || Number.isNaN(Number.parseFloat(quantity))) return 0
    return Number.parseFloat(quantity) * asset.price
  }

  const isValid =
    quantity !== "" &&
    !Number.isNaN(Number.parseFloat(quantity)) &&
    Number.parseFloat(quantity) > 0

  const handleBuy = () => {
    if (!isValid) return
    setIsLoading(true)

    const portfolioKey = assetType === "stock" ? "userStocks" : "userCrypto"
    const existingPortfolio = JSON.parse(localStorage.getItem(portfolioKey) || "[]")
    const quantityNum = Number.parseFloat(quantity)
    const totalAmount = getTotalAmount()
    const assetIndex = existingPortfolio.findIndex((item: any) => item.id === asset.id)

    if (assetIndex !== -1) {
      const existingAsset = existingPortfolio[assetIndex]
      const newQuantity = existingAsset.quantity + quantityNum
      const newTotalValue = existingAsset.totalValue + totalAmount
      const newAvgBuyPrice = newTotalValue / newQuantity

      existingPortfolio[assetIndex] = {
        ...existingAsset,
        quantity: newQuantity,
        totalValue: newTotalValue,
        avgBuyPrice: newAvgBuyPrice,
        profit: asset.price * newQuantity - newTotalValue,
        profitPercentage: (asset.price / newAvgBuyPrice - 1) * 100,
      }
    } else {
      existingPortfolio.push({
        ...asset,
        quantity: quantityNum,
        avgBuyPrice: asset.price,
        totalValue: totalAmount,
        profit: 0,
        profitPercentage: 0,
      })
    }

    localStorage.setItem(portfolioKey, JSON.stringify(existingPortfolio))

    saveTransaction({
      id: `tx-${Date.now()}`,
      assetId: asset.id,
      assetName: asset.name,
      assetType,
      type: "buy",
      quantity: quantityNum,
      price: asset.price,
      totalValue: totalAmount,
      timestamp: Date.now(),
    })

    setTimeout(() => {
      setIsLoading(false)
      toast({
        title: "Purchase successful",
        description: `Bought ${quantity} ${assetType === "stock" ? "shares" : "units"} of ${asset.name}.`,
      })
      setQuantity("")
      onClose()
      onPurchased?.()
    }, 1200)
  }

  const totalAmount = getTotalAmount()

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-action-buy" />
            Buy {asset.name}
          </DialogTitle>
          <DialogDescription>
            Current price: ₹{asset.price.toLocaleString("en-IN")}
          </DialogDescription>
        </DialogHeader>

        <AssetPriceChart assetId={asset.id} assetType={assetType} />

        <div className="grid gap-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="quantity">
              Quantity{" "}
              <span className="font-normal text-muted-foreground">
                ({assetType === "crypto" ? "units" : "shares"})
              </span>
            </Label>
            <Input
              id="quantity"
              type="number"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              placeholder={assetType === "crypto" ? "0.001" : "1"}
              min="0"
              step={assetType === "crypto" ? "0.000001" : "1"}
              className="focus-visible:ring-action-buy"
            />
          </div>

          <div className="flex items-center justify-between rounded-lg bg-muted px-4 py-3">
            <span className="text-sm text-muted-foreground">Total amount</span>
            <span className="text-lg font-bold text-dark">
              ₹{totalAmount.toLocaleString("en-IN")}
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleBuy}
            disabled={!isValid || isLoading}
            className="min-w-[110px] gap-1.5 bg-action-buy text-white hover:bg-action-buy-hover"
          >
            {isLoading ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
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
  )
}
