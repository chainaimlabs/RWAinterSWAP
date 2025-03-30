import { Fragment } from 'react';
import { Listbox, Transition } from '@headlessui/react';
import { ChevronUpDownIcon } from '@heroicons/react/24/outline';

interface Token {
   symbol: string;
   name: string;
   balance: string;
   decimals: number;
}

interface TokenSelectProps {
   tokens: Token[];
   selectedToken: Token;
   onChange: (token: Token) => void;
}

export default function TokenSelect({ tokens, selectedToken, onChange }: TokenSelectProps) {
   return (
      <Listbox value={selectedToken} onChange={onChange}>
         <div className="relative">
            <Listbox.Button className="flex items-center bg-blue-500/20 px-4 py-2 rounded-lg hover:bg-blue-500/30 transition-all border border-blue-500/20">
               <span className="font-medium text-white">{selectedToken.symbol}</span>
               <ChevronUpDownIcon className="h-4 w-4 ml-2 text-blue-400" />
            </Listbox.Button>
            <Transition
               as={Fragment}
               leave="transition ease-in duration-100"
               leaveFrom="opacity-100"
               leaveTo="opacity-0"
            >
               <Listbox.Options className="absolute right-0 mt-2 max-h-60 w-56 overflow-auto rounded-xl bg-gray-800/95 backdrop-blur-sm py-2 shadow-xl ring-1 ring-gray-700 focus:outline-none z-10">
                  {tokens.map((token) => (
                     <Listbox.Option
                        key={token.symbol}
                        value={token}
                        className={({ active }) =>
                           `relative cursor-pointer select-none py-3 px-4 ${active ? 'bg-blue-500/20 text-white' : 'text-gray-300'
                           }`
                        }
                     >
                        {({ selected }) => (
                           <div className="flex flex-col">
                              <div className="flex items-center justify-between">
                                 <span className={`block truncate ${selected ? 'font-medium text-blue-400' : 'font-normal'}`}>
                                    {token.symbol}
                                 </span>
                                 {selected && (
                                    <span className="text-blue-400">
                                       <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                       </svg>
                                    </span>
                                 )}
                              </div>
                              <span className="block truncate text-sm text-gray-500 mt-1">
                                 Balance: {token.balance}
                              </span>
                           </div>
                        )}
                     </Listbox.Option>
                  ))}
               </Listbox.Options>
            </Transition>
         </div>
      </Listbox>
   );
} 