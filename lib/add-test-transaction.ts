import { Transaction, saveTransaction } from './portfolio-tracker';

export function addTestTransaction() {
  // Create a test transaction
  const testTransaction: Transaction = {
    id: `tx-${Date.now()}`,
    assetId: 'btc',
    assetName: 'Bitcoin',
    assetType: 'crypto',
    type: 'buy',
    quantity: 0.05,
    price: 3500000, // Price in INR
    totalValue: 0.05 * 3500000, // 175,000 INR
    timestamp: Date.now()
  };

  // Save the transaction to localStorage
  saveTransaction(testTransaction);
  
  return testTransaction;
}
