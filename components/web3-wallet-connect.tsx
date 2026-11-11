"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Wallet, AlertCircle, ExternalLink } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'

export default function Web3WalletConnect() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [balance, setBalance] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isMetaMaskInstalled, setIsMetaMaskInstalled] = useState(false)

  useEffect(() => {
    // Check if MetaMask is installed
    const checkMetaMaskInstalled = () => {
      if (typeof window !== 'undefined' && typeof window.ethereum !== 'undefined') {
        setIsMetaMaskInstalled(true)
        
        // Check if already connected
        if (window.ethereum.selectedAddress) {
          setWalletAddress(window.ethereum.selectedAddress)
          fetchBalance(window.ethereum.selectedAddress)
        }
      } else {
        setIsMetaMaskInstalled(false)
      }
    }
    
    checkMetaMaskInstalled()
  }, [])

  const connectWallet = async () => {
    setIsConnecting(true)
    setError(null)
    
    try {
      if (typeof window !== 'undefined' && typeof window.ethereum !== 'undefined') {
        // Request account access
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
        setWalletAddress(accounts[0])
        
        // Get balance
        await fetchBalance(accounts[0])
      } else {
        setError('MetaMask not installed')
      }
    } catch (err: any) {
      console.error('Error connecting to wallet:', err)
      setError(err.message || 'Failed to connect wallet')
    } finally {
      setIsConnecting(false)
    }
  }

  const fetchBalance = async (address: string) => {
    try {
      const balance = await window.ethereum.request({
        method: 'eth_getBalance',
        params: [address, 'latest'],
      })
      
      // Convert from wei to ETH
      const ethBalance = parseInt(balance, 16) / 1e18
      setBalance(ethBalance.toFixed(4))
    } catch (err) {
      console.error('Error getting wallet balance:', err)
      setBalance(null)
    }
  }

  const disconnectWallet = () => {
    setWalletAddress(null)
    setBalance(null)
  }

  const shortenAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Web3 Wallet
        </CardTitle>
        <CardDescription>Connect your Ethereum wallet to view your crypto assets</CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {!isMetaMaskInstalled && (
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>MetaMask Not Detected</AlertTitle>
            <AlertDescription>
              <p className="mb-2">Please install MetaMask to use this feature.</p>
              <a 
                href="https://metamask.io/download/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center text-blue-600 hover:underline"
              >
                Download MetaMask <ExternalLink className="ml-1 h-3 w-3" />
              </a>
            </AlertDescription>
          </Alert>
        )}
        
        {walletAddress ? (
          <div className="space-y-4">
            <div className="flex flex-col space-y-1">
              <span className="text-sm text-muted-foreground">Connected Wallet</span>
              <span className="font-medium">{shortenAddress(walletAddress)}</span>
            </div>
            
            <div className="flex flex-col space-y-1">
              <span className="text-sm text-muted-foreground">ETH Balance</span>
              {balance ? (
                <span className="font-medium">{balance} ETH</span>
              ) : (
                <Skeleton className="h-6 w-24" />
              )}
            </div>
            
            <div className="flex justify-between">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => fetchBalance(walletAddress)}
              >
                Refresh Balance
              </Button>
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={disconnectWallet}
              >
                Disconnect
              </Button>
            </div>
          </div>
        ) : (
          <Button 
            onClick={connectWallet} 
            disabled={isConnecting || !isMetaMaskInstalled}
            className="w-full"
          >
            {isConnecting ? 'Connecting...' : 'Connect Wallet'}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

// Add TypeScript declaration for window.ethereum
declare global {
  interface Window {
    ethereum: any
  }
}
