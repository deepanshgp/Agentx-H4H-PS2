"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { connectToMetaMask, connectToWalletConnect, disconnectWallet, getWeb3Status, Web3ConnectionStatus } from "@/lib/web3-integration";
import { Wallet, LogOut } from "lucide-react";

export function WalletConnection() {
  const [web3Status, setWeb3Status] = useState<Web3ConnectionStatus>({
    isConnected: false,
    address: null,
    chainId: null,
    provider: null,
    signer: null,
    balance: null,
    networkName: null,
  });
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    // Get initial connection status
    const status = getWeb3Status();
    setWeb3Status(status);

    // Set up event listener for localStorage changes
    const handleStorageChange = () => {
      const updatedStatus = getWeb3Status();
      setWeb3Status(updatedStatus);
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  const handleMetaMaskConnect = async () => {
    const status = await connectToMetaMask();
    setWeb3Status(status);
    setIsModalOpen(false);
  };

  const handleWalletConnectConnect = async () => {
    const status = await connectToWalletConnect();
    setWeb3Status(status);
    setIsModalOpen(false);
  };

  const handleDisconnect = () => {
    disconnectWallet();
    setWeb3Status(getWeb3Status());
  };

  // Format address for display
  const formatAddress = (address: string) => {
    if (!address) return "";
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  return (
    <div className="flex items-center">
      {web3Status.isConnected ? (
        <div className="flex items-center gap-2">
          <div className="bg-green-500 rounded-full w-2 h-2"></div>
          <span className="text-sm font-medium mr-2">
            {formatAddress(web3Status.address || "")}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDisconnect}
            className="flex items-center gap-1"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Disconnect</span>
          </Button>
        </div>
      ) : (
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="flex items-center gap-1">
              <Wallet className="h-4 w-4" />
              <span>Connect Wallet</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Connect your wallet</DialogTitle>
              <DialogDescription>
                Connect your wallet to access Web3 features like token swapping, NFT portfolio, and DeFi yield farming.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <Button
                variant="outline"
                className="flex flex-col items-center justify-center h-24 p-4"
                onClick={handleMetaMaskConnect}
              >
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg"
                  alt="MetaMask"
                  className="h-8 w-8 mb-2"
                />
                <span>MetaMask</span>
              </Button>
              <Button
                variant="outline"
                className="flex flex-col items-center justify-center h-24 p-4"
                onClick={handleWalletConnectConnect}
              >
                <img
                  src="https://1000logos.net/wp-content/uploads/2022/05/WalletConnect-Logo.jpg"
                  alt="WalletConnect"
                  className="h-8 w-8 mb-2"
                />
                <span>WalletConnect</span>
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
