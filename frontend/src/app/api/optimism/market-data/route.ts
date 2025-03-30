import { NextRequest, NextResponse } from 'next/server';
import { OptimismService } from '@/utils/optimism';

export async function GET(request: NextRequest) {
   try {
      const searchParams = request.nextUrl.searchParams;
      const fromToken = searchParams.get('fromToken');
      const toToken = searchParams.get('toToken');
      const network = searchParams.get('network') || 'testnet';

      if (!fromToken || !toToken) {
         return NextResponse.json(
            { error: 'Missing required parameters' },
            { status: 400 }
         );
      }

      const optimismService = new OptimismService(network as 'mainnet' | 'testnet');

      const [tokenData, marketData] = await Promise.all([
         optimismService.getTokenData(fromToken as any),
         optimismService.getMarketData(fromToken as any, toToken as any)
      ]);

      return NextResponse.json({
         tokenData,
         marketData
      });
   } catch (error) {
      console.error('Error fetching market data:', error);
      return NextResponse.json(
         { error: 'Failed to fetch market data' },
         { status: 500 }
      );
   }
} 