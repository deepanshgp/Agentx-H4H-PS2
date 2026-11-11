"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getUserNFTs, NFT, getWeb3Status } from "@/lib/web3-integration";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

export function NFTPortfolio() {
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalValue, setTotalValue] = useState(0);

  useEffect(() => {
    const fetchNFTs = async () => {
      setIsLoading(true);
      const userNFTs = await getUserNFTs();
      setNfts(userNFTs);
      
      // Calculate total value
      const total = userNFTs.reduce((sum, nft) => sum + (nft.estimatedValue || 0), 0);
      setTotalValue(total);
      
      setIsLoading(false);
    };

    fetchNFTs();

    // Set up event listener for wallet connection changes
    const handleStorageChange = () => {
      const status = getWeb3Status();
      if (status.isConnected) {
        fetchNFTs();
      } else {
        setNfts([]);
        setTotalValue(0);
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  // Group NFTs by collection
  const nftsByCollection = nfts.reduce((groups, nft) => {
    const collection = nft.collection;
    if (!groups[collection]) {
      groups[collection] = [];
    }
    groups[collection].push(nft);
    return groups;
  }, {} as Record<string, NFT[]>);

  return (
    <Card>
      <CardHeader>
        <CardTitle>NFT Portfolio</CardTitle>
        <CardDescription>
          Your digital collectibles and their estimated value
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-[125px] w-full rounded-lg" />
            <div className="grid grid-cols-3 gap-4">
              <Skeleton className="h-[125px] w-full rounded-lg" />
              <Skeleton className="h-[125px] w-full rounded-lg" />
              <Skeleton className="h-[125px] w-full rounded-lg" />
            </div>
          </div>
        ) : nfts.length === 0 ? (
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
            <h3 className="mt-4 text-lg font-semibold">No NFTs Found</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Connect your wallet to view your NFT collection
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium">Total Estimated Value</p>
                <p className="text-2xl font-bold">${totalValue.toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">Total NFTs</p>
                <p className="text-2xl font-bold">{nfts.length}</p>
              </div>
            </div>

            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="all">All NFTs</TabsTrigger>
                <TabsTrigger value="collections">Collections</TabsTrigger>
                <TabsTrigger value="value">By Value</TabsTrigger>
              </TabsList>
              
              <TabsContent value="all" className="mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {nfts.map((nft) => (
                    <NFTCard key={nft.id} nft={nft} />
                  ))}
                </div>
              </TabsContent>
              
              <TabsContent value="collections" className="mt-4">
                <div className="space-y-4">
                  {Object.entries(nftsByCollection).map(([collection, collectionNfts]) => (
                    <div key={collection} className="space-y-2">
                      <h3 className="font-semibold">{collection} ({collectionNfts.length})</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {collectionNfts.map((nft) => (
                          <NFTCard key={nft.id} nft={nft} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
              
              <TabsContent value="value" className="mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[...nfts]
                    .sort((a, b) => (b.estimatedValue || 0) - (a.estimatedValue || 0))
                    .map((nft) => (
                      <NFTCard key={nft.id} nft={nft} />
                    ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function NFTCard({ nft }: { nft: NFT }) {
  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
      <div className="relative aspect-square">
        <img
          src={nft.image}
          alt={nft.name}
          className="object-cover w-full h-full"
        />
      </div>
      <div className="p-3">
        <h3 className="font-semibold truncate">{nft.name}</h3>
        <p className="text-sm text-muted-foreground truncate">{nft.collection}</p>
        <div className="flex justify-between items-center mt-2">
          <span className="text-sm">Last: {nft.lastPrice ? `${nft.lastPrice} ETH` : 'N/A'}</span>
          <span className="font-medium">{nft.estimatedValue ? `${nft.estimatedValue} ETH` : 'N/A'}</span>
        </div>
      </div>
    </div>
  );
}
