"use client"
import React, { useState } from 'react';
import { Decimal } from 'decimal.js';
import { ArrowsUpDownIcon } from '@heroicons/react/24/outline';
import LoadingSpinner from './LoadingSpinner';
import TokenSelect from './TokenSelect';

// Add Ethereum provider type to window object
interface EthereumProvider {
   request: (args: { method: string; params?: string[] }) => Promise<string[]>;
   on: (eventName: string, handler: (params: string[]) => void) => void;
   removeListener: (eventName: string, handler: (params: string[]) => void) => void;
}

declare global {
   interface Window {
      ethereum?: EthereumProvider;
   }
}

interface Token {
   symbol: string;
   name: string;
   balance: string;
   decimals: number;
}

interface MarketData {
   priceHistory: Array<{ timestamp: number; price: string }>;
   marketDepth: {
      bids: Array<{ price: string; amount: string }>;
      asks: Array<{ price: string; amount: string }>;
   };
   volatility24h: string;
   lastTrades: Array<{ price: string; amount: string; timestamp: number }>;
}

const mockTokens: Token[] = [
   { symbol: 'ETH', name: 'Ethereum', balance: '10.0', decimals: 18 },
   { symbol: 'USDC', name: 'USD Coin', balance: '1000.0', decimals: 6 },
   { symbol: 'DAI', name: 'DAI Stablecoin', balance: '500.0', decimals: 18 },
   { symbol: 'EURC', name: 'Euro Coin', balance: '800.0', decimals: 6 },
   { symbol: 'xDAI', name: 'xDAI', balance: '300.0', decimals: 18 },
];

type SwapStep = {
   status: 'pending' | 'loading' | 'completed' | 'error';
   message: string;
}

type SwapStatus = {
   fetchingOptimismData: SwapStep;
   runningMLModel: SwapStep;
   calculatingFee: SwapStep;
   executingSwap: SwapStep;
}

export default function SwapInterface() {
   const [fromToken, setFromToken] = useState<Token>(mockTokens[0]);
   const [toToken, setToToken] = useState<Token>(mockTokens[1]);
   const [fromAmount, setFromAmount] = useState<string>('');
   const [toAmount, setToAmount] = useState<string>('');
   const [fee, setFee] = useState<number>(0.3);
   const [account, setAccount] = useState<string>('');
   const [isConnecting, setIsConnecting] = useState<boolean>(false);
   const [isSwapping, setIsSwapping] = useState<boolean>(false);
   const [swapStatus, setSwapStatus] = useState<SwapStatus>({
      fetchingOptimismData: { status: 'pending', message: 'Fetching market data from Optimism' },
      runningMLModel: { status: 'pending', message: 'Running ML model for price prediction' },
      calculatingFee: { status: 'pending', message: 'Calculating optimal dynamic fee' },
      executingSwap: { status: 'pending', message: 'Executing swap transaction' }
   });

   const connectWallet = async () => {
      if (typeof window.ethereum === 'undefined') {
         alert('Please install MetaMask to use this feature');
         return;
      }

      try {
         setIsConnecting(true);
         const accounts = await window.ethereum.request({
            method: 'eth_requestAccounts'
         });
         setAccount(accounts[0]);
      } catch (error) {
         console.error('Failed to connect wallet:', error);
         alert('Failed to connect wallet. Please try again.');
      } finally {
         setIsConnecting(false);
      }
   };

   // Calculate dynamic fee based on amount
   const calculateDynamicFee = (amount: string) => {
      const baseAmount = new Decimal(amount || '0');
      if (baseAmount.lessThan(1000)) {
         setFee(0.3);
      } else if (baseAmount.lessThan(10000)) {
         setFee(0.25);
      } else {
         setFee(0.2);
      }
   };

   // Calculate price
   const calculatePrice = (input: string, reverse: boolean = false) => {
      if (!input) {
         setToAmount('');
         return;
      }

      const inputAmount = new Decimal(input);
      const rate = new Decimal(1500); // Mock ETH/USDC rate
      const feeMultiplier = new Decimal(1).minus(new Decimal(fee).dividedBy(100));

      if (!reverse) {
         const outputAmount = inputAmount.times(rate).times(feeMultiplier);
         setToAmount(outputAmount.toFixed(toToken.decimals));
      } else {
         const outputAmount = inputAmount.dividedBy(rate).times(feeMultiplier);
         setFromAmount(outputAmount.toFixed(fromToken.decimals));
      }
   };

   const handleFromAmountChange = (value: string) => {
      // Remove any non-numeric characters except decimal point
      const sanitizedValue = value.replace(/[^\d.]/g, '');
      // Prevent multiple decimal points
      const parts = sanitizedValue.split('.');
      const cleanValue = parts[0] + (parts.length > 1 ? '.' + parts[1] : '');

      setFromAmount(cleanValue);
      calculateDynamicFee(cleanValue);
      calculatePrice(cleanValue);
   };

   const handleToAmountChange = (value: string) => {
      // Remove any non-numeric characters except decimal point
      const sanitizedValue = value.replace(/[^\d.]/g, '');
      // Prevent multiple decimal points
      const parts = sanitizedValue.split('.');
      const cleanValue = parts[0] + (parts.length > 1 ? '.' + parts[1] : '');

      setToAmount(cleanValue);
      calculateDynamicFee(cleanValue);
      calculatePrice(cleanValue, true);
   };

   const handleFromTokenChange = (token: Token) => {
      if (token.symbol === toToken.symbol) {
         // Swap tokens if user selects the same token
         setToToken(fromToken);
      }
      setFromToken(token);
      if (fromAmount) {
         calculatePrice(fromAmount);
      }
   };

   const handleToTokenChange = (token: Token) => {
      if (token.symbol === fromToken.symbol) {
         // Swap tokens if user selects the same token
         setFromToken(toToken);
      }
      setToToken(token);
      if (toAmount) {
         calculatePrice(toAmount, true);
      }
   };

   const updateStepStatus = (
      step: keyof SwapStatus,
      status: SwapStep['status'],
      message?: string
   ) => {
      setSwapStatus(prev => ({
         ...prev,
         [step]: {
            ...prev[step],
            status,
            message: message || prev[step].message
         }
      }));
   };

   const fetchOptimismData = async (fromToken: Token, toToken: Token) => {
      try {
         const response = await fetch(
            `/api/optimism/market-data?fromToken=${fromToken.symbol}&toToken=${toToken.symbol}`,
            { cache: 'no-store' }
         );
         if (!response.ok) throw new Error('Failed to fetch market data');
         return await response.json();
      } catch (error) {
         console.error('Error fetching market data:', error);
         throw error;
      }
   };

   const predictFee = async (
      fromToken: Token,
      toToken: Token,
      amount: string,
      marketData: MarketData
   ) => {
      try {
         const response = await fetch('/api/ml/predict-fee', {
            method: 'POST',
            headers: {
               'Content-Type': 'application/json',
            },
            body: JSON.stringify({
               fromToken: fromToken.symbol,
               toToken: toToken.symbol,
               amount,
               marketData,
            }),
            cache: 'no-store'
         });

         if (!response.ok) throw new Error('Failed to predict fee');
         return await response.json();
      } catch (error) {
         console.error('Error predicting fee:', error);
         throw error;
      }
   };

   const handleSwap = async () => {
      setIsSwapping(true);

      try {
         // Reset all steps
         Object.keys(swapStatus).forEach(step => {
            updateStepStatus(step as keyof SwapStatus, 'pending');
         });

         // Step 1: Fetch Optimism Data
         updateStepStatus('fetchingOptimismData', 'loading');
         const { marketData } = await fetchOptimismData(fromToken, toToken);
         updateStepStatus('fetchingOptimismData', 'completed');

         // Step 2: Run ML Model
         updateStepStatus('runningMLModel', 'loading');
         const { prediction } = await predictFee(fromToken, toToken, fromAmount, marketData);
         updateStepStatus('runningMLModel', 'completed');

         // Step 3: Calculate Dynamic Fee
         updateStepStatus('calculatingFee', 'loading');
         setFee(prediction.suggestedFee);
         updateStepStatus('calculatingFee', 'completed');

         // Step 4: Execute Swap
         updateStepStatus('executingSwap', 'loading');
         // Here you would integrate with your actual swap execution logic
         await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate transaction
         updateStepStatus('executingSwap', 'completed');

         console.log('Swap executed successfully');
      } catch (error) {
         // Mark current step as error
         const currentStep = Object.entries(swapStatus).find(([, step]) => step.status === 'loading');
         if (currentStep) {
            updateStepStatus(currentStep[0] as keyof SwapStatus, 'error', 'An error occurred');
         }
         console.error('Swap failed:', error);
      } finally {
         setIsSwapping(false);
      }
   };

   const switchTokens = () => {
      setFromToken(toToken);
      setToToken(fromToken);
      setFromAmount(toAmount);
      setToAmount(fromAmount);
   };

   const renderSwapSteps = () => {
      if (!isSwapping) return null;

      return (
         <div className="text-sm space-y-2">
            {Object.entries(swapStatus).map(([key, step]) => (
               <div key={key} className="flex items-center gap-3 py-1">
                  {step.status === 'pending' && (
                     <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                  )}
                  {step.status === 'loading' && (
                     <LoadingSpinner size="sm" className="text-blue-500" />
                  )}
                  {step.status === 'completed' && (
                     <div className="w-4 h-4 rounded-full bg-green-500 text-white flex items-center justify-center">
                        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                     </div>
                  )}
                  {step.status === 'error' && (
                     <div className="w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center">
                        ✕
                     </div>
                  )}
                  <span className={`flex-1 ${step.status === 'completed' ? 'text-gray-500' :
                     step.status === 'loading' ? 'text-black' :
                        step.status === 'error' ? 'text-red-600' :
                           'text-gray-400'
                     }`}>
                     {step.message}
                  </span>
               </div>
            ))}
         </div>
      );
   };

   const getSwapButtonText = () => {
      if (!isSwapping) return 'Get Dynamic Fee';

      const loadingStep = Object.entries(swapStatus).find(([, step]) => step.status === 'loading');
      if (!loadingStep) return 'Swap';

      switch (loadingStep[0]) {
         case 'fetchingOptimismData':
            return 'Fetching Data...';
         case 'runningMLModel':
            return 'Running ML Model...';
         case 'calculatingFee':
            return 'Calculating Fee...';
         case 'executingSwap':
            return 'Swapping...';
         default:
            return 'Processing...';
      }
   };

   return (
      <div className="space-y-4">
         {/* Header with Account */}
         <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
               <div className="w-10 h-10 bg-[#2c2c2c] rounded-full flex items-center justify-center">
                  <span className="text-purple-500">◆</span>
               </div>
               <div className="flex flex-col">
                  <span className="text-lg font-medium">kaleel</span>
                  <span className="text-sm text-gray-500">{account ? `${account.slice(0, 6)}...${account.slice(-4)}` : '0x0f7e...2c4C'}</span>
               </div>
            </div>
            <button
               onClick={connectWallet}
               disabled={isConnecting}
               className="text-gray-400 hover:text-white transition-colors disabled:opacity-50"
            >
               {isConnecting ? (
                  <LoadingSpinner size="sm" className="text-gray-400" />
               ) : (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
               )}
            </button>
         </div>

         {/* Swap Container */}
         <div className="bg-[#1c1c1c] rounded-2xl p-6">
            <div className="flex justify-between items-center mb-6">
               <h2 className="text-lg font-medium">Swap Tokens</h2>
            </div>

            {/* From Token */}
            <div className="bg-[#2c2c2c] rounded-xl p-4 mb-2">
               <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-400">From</span>
                  <span className="text-sm text-gray-400">Balance: {fromToken.balance}</span>
               </div>
               <div className="flex items-center gap-2">
                  <input
                     type="text"
                     inputMode="decimal"
                     pattern="[0-9]*[.]?[0-9]*"
                     placeholder="0.0"
                     value={fromAmount}
                     onChange={(e) => {
                        e.preventDefault();
                        handleFromAmountChange(e.target.value);
                     }}
                     onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                           e.preventDefault();
                        }
                     }}
                     className="w-full bg-transparent text-2xl outline-none text-white placeholder-gray-500"
                  />
                  <TokenSelect
                     tokens={mockTokens}
                     selectedToken={fromToken}
                     onChange={handleFromTokenChange}
                  />
               </div>
            </div>

            {/* Swap Button */}
            <div className="flex justify-center -my-2 relative z-10">
               <button
                  onClick={switchTokens}
                  className="bg-[#2c2c2c] p-2 rounded-lg shadow-xl hover:bg-[#3c3c3c] transition-all border border-gray-700"
               >
                  <ArrowsUpDownIcon className="h-6 w-6 text-blue-400" />
               </button>
            </div>

            {/* To Token */}
            <div className="bg-[#2c2c2c] rounded-xl p-4 mt-2">
               <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-400">To</span>
                  <span className="text-sm text-gray-400">Balance: {toToken.balance}</span>
               </div>
               <div className="flex items-center gap-2">
                  <input
                     type="text"
                     inputMode="decimal"
                     pattern="[0-9]*[.]?[0-9]*"
                     placeholder="0.0"
                     value={toAmount}
                     onChange={(e) => {
                        e.preventDefault();
                        handleToAmountChange(e.target.value);
                     }}
                     onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                           e.preventDefault();
                        }
                     }}
                     className="w-full bg-transparent text-2xl outline-none text-white placeholder-gray-500"
                  />
                  <TokenSelect
                     tokens={mockTokens}
                     selectedToken={toToken}
                     onChange={handleToTokenChange}
                  />
               </div>
            </div>

            {/* Fee Display */}
            <div className="bg-[#2c2c2c] rounded-xl p-4 mt-4">
               {isSwapping ? (
                  renderSwapSteps()
               ) : (
                  <>
                     <div className="flex justify-between items-center">
                        <span className="flex items-center gap-2 text-gray-400">
                           <span className="inline-block w-2 h-2 rounded-full bg-blue-500" />
                           Dynamic Fee
                        </span>
                        <span className="text-white font-medium">{fee}%</span>
                     </div>
                     {fromAmount && toAmount && (
                        <div className="flex justify-between mt-3 pt-3 border-t border-gray-700">
                           <span className="text-gray-400">Rate</span>
                           <span className="text-white">
                              1 {fromToken.symbol} = {new Decimal(toAmount).dividedBy(new Decimal(fromAmount)).toFixed(4)} {toToken.symbol}
                           </span>
                        </div>
                     )}
                  </>
               )}
            </div>

            {/* Swap Button */}
            <button
               className="w-full bg-gradient-to-r from-purple-500 to-blue-500 text-white py-3 rounded-xl font-medium mt-4
                        hover:from-purple-600 hover:to-blue-600 transition-all disabled:opacity-50 disabled:hover:from-purple-500 
                        disabled:hover:to-blue-500 flex items-center justify-center gap-2"
               onClick={handleSwap}
               disabled={isSwapping || !fromAmount || !toAmount}
            >
               {isSwapping && <LoadingSpinner size="sm" className="text-white" />}
               {getSwapButtonText()}
            </button>
         </div>
      </div>
   );
} 