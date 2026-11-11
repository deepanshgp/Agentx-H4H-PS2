// Import ethers dynamically to handle SSR
let ethers: any;

// Web3 connection status
export interface Web3ConnectionStatus {
  isConnected: boolean;
  address: string | null;
  chainId: number | null;
  provider: any | null;
  signer: any | null;
  balance: string | null;
  networkName: string | null;
}

// NFT interface
export interface NFT {
  id: string;
  name: string;
  description: string;
  image: string;
  collection: string;
  tokenId: string;
  contractAddress: string;
  lastPrice?: number;
  estimatedValue?: number;
}

// DeFi position interface
export interface DeFiPosition {
  id: string;
  protocol: string;
  type: 'staking' | 'lending' | 'liquidity' | 'farming';
  asset: string;
  balance: number;
  apy: number;
  value: number;
  rewards?: number;
  rewardToken?: string;
}

// Token interface
export interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  balance: string;
  price?: number;
  value?: number;
  logoURI?: string;
}

// Default connection status
const defaultConnectionStatus: Web3ConnectionStatus = {
  isConnected: false,
  address: null,
  chainId: null,
  provider: null,
  signer: null,
  balance: null,
  networkName: null,
};

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

// Initialize Web3 connection status in localStorage
export function initializeWeb3Status(): void {
  if (!isBrowser) return;
  
  if (!localStorage.getItem('web3Status')) {
    localStorage.setItem('web3Status', JSON.stringify(defaultConnectionStatus));
  }
}

// Get Web3 connection status from localStorage
export function getWeb3Status(): Web3ConnectionStatus {
  if (!isBrowser) return defaultConnectionStatus;
  
  try {
    const status = localStorage.getItem('web3Status');
    return status ? JSON.parse(status) : defaultConnectionStatus;
  } catch (error) {
    console.error('Error getting Web3 status:', error);
    return defaultConnectionStatus;
  }
}

// Update Web3 connection status in localStorage
export function updateWeb3Status(status: Partial<Web3ConnectionStatus>): void {
  if (!isBrowser) return;
  
  try {
    const currentStatus = getWeb3Status();
    const updatedStatus = { ...currentStatus, ...status };
    localStorage.setItem('web3Status', JSON.stringify(updatedStatus));
  } catch (error) {
    console.error('Error updating Web3 status:', error);
  }
}

// Connect to MetaMask
export async function connectToMetaMask(): Promise<Web3ConnectionStatus> {
  if (!isBrowser) return defaultConnectionStatus;
  
  try {
    // Check if MetaMask is installed
    if (!window.ethereum) {
      throw new Error('MetaMask is not installed');
    }

    // Request account access
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    const address = accounts[0];

    // Mock provider and signer for demo purposes
    const mockProvider = {
      getNetwork: async () => ({ chainId: 1, name: 'Ethereum Mainnet' }),
      getBalance: async () => '1500000000000000000' // 1.5 ETH in wei
    };
    
    const mockSigner = {
      getAddress: async () => address
    };

    const status: Web3ConnectionStatus = {
      isConnected: true,
      address,
      chainId: 1,
      provider: mockProvider,
      signer: mockSigner,
      balance: '1.5',
      networkName: 'Ethereum Mainnet',
    };

    // Update status in localStorage
    updateWeb3Status(status);

    // Set up event listeners
    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);
    window.ethereum.on('disconnect', handleDisconnect);

    return status;
  } catch (error) {
    console.error('Error connecting to MetaMask:', error);
    return defaultConnectionStatus;
  }
}

// Connect to WalletConnect
export async function connectToWalletConnect(): Promise<Web3ConnectionStatus> {
  if (!isBrowser) return defaultConnectionStatus;
  
  try {
    // This would require importing WalletConnect SDK
    // For now, we'll just return a placeholder
    console.log('WalletConnect integration to be implemented');
    
    // Mock connection for demo purposes
    const mockAddress = '0x' + Math.random().toString(16).substr(2, 40);
    
    const status: Web3ConnectionStatus = {
      isConnected: true,
      address: mockAddress,
      chainId: 1,
      provider: {},
      signer: {},
      balance: '2.5',
      networkName: 'Ethereum Mainnet',
    };
    
    // Update status in localStorage
    updateWeb3Status(status);
    
    return status;
  } catch (error) {
    console.error('Error connecting to WalletConnect:', error);
    return defaultConnectionStatus;
  }
}

// Disconnect wallet
export function disconnectWallet(): void {
  if (!isBrowser) return;
  
  try {
    // Remove event listeners if they were set
    if (window.ethereum) {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum.removeListener('chainChanged', handleChainChanged);
      window.ethereum.removeListener('disconnect', handleDisconnect);
    }

    // Reset connection status
    updateWeb3Status(defaultConnectionStatus);
  } catch (error) {
    console.error('Error disconnecting wallet:', error);
  }
}

// Handle accounts changed event
function handleAccountsChanged(accounts: string[]): void {
  if (accounts.length === 0) {
    // User disconnected their wallet
    disconnectWallet();
  } else {
    // Update with new account
    updateWeb3Status({ address: accounts[0] });
  }
}

// Handle chain changed event
function handleChainChanged(): void {
  // The best practice is to reload the page when the chain changes
  window.location.reload();
}

// Handle disconnect event
function handleDisconnect(): void {
  disconnectWallet();
}

// Get user's token balances
export async function getUserTokens(): Promise<Token[]> {
  if (!isBrowser) return [];
  
  try {
    const { isConnected, address } = getWeb3Status();

    if (!isConnected || !address) {
      return [];
    }

    // For now, we'll return mock data
    const mockTokens: Token[] = [
      {
        address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
        symbol: 'ETH',
        name: 'Ethereum',
        decimals: 18,
        balance: '1.5',
        price: 3500,
        value: 5250,
        logoURI: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
      },
      {
        address: '0x6b175474e89094c44da98b954eedeac495271d0f',
        symbol: 'DAI',
        name: 'Dai Stablecoin',
        decimals: 18,
        balance: '1000',
        price: 1,
        value: 1000,
        logoURI: 'https://assets.coingecko.com/coins/images/9956/small/dai-multi-collateral-mcd.png',
      },
      {
        address: '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984',
        symbol: 'UNI',
        name: 'Uniswap',
        decimals: 18,
        balance: '50',
        price: 10,
        value: 500,
        logoURI: 'https://assets.coingecko.com/coins/images/12504/small/uniswap-uni.png',
      },
      {
        address: '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9',
        symbol: 'AAVE',
        name: 'Aave',
        decimals: 18,
        balance: '10',
        price: 80,
        value: 800,
        logoURI: 'https://assets.coingecko.com/coins/images/12645/small/AAVE.png',
      },
    ];

    return mockTokens;
  } catch (error) {
    console.error('Error getting user tokens:', error);
    return [];
  }
}

// Get user's NFTs
export async function getUserNFTs(): Promise<NFT[]> {
  if (!isBrowser) return [];
  
  try {
    const { isConnected, address } = getWeb3Status();

    if (!isConnected || !address) {
      return [];
    }

    // For now, we'll return mock data
    const mockNFTs: NFT[] = [
      {
        id: '1',
        name: 'Bored Ape #1234',
        description: 'A bored ape from the Bored Ape Yacht Club collection',
        image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ2cHPYIc7Aqwr9PN-_29GhTt9uiQWUyXmlrw&s',
        collection: 'Bored Ape Yacht Club',
        tokenId: '1234',
        contractAddress: '0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d',
        lastPrice: 80,
        estimatedValue: 85,
      },
      {
        id: '2',
        name: 'CryptoPunk #5678',
        description: 'A punk from the CryptoPunks collection',
        image: 'https://nftnow.com/wp-content/uploads/2021/09/cryptopunks-guide.png',
        collection: 'CryptoPunks',
        tokenId: '5678',
        contractAddress: '0xb47e3cd837ddf8e4c57f05d70ab865de6e193bbb',
        lastPrice: 65,
        estimatedValue: 70,
      },
      {
        id: '3',
        name: 'Doodle #9012',
        description: 'A doodle from the Doodles collection',
        image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRJFCxpLSv0Qt7NUG2sUlv0ME5tCo59Ajj-zQ&s',
        collection: 'Doodles',
        tokenId: '9012',
        contractAddress: '0x8a90cab2b38dba80c64b7734e58ee1db38b8992e',
        lastPrice: 10,
        estimatedValue: 12,
      },
      {
        id: '4',
        name: 'Azuki #3456',
        description: 'An Azuki from the Azuki collection',
        image: 'https://miro.medium.com/v2/resize:fit:1400/1*s1_A8JBfuq79d-cjVBuXFg.jpeg',
        collection: 'Azuki',
        tokenId: '3456',
        contractAddress: '0xed5af388653567af2f388e6224dc7c4b3241c544',
        lastPrice: 15,
        estimatedValue: 18,
      },
    ];

    return mockNFTs;
  } catch (error) {
    console.error('Error getting user NFTs:', error);
    return [];
  }
}

// Get user's DeFi positions
export async function getUserDeFiPositions(): Promise<DeFiPosition[]> {
  if (!isBrowser) return [];
  
  try {
    const { isConnected, address } = getWeb3Status();

    if (!isConnected || !address) {
      return [];
    }

    // For now, we'll return mock data
    const mockPositions: DeFiPosition[] = [
      {
        id: '1',
        protocol: 'Aave',
        type: 'lending',
        asset: 'ETH',
        balance: 0.5,
        apy: 3.2,
        value: 1750,
      },
      {
        id: '2',
        protocol: 'Compound',
        type: 'lending',
        asset: 'DAI',
        balance: 500,
        apy: 4.5,
        value: 500,
      },
      {
        id: '3',
        protocol: 'Uniswap',
        type: 'liquidity',
        asset: 'ETH-USDC',
        balance: 0.25,
        apy: 15.8,
        value: 1000,
        rewards: 50,
        rewardToken: 'UNI',
      },
      {
        id: '4',
        protocol: 'Curve',
        type: 'liquidity',
        asset: '3pool',
        balance: 1000,
        apy: 8.2,
        value: 1000,
        rewards: 20,
        rewardToken: 'CRV',
      },
    ];

    return mockPositions;
  } catch (error) {
    console.error('Error getting user DeFi positions:', error);
    return [];
  }
}

// Swap tokens (simplified mock implementation)
export async function swapTokens(
  fromToken: string,
  toToken: string,
  amount: string
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  if (!isBrowser) return { success: false, error: 'Not in browser environment' };
  
  try {
    const { isConnected } = getWeb3Status();

    if (!isConnected) {
      return { success: false, error: 'Wallet not connected' };
    }

    // For now, we'll simulate a successful swap
    console.log(`Swapping ${amount} ${fromToken} to ${toToken}`);

    // Simulate transaction hash
    const txHash = '0x' + Math.random().toString(16).substr(2, 64);

    return {
      success: true,
      txHash,
    };
  } catch (error) {
    console.error('Error swapping tokens:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Track real-time blockchain transactions
export function trackBlockchainTransactions(callback: (transaction: any) => void): () => void {
  if (!isBrowser) return () => {};
  
  try {
    const { isConnected, address } = getWeb3Status();

    if (!isConnected || !address) {
      return () => {};
    }

    // For now, we'll simulate transactions every 30 seconds
    const intervalId = setInterval(() => {
      // Simulate a new transaction
      const mockTransaction = {
        hash: '0x' + Math.random().toString(16).substr(2, 64),
        from: Math.random() > 0.5 ? address : '0x' + Math.random().toString(16).substr(2, 40),
        to: Math.random() > 0.5 ? address : '0x' + Math.random().toString(16).substr(2, 40),
        value: (Math.random() * 2).toFixed(4),
        timestamp: Date.now(),
        blockNumber: Math.floor(Math.random() * 1000000) + 15000000,
      };

      callback(mockTransaction);
    }, 30000);

    // Return cleanup function
    return () => clearInterval(intervalId);
  } catch (error) {
    console.error('Error tracking blockchain transactions:', error);
    return () => {};
  }
}

// Get total Web3 portfolio value
export function calculateWeb3PortfolioValue(): number {
  if (!isBrowser) return 0;
  
  try {
    const tokens = localStorage.getItem('userTokens');
    const nfts = localStorage.getItem('userNFTs');
    const defiPositions = localStorage.getItem('userDeFiPositions');
    
    let totalValue = 0;
    
    // Add token values
    if (tokens) {
      const userTokens: Token[] = JSON.parse(tokens);
      totalValue += userTokens.reduce((sum, token) => sum + (token.value || 0), 0);
    }
    
    // Add NFT values
    if (nfts) {
      const userNFTs: NFT[] = JSON.parse(nfts);
      totalValue += userNFTs.reduce((sum, nft) => sum + (nft.estimatedValue || 0), 0);
    }
    
    // Add DeFi position values
    if (defiPositions) {
      const userDeFi: DeFiPosition[] = JSON.parse(defiPositions);
      totalValue += userDeFi.reduce((sum, position) => sum + position.value, 0);
    }
    
    return totalValue;
  } catch (error) {
    console.error('Error calculating Web3 portfolio value:', error);
    return 0;
  }
}

// Initialize Web3 integration
export function initializeWeb3Integration(): void {
  if (!isBrowser) return;
  
  initializeWeb3Status();
}

// Add global ethereum type
declare global {
  interface Window {
    ethereum: any;
  }
}
