'use client';

import SwapInterface from '@/components/SwapInterface';
import { WrenchIcon } from '@heroicons/react/24/outline';

export default function Home() {
   return (
      <div className="min-h-screen bg-black text-white">
         {/* Testnet Banner */}
         <div className="bg-[#1c1c1c] py-2 px-4 flex items-center gap-2">
            <WrenchIcon className="h-5 w-5 text-green-500" />
            <span className="text-green-500 text-sm">You are in testnet mode</span>
         </div>

         {/* Main Content */}
         <div className="max-w-md mx-auto px-4 py-6">
            <SwapInterface />
         </div>
      </div>
   );
}
