import { NextRequest, NextResponse } from 'next/server';
import { OptimismService, TOKEN_ADDRESSES } from '@/utils/optimism';
import { MLService } from '@/utils/mlService';

type TokenSymbol = keyof typeof TOKEN_ADDRESSES.mainnet;

interface PredictFeeRequest {
   fromToken: TokenSymbol;
   toToken: TokenSymbol;
   amount: string;
   network?: 'mainnet' | 'testnet';
}

export async function POST(request: NextRequest) {
   try {
      const body = await request.json() as PredictFeeRequest;
      const { fromToken, toToken, amount, network = 'testnet' } = body;

      if (!fromToken || !toToken || !amount) {
         return NextResponse.json(
            { error: 'Missing required parameters' },
            { status: 400 }
         );
      }

      const optimismService = new OptimismService(network);
      const mlService = new MLService();

      // Get market data from Optimism
      // const marketData = await optimismService.getMarketData(fromToken, toToken);
      const marketData = await optimismService.getMarketData();

      // Get ML prediction
      const prediction = await mlService.predictOptimalFee(
         marketData,
         amount,
         // fromToken,
         // toToken
      );

      return NextResponse.json({
         prediction,
         marketData
      });
   } catch (error) {
      console.error('Error generating prediction:', error);
      return NextResponse.json(
         { error: 'Failed to generate prediction' },
         { status: 500 }
      );
   }
} 