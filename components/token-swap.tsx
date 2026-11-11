"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowDownIcon, RefreshCwIcon, AlertCircleIcon } from "lucide-react";
import { getUserTokens, Token, swapTokens, getWeb3Status } from "@/lib/web3-integration";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";

export function TokenSwap() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fromToken, setFromToken] = useState("");
  const [toToken, setToToken] = useState("");
  const [amount, setAmount] = useState("");
  const [estimatedOutput, setEstimatedOutput] = useState("");
  const [isSwapping, setIsSwapping] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    const fetchTokens = async () => {
      setIsLoading(true);
      const userTokens = await getUserTokens();
      setTokens(userTokens);
      
      // Set default tokens if available
      if (userTokens.length >= 2) {
        setFromToken(userTokens[0].symbol);
        setToToken(userTokens[1].symbol);
      }
      
      setIsLoading(false);
    };

    fetchTokens();

    // Set up event listener for wallet connection changes
    const handleStorageChange = () => {
      const status = getWeb3Status();
      if (status.isConnected) {
        fetchTokens();
      } else {
        setTokens([]);
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  // Calculate estimated output when inputs change
  useEffect(() => {
    if (fromToken && toToken && amount && !isNaN(parseFloat(amount))) {
      // In a real implementation, you would:
      // 1. Call a DEX API to get a quote
      // 2. Display the estimated output with slippage

      // For now, we'll use a simple mock calculation
      const fromTokenData = tokens.find(t => t.symbol === fromToken);
      const toTokenData = tokens.find(t => t.symbol === toToken);
      
      if (fromTokenData && toTokenData && fromTokenData.price && toTokenData.price) {
        const inputValue = parseFloat(amount) * fromTokenData.price;
        const estimatedAmount = (inputValue / toTokenData.price).toFixed(6);
        setEstimatedOutput(estimatedAmount);
      }
    } else {
      setEstimatedOutput("");
    }
  }, [fromToken, toToken, amount, tokens]);

  const handleSwap = async () => {
    try {
      setError("");
      setIsSwapping(true);
      
      // Validate inputs
      if (!fromToken || !toToken) {
        throw new Error("Please select tokens");
      }
      
      if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        throw new Error("Please enter a valid amount");
      }
      
      // Check if user has enough balance
      const fromTokenData = tokens.find(t => t.symbol === fromToken);
      if (fromTokenData && parseFloat(fromTokenData.balance) < parseFloat(amount)) {
        throw new Error(`Insufficient ${fromToken} balance`);
      }
      
      // Execute swap
      const result = await swapTokens(fromToken, toToken, amount);
      
      if (!result.success) {
        throw new Error(result.error || "Swap failed");
      }
      
      // Show success message
      toast({
        title: "Swap Successful",
        description: `Swapped ${amount} ${fromToken} to approximately ${estimatedOutput} ${toToken}`,
        duration: 5000,
      });
      
      // Reset form
      setAmount("");
      setEstimatedOutput("");
      
      // Refresh token balances
      const userTokens = await getUserTokens();
      setTokens(userTokens);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setIsSwapping(false);
    }
  };

  const handleSwitchTokens = () => {
    const temp = fromToken;
    setFromToken(toToken);
    setToToken(temp);
    setAmount("");
    setEstimatedOutput("");
  };

  const getMaxAmount = () => {
    const fromTokenData = tokens.find(t => t.symbol === fromToken);
    if (fromTokenData) {
      setAmount(fromTokenData.balance);
    }
  };

  const { isConnected } = getWeb3Status();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Swap Tokens</CardTitle>
        <CardDescription>
          Exchange tokens directly from your wallet
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-[60px] w-full rounded-lg" />
            <Skeleton className="h-[60px] w-full rounded-lg" />
            <Skeleton className="h-[40px] w-full rounded-lg" />
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
              Connect your wallet to swap tokens
            </p>
          </div>
        ) : tokens.length < 2 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="rounded-full bg-muted p-3">
              <RefreshCwIcon className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">Insufficient Tokens</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              You need at least two different tokens to perform a swap
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircleIcon className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="from-token">From</Label>
                <button
                  onClick={getMaxAmount}
                  className="text-xs text-blue-500 hover:text-blue-700"
                >
                  Max
                </button>
              </div>
              <div className="flex space-x-2">
                <Select value={fromToken} onValueChange={setFromToken}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select token" />
                  </SelectTrigger>
                  <SelectContent>
                    {tokens.map((token) => (
                      <SelectItem key={token.symbol} value={token.symbol}>
                        <div className="flex items-center">
                          {token.logoURI && (
                            <img
                              src={token.logoURI}
                              alt={token.name}
                              className="w-5 h-5 mr-2 rounded-full"
                            />
                          )}
                          {token.symbol}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  id="from-token"
                  type="number"
                  placeholder="0.0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div className="text-sm text-muted-foreground">
                Balance: {tokens.find(t => t.symbol === fromToken)?.balance || "0"} {fromToken}
              </div>
            </div>
            
            <div className="flex justify-center">
              <Button
                variant="outline"
                size="icon"
                className="rounded-full"
                onClick={handleSwitchTokens}
              >
                <ArrowDownIcon className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="to-token">To (estimated)</Label>
              <div className="flex space-x-2">
                <Select value={toToken} onValueChange={setToToken}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select token" />
                  </SelectTrigger>
                  <SelectContent>
                    {tokens.map((token) => (
                      <SelectItem key={token.symbol} value={token.symbol}>
                        <div className="flex items-center">
                          {token.logoURI && (
                            <img
                              src={token.logoURI}
                              alt={token.name}
                              className="w-5 h-5 mr-2 rounded-full"
                            />
                          )}
                          {token.symbol}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  id="to-token"
                  type="text"
                  placeholder="0.0"
                  value={estimatedOutput}
                  readOnly
                />
              </div>
              <div className="text-sm text-muted-foreground">
                Balance: {tokens.find(t => t.symbol === toToken)?.balance || "0"} {toToken}
              </div>
            </div>
            
            <Button
              className="w-full"
              onClick={handleSwap}
              disabled={isSwapping || !fromToken || !toToken || !amount || fromToken === toToken}
            >
              {isSwapping ? (
                <>
                  <RefreshCwIcon className="mr-2 h-4 w-4 animate-spin" />
                  Swapping...
                </>
              ) : (
                "Swap"
              )}
            </Button>
            
            <div className="text-xs text-muted-foreground">
              Note: Swaps are subject to network fees and price impact. The actual received amount may vary.
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
