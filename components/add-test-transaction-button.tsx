import { Button } from "@/components/ui/button"
import { addTestTransaction } from "@/lib/add-test-transaction"
import { useState } from "react"
import { toast } from "@/components/ui/use-toast"

export default function AddTestTransactionButton() {
  const [isLoading, setIsLoading] = useState(false)

  const handleAddTransaction = () => {
    setIsLoading(true)
    try {
      const transaction = addTestTransaction()
      toast({
        title: "Transaction added",
        description: `Added ${transaction.type} transaction for ${transaction.quantity} ${transaction.assetName}`,
      })
      // Force refresh the page to show the new transaction
      window.location.reload()
    } catch (error) {
      console.error("Error adding test transaction:", error)
      toast({
        title: "Error",
        description: "Failed to add test transaction",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button 
      onClick={handleAddTransaction} 
      disabled={isLoading}
      variant="outline"
      size="sm"
      className="ml-2"
    >
      {isLoading ? "Adding..." : "Add Test Transaction"}
    </Button>
  )
}
