'use client';

import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';

interface StockData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  ma5?: number;
  ma25?: number;
  ma75?: number;
  ma200?: number;
}

export default function Home() {
  const [symbol, setSymbol] = useState('');
  const [stockData, setStockData] = useState<StockData[] | null>(null);
  const [percentageChange, setPercentageChange] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMAs, setSelectedMAs] = useState<number[]>([25]); // デフォルトで25日移動平均線を選択
  const [selectedRange, setSelectedRange] = useState<string>('full'); // デフォルトで全期間

  const calculateMovingAverage = (data: StockData[], period: number) => {
    return data.map((d, i, arr) => {
      if (i < period - 1) {
        return { ...d };
      }
      const sum = arr
        .slice(i - period + 1, i + 1)
        .reduce((acc, curr) => acc + curr.close, 0);
      return { ...d, [`ma${period}`]: sum / period };
    });
  };

  const fetchStockData = async () => {
    setLoading(true);
    setError(null);
    setStockData(null); // データをクリア

    try {
      const response = await fetch(`/api/stock?symbol=${symbol}&range=${selectedRange}`);
      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Failed to fetch stock data');
        return;
      }

      const { stockData: rawStockData, percentageChange } = result;
      let processedStockData = rawStockData;

      // 各移動平均線を計算
      processedStockData = calculateMovingAverage(processedStockData, 5);
      processedStockData = calculateMovingAverage(processedStockData, 25);
      processedStockData = calculateMovingAverage(processedStockData, 75);
      processedStockData = calculateMovingAverage(processedStockData, 200);

      setStockData(processedStockData);
      setPercentageChange(percentageChange);
    } catch (err) {
      setError('An unexpected error occurred.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-center">米国株価分析アプリ</h1>

      <div className="flex justify-center mb-6">
        <input
          type="text"
          className="border p-2 rounded-l-md w-64 text-black"
          placeholder="銘柄コードを入力 (例: AAPL)"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value.toUpperCase())}
        />
        <select
          className="border p-2 text-black"
          value={selectedRange}
          onChange={(e) => setSelectedRange(e.target.value)}
        >
          <option value="1m">1ヶ月</option>
          <option value="3m">3ヶ月</option>
          <option value="6m">6ヶ月</option>
          <option value="1y">1年</option>
          <option value="5y">5年</option>
          <option value="full">全期間</option>
        </select>
        <button
          className="bg-blue-500 text-white p-2 rounded-r-md hover:bg-blue-600"
          onClick={fetchStockData}
          disabled={loading}
        >
          {loading ? '読み込み中...' : '検索'}
        </button>
      </div>

      {stockData && stockData.length > 0 && (
        <div className="mb-4 flex justify-center space-x-4">
          {[5, 25, 75, 200].map((period) => (
            <label key={period} className="inline-flex items-center">
              <input
                type="checkbox"
                className="form-checkbox text-blue-600"
                value={period}
                checked={selectedMAs.includes(period)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedMAs([...selectedMAs, period]);
                  } else {
                    setSelectedMAs(selectedMAs.filter((ma) => ma !== period));
                  }
                }}
              />
              <span className="ml-2 text-gray-700">{period}日MA</span>
            </label>
          ))}
        </div>
      )}

      {error && <p className="text-red-500 text-center mb-4">{error}</p>}

      {stockData && stockData.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold mb-4 text-black">
            {symbol} 株価チャート
          </h2>
          {percentageChange !== null && (
            <p className={`text-lg font-medium mb-4 ${percentageChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              前日比: {percentageChange.toFixed(2)}%
            </p>
          )}
          <ResponsiveContainer width="100%" height={400}>
            <LineChart
              data={stockData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={(str) => format(new Date(str), 'yyyy-MM-dd')}
                angle={-45}
                textAnchor="end"
                height={80}
                interval="preserveStartEnd"
              />
              <YAxis domain={['auto', 'auto']} />
              <Tooltip
                labelFormatter={(label) => format(new Date(label), 'yyyy-MM-dd')}
                formatter={(value, name) => {
                  if (name === 'close') return [`${(value as number).toFixed(2)}`, '終値'];
                  if (typeof name === 'string' && name.startsWith('ma')) return [`${(value as number).toFixed(2)}`, `${name.replace('ma', '')}日移動平均`];
                  return [value, name];
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="close"
                stroke="#8884d8"
                activeDot={{ r: 8 }}
                name="終値"
              />
              {selectedMAs.includes(5) && (
                <Line
                  type="monotone"
                  dataKey="ma5"
                  stroke="#ff7300"
                  dot={false}
                  name="5日移動平均"
                />
              )}
              {selectedMAs.includes(25) && (
                <Line
                  type="monotone"
                  dataKey="ma25"
                  stroke="#82ca9d"
                  dot={false}
                  name="25日移動平均"
                />
              )}
              {selectedMAs.includes(75) && (
                <Line
                  type="monotone"
                  dataKey="ma75"
                  stroke="#0088FE"
                  dot={false}
                  name="75日移動平均"
                />
              )}
              {selectedMAs.includes(200) && (
                <Line
                  type="monotone"
                  dataKey="ma200"
                  stroke="#FF0000"
                  dot={false}
                  name="200日移動平均"
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {stockData && stockData.length === 0 && !loading && !error && (
        <p className="text-center text-gray-600">
          指定された銘柄のデータが見つかりませんでした。
        </p>
      )}
    </div>
  );
}