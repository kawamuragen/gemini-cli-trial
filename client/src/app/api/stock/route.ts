import { NextResponse } from 'next/server';
import { subMonths, subYears, isAfter, parseISO } from 'date-fns';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  const range = searchParams.get('range');

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
  }

  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
  }

  const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&outputsize=full&apikey=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data['Error Message']) {
      let errorMessage = data['Error Message'];
      if (errorMessage.includes('Invalid API call')) {
        errorMessage = '指定された銘柄コードが見つかりません。正しい銘柄コードを入力してください。';
      }
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }
    if (!data['Time Series (Daily)']) {
      return NextResponse.json({ error: data['Error Message'] }, { status: 400 });
    }
    if (!data['Time Series (Daily)']) {
      return NextResponse.json({ error: 'No data found for this symbol' }, { status: 404 });
    }

    const timeSeries = data['Time Series (Daily)'];
    let formattedData = Object.keys(timeSeries).map(date => ({
      date,
      open: parseFloat(timeSeries[date]['1. open']),
      high: parseFloat(timeSeries[date]['2. high']),
      low: parseFloat(timeSeries[date]['3. low']),
      close: parseFloat(timeSeries[date]['4. close']),
      volume: parseInt(timeSeries[date]['5. volume']),
    })).reverse(); // 日付を昇順にする

    // データのフィルタリング
    const today = new Date();
    let startDate: Date | null = null;

    switch (range) {
      case '1m':
        startDate = subMonths(today, 1);
        break;
      case '3m':
        startDate = subMonths(today, 3);
        break;
      case '6m':
        startDate = subMonths(today, 6);
        break;
      case '1y':
        startDate = subYears(today, 1);
        break;
      case '5y':
        startDate = subYears(today, 5);
        break;
      case 'full':
      default:
        // 全期間の場合はフィルタリングしない
        break;
    }

    if (startDate) {
      formattedData = formattedData.filter(d => isAfter(parseISO(d.date), startDate!));
    }

    let percentageChange = null;
    if (formattedData.length >= 2) {
      const latestClose = formattedData[formattedData.length - 1].close;
      const previousClose = formattedData[formattedData.length - 2].close;
      if (previousClose !== 0) {
        percentageChange = ((latestClose - previousClose) / previousClose) * 100;
      }
    }

    return NextResponse.json({ stockData: formattedData, percentageChange });
  } catch (error) {
    console.error('Error fetching stock data:', error);
    return NextResponse.json({ error: 'Failed to fetch stock data' }, { status: 500 });
  }
}
