"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { CreditCard, Wallet } from "lucide-react"

interface INRBalanceModalProps {
  open: boolean
  onClose: () => void
  onSuccess: (amount: number, type: 'deposit' | 'withdraw') => void
  type: 'deposit' | 'withdraw'
}

export default function INRBalanceModal({
  open,
  onClose,
  onSuccess,
  type
}: INRBalanceModalProps) {
  const [amount, setAmount] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("upi")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) return

    setIsLoading(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500))
      onSuccess(Number(amount), type)
      onClose()
    } catch (error) {
      console.error("Transaction failed:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {type === 'deposit' ? 'Deposit INR' : 'Withdraw INR'}
          </DialogTitle>
          <DialogDescription>
            {type === 'deposit' 
              ? 'Add funds to your INR balance to invest in stocks'
              : 'Withdraw funds from your INR balance to your bank account'
            }
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="amount">Amount (₹)</Label>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              className="col-span-3"
            />
          </div>
          {type === 'deposit' && (
            <div className="grid gap-2">
              <Label>Payment Method</Label>
              <RadioGroup
                defaultValue="upi"
                value={paymentMethod}
                onValueChange={setPaymentMethod}
                className="grid grid-cols-2 gap-4"
              >
                <div>
                  <RadioGroupItem
                    value="upi"
                    id="upi"
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor="upi"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-transparent p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                  >
                    <Wallet className="mb-2 h-6 w-6" />
                    UPI
                  </Label>
                </div>
                <div>
                  <RadioGroupItem
                    value="card"
                    id="card"
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor="card"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-transparent p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                  >
                    <CreditCard className="mb-2 h-6 w-6" />
                    Card
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!amount || isNaN(Number(amount)) || Number(amount) <= 0 || isLoading}
            className={type === 'deposit' 
              ? "bg-action-buy-light text-action-buy hover:bg-action-buy hover:text-white transition-colors"
              : "bg-action-sell-light text-action-sell hover:bg-action-sell hover:text-white transition-colors"
            }
          >
            {isLoading ? "Processing..." : type === 'deposit' ? "Deposit" : "Withdraw"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
