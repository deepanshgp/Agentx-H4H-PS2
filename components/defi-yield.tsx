"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getUserDeFiPositions, DeFiPosition, getWeb3Status } from "@/lib/web3-integration";
import { Skeleton } from "@/components/ui/skeleton";

export function DeFiYield() {
  const [positions, setPositions] = useState<DeFiPosition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalValue, setTotalValue] = useState(0);
  const [avgApy, setAvgApy] = useState(0);

  useEffect(() => {
    const fetchPositions = async () => {
      setIsLoading(true);
      const userPositions = await getUserDeFiPositions();
      setPositions(userPositions);
      
      // Calculate total value and weighted average APY
      const total = userPositions.reduce((sum, position) => sum + position.value, 0);
      setTotalValue(total);
      
      if (total > 0) {
        const weightedApy = userPositions.reduce(
          (sum, position) => sum + (position.apy * position.value) / total,
          0
        );
        setAvgApy(parseFloat(weightedApy.toFixed(2)));
      } else {
        setAvgApy(0);
      }
      
      setIsLoading(false);
    };

    fetchPositions();

    // Set up event listener for wallet connection changes
    const handleStorageChange = () => {
      const status = getWeb3Status();
      if (status.isConnected) {
        fetchPositions();
      } else {
        setPositions([]);
        setTotalValue(0);
        setAvgApy(0);
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  // Group positions by type
  const positionsByType = positions.reduce((groups, position) => {
    const type = position.type;
    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push(position);
    return groups;
  }, {} as Record<string, DeFiPosition[]>);

  // Calculate annual yield
  const calculateAnnualYield = (value: number, apy: number) => {
    return (value * apy) / 100;
  };

  // Get badge color based on position type
  const getBadgeVariant = (type: string) => {
    switch (type) {
      case "staking":
        return "default";
      case "lending":
        return "secondary";
      case "liquidity":
        return "outline";
      case "farming":
        return "destructive";
      default:
        return "default";
    }
  };

  const { isConnected } = getWeb3Status();

  return (
    <Card>
      <CardHeader>
        <CardTitle>DeFi Yield Farming</CardTitle>
        <CardDescription>
          Your active DeFi positions and potential earnings
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-[60px] w-full rounded-lg" />
            <Skeleton className="h-[200px] w-full rounded-lg" />
          </div>
        ) : !isConnected ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="rounded-full bg-muted p-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-6 w-6"
              >
                <rect width="20" height="14" x="2" y="5" rx="2" />
                <line x1="2" x2="22" y1="10" y2="10" />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-semibold">Wallet Not Connected</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Connect your wallet to view your DeFi positions
            </p>
          </div>
        ) : positions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="rounded-full bg-muted p-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-6 w-6"
              >
                <path d="M12 2v4" />
                <path d="M12 18v4" />
                <path d="m4.93 4.93 2.83 2.83" />
                <path d="m16.24 16.24 2.83 2.83" />
                <path d="M2 12h4" />
                <path d="M18 12h4" />
                <path d="m4.93 19.07 2.83-2.83" />
                <path d="m16.24 7.76 2.83-2.83" />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-semibold">No DeFi Positions</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              You don't have any active DeFi positions
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg">
                <p className="text-sm font-medium">Total Value Locked</p>
                <p className="text-2xl font-bold">${totalValue.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">
                  Across {positions.length} positions
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <p className="text-sm font-medium">Average APY</p>
                <p className="text-2xl font-bold">{avgApy}%</p>
                <p className="text-sm text-muted-foreground">
                  Est. annual yield: ${calculateAnnualYield(totalValue, avgApy).toLocaleString()}
                </p>
              </div>
            </div>

            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="staking">Staking</TabsTrigger>
                <TabsTrigger value="lending">Lending</TabsTrigger>
                <TabsTrigger value="liquidity">Liquidity</TabsTrigger>
                <TabsTrigger value="farming">Farming</TabsTrigger>
              </TabsList>
              
              <TabsContent value="all" className="mt-4 space-y-4">
                {positions.map((position) => (
                  <PositionCard key={position.id} position={position} />
                ))}
              </TabsContent>
              
              {["staking", "lending", "liquidity", "farming"].map((type) => (
                <TabsContent key={type} value={type} className="mt-4 space-y-4">
                  {positionsByType[type]?.map((position) => (
                    <PositionCard key={position.id} position={position} />
                  )) || (
                    <div className="text-center py-4 text-muted-foreground">
                      No {type} positions found
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PositionCard({ position }: { position: DeFiPosition }) {
  // Calculate daily and monthly yields
  const annualYield = (position.value * position.apy) / 100;
  const monthlyYield = annualYield / 12;
  const dailyYield = annualYield / 365;

  // Get badge variant based on position type
  const getBadgeVariant = (type: string) => {
    switch (type) {
      case "staking":
        return "default";
      case "lending":
        return "secondary";
      case "liquidity":
        return "outline";
      case "farming":
        return "destructive";
      default:
        return "default";
    }
  };

  return (
    <div className="p-4 border rounded-lg">
      <div className="flex justify-between items-start mb-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">{position.protocol}</h3>
            <Badge variant={getBadgeVariant(position.type) as any}>
              {position.type.charAt(0).toUpperCase() + position.type.slice(1)}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{position.asset}</p>
        </div>
        <div className="text-right">
          <p className="font-medium">${position.value.toLocaleString()}</p>
          <p className="text-sm text-green-600">{position.apy}% APY</p>
        </div>
      </div>
      
      <div className="space-y-2 mt-4">
        <div className="flex justify-between text-sm">
          <span>Balance</span>
          <span>{position.balance} {position.asset.split('-')[0]}</span>
        </div>
        
        {position.rewards && (
          <div className="flex justify-between text-sm">
            <span>Rewards</span>
            <span>{position.rewards} {position.rewardToken}</span>
          </div>
        )}
        
        <div className="pt-2">
          <div className="flex justify-between text-sm mb-1">
            <span>Earnings</span>
            <span>${annualYield.toFixed(2)}/year</span>
          </div>
          <Progress value={100} className="h-1" />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>${dailyYield.toFixed(2)}/day</span>
            <span>${monthlyYield.toFixed(2)}/month</span>
          </div>
        </div>
      </div>
    </div>
  );
}
