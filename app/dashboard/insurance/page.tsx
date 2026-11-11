"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Shield } from "lucide-react"
import { insuranceData } from "@/lib/data"
import AssetBuyModal from "@/components/asset-buy-modal"
import { useToast } from "@/hooks/use-toast"
import { saveTransaction } from "@/lib/portfolio-tracker"

const InsurancePage = () => {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedAsset, setSelectedAsset] = useState<any>(null)
  const [showBuyModal, setShowBuyModal] = useState(false)
  const [userInsurance, setUserInsurance] = useState<any[]>([])
  const { toast } = useToast()

  useEffect(() => {
    const savedInsurance = localStorage.getItem("userInsurance")
    if (savedInsurance) {
      setUserInsurance(JSON.parse(savedInsurance))
    }
  }, [])

  const filteredMarketInsurance = insuranceData.filter(
    (insurance) =>
      insurance.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      insurance.type.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const filteredUserInsurance = userInsurance.filter(
    (insurance) =>
      insurance.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      insurance.type.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleBuy = (asset: any) => {
    setSelectedAsset(asset)
    setShowBuyModal(true)
  }

  const handleCancelPolicy = (insurance: any) => {
    const savedInsurance = localStorage.getItem("userInsurance")
    if (savedInsurance) {
      const insuranceList = JSON.parse(savedInsurance)
      const updatedList = insuranceList.filter((policy: any) => policy.id !== insurance.id)
      localStorage.setItem("userInsurance", JSON.stringify(updatedList))
      
      saveTransaction({
        id: `tx-${Date.now()}`,
        assetId: insurance.id,
        assetName: insurance.name,
        assetType: "insurance",
        type: "cancel",
        quantity: 1,
        price: insurance.premium,
        totalValue: insurance.premium,
        timestamp: Date.now()
      })

      setUserInsurance(updatedList)
      
      toast({
        title: "Policy Cancelled",
        description: `Your ${insurance.name} policy has been cancelled.`,
        variant: "destructive"
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Insurance</h2>
          <p className="text-muted-foreground">Manage your insurance policies</p>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search insurance..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Tabs defaultValue="market" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 bg-gray-100 p-1 rounded-lg">
          <TabsTrigger 
            value="market" 
            className="rounded-md data-[state=active]:bg-purple-500 data-[state=active]:text-white transition-colors"
          >
            Market
          </TabsTrigger>
          <TabsTrigger 
            value="portfolio" 
            className="rounded-md data-[state=active]:bg-green-500 data-[state=active]:text-white transition-colors"
          >
            Portfolio
          </TabsTrigger>
        </TabsList>
        <TabsContent value="market" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Insurance Market</CardTitle>
              <CardDescription>Browse and buy insurance policies</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <div className="grid grid-cols-7 p-4 text-sm font-medium text-gray-500">
                  <div className="col-span-2">Name</div>
                  <div className="col-span-1">Type</div>
                  <div className="col-span-1">Premium</div>
                  <div className="col-span-1">Coverage</div>
                  <div className="col-span-1">Term</div>
                  <div className="col-span-1 text-right">Action</div>
                </div>
                <div className="divide-y">
                  {filteredMarketInsurance.map((insurance) => (
                    <div key={insurance.id} className="grid grid-cols-7 p-4 text-sm">
                      <div className="col-span-2">
                        <div className="font-medium">{insurance.name}</div>
                        <div className="text-xs text-gray-500">{insurance.provider}</div>
                      </div>
                      <div className="col-span-1 flex items-center">
                        <div className="flex items-center text-indigo-600">
                          <Shield className="mr-1 h-4 w-4" />
                          {insurance.type}
                        </div>
                      </div>
                      <div className="col-span-1 flex items-center font-medium">
                        ₹{insurance.premium.toLocaleString("en-IN")}
                      </div>
                      <div className="col-span-1 flex items-center text-gray-500">{insurance.coverage}</div>
                      <div className="col-span-1 flex items-center text-gray-500">{insurance.term}</div>
                      <div className="col-span-1 flex items-center justify-end">
                        <Button 
                          size="sm" 
                          onClick={() => handleBuy(insurance)}
                          className="bg-green-500 text-white hover:bg-green-600"
                        >
                          Buy
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="portfolio" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Your Insurance Portfolio</CardTitle>
              <CardDescription>View and manage your insurance policies</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <div className="grid grid-cols-7 p-4 text-sm font-medium text-gray-500">
                  <div className="col-span-2">Name</div>
                  <div className="col-span-1">Type</div>
                  <div className="col-span-1">Premium</div>
                  <div className="col-span-1">Coverage</div>
                  <div className="col-span-1">Term</div>
                  <div className="col-span-1 text-right">Status</div>
                </div>
                <div className="divide-y">
                  {filteredUserInsurance.length === 0 ? (
                    <div className="p-4 text-center text-sm text-gray-500">
                      No insurance policies found in your portfolio
                    </div>
                  ) : (
                    filteredUserInsurance.map((insurance) => (
                      <div key={insurance.id} className="grid grid-cols-7 p-4 text-sm">
                        <div className="col-span-2">
                          <div className="font-medium">{insurance.name}</div>
                          <div className="text-xs text-gray-500">{insurance.provider}</div>
                        </div>
                        <div className="col-span-1 flex items-center">
                          <div className="flex items-center text-indigo-600">
                            <Shield className="mr-1 h-4 w-4" />
                            {insurance.type}
                          </div>
                        </div>
                        <div className="col-span-1 flex items-center font-medium">
                          ₹{insurance.premium.toLocaleString("en-IN")}
                        </div>
                        <div className="col-span-1 flex items-center text-gray-500">
                          {insurance.coverage}
                        </div>
                        <div className="col-span-1 flex items-center text-gray-500">
                          {insurance.term}
                        </div>
                        <div className="col-span-1 flex items-center justify-end space-x-2">
                          <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                            Active
                          </span>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            className="ml-2 bg-red-50 text-red-600 hover:bg-red-100"
                            onClick={() => handleCancelPolicy(insurance)}
                          >
                            Cancel Policy
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {showBuyModal && (
        <AssetBuyModal
          asset={selectedAsset}
          assetType="insurance"
          open={showBuyModal}
          onClose={() => {
            setShowBuyModal(false)
            setSelectedAsset(null)
          }}
        />
      )}
    </div>
  )
}

export default InsurancePage
