import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, BarChart, Bar, ComposedChart
} from 'recharts';
import {
  TrendingUp, TrendingDown, Home, BarChart3, MessageSquare,
  Activity, MapPin, RefreshCw, Search, ChevronDown, Coins, Globe, ArrowRightLeft
} from 'lucide-react';


const TAIWAN_REGIONS = [
  '台北市', '新北市', '桃園市', '台中市', '台南市', '高雄市',
  '基隆市', '新竹市', '新竹縣', '苗栗縣', '彰化縣', '南投縣',
  '雲林縣', '嘉義市', '嘉義縣', '屏東縣', '宜蘭縣', '花蓮縣',
  '台東縣', '澎湖縣', '金門縣', '連江縣'
];

const PAGES = { STOCKS: '股市', HOUSING: '房市', GOLD: '黃金', CURRENCY: '貨幣' };

const CURRENCY_MAP = {
  'TWD': { 'zh-TW': '新台幣', 'en': 'Taiwan Dollar' },
  'USD': { 'zh-TW': '美元', 'en': 'US Dollar' },
  'EUR': { 'zh-TW': '歐元', 'en': 'Euro' },
  'JPY': { 'zh-TW': '日圓', 'en': 'Japanese Yen' },
  'GBP': { 'zh-TW': '英鎊', 'en': 'British Pound' },
  'CNY': { 'zh-TW': '人民幣', 'en': 'Yuan Renminbi' },
  'HKD': { 'zh-TW': '港幣', 'en': 'Hong Kong Dollar' },
  'KRW': { 'zh-TW': '韓元', 'en': 'South Korean Won' },
  'SGD': { 'zh-TW': '新加坡幣', 'en': 'Singapore Dollar' },
  'CAD': { 'zh-TW': '加幣', 'en': 'Canadian Dollar' },
  'AUD': { 'zh-TW': '澳幣', 'en': 'Australian Dollar' },
  'THB': { 'zh-TW': '泰銖', 'en': 'Thai Baht' },
  'NZD': { 'zh-TW': '紐幣', 'en': 'NZ Dollar' },
  'CHF': { 'zh-TW': '瑞士法郎', 'en': 'Swiss Franc' },
  'MYR': { 'zh-TW': '馬來西亞林吉特', 'en': 'Ringgit' },
  'VND': { 'zh-TW': '越南盾', 'en': 'Vietnamese Dong' },
  'PHP': { 'zh-TW': '菲律賓披索', 'en': 'Philippine Peso' },
  'INR': { 'zh-TW': '印度盧比', 'en': 'Indian Rupee' },
  'IDR': { 'zh-TW': '印尼盾', 'en': 'Indonesian Rupiah' },
  'MXN': { 'zh-TW': '墨西哥披索', 'en': 'Mexican Peso' },
  'BRL': { 'zh-TW': '巴西雷亞爾', 'en': 'Brazilian Real' },
  'ZAR': { 'zh-TW': '南非蘭特', 'en': 'South African Rand' },
  'SEK': { 'zh-TW': '瑞典克朗', 'en': 'Swedish Krona' },
  'DKK': { 'zh-TW': '丹麥克朗', 'en': 'Danish Krone' },
  'NOK': { 'zh-TW': '挪威克朗', 'en': 'Norwegian Krone' }
};

const getLocName = (code) => {
  const lang = navigator.language.startsWith('zh') ? 'zh-TW' : 'en';
  return CURRENCY_MAP[code] ? CURRENCY_MAP[code][lang] : '';
};

const fmt = (num) => {
  const v = Number(num);
  if (isNaN(v) || v === 0) return '---';
  if (v >= 100000000) return (v / 100000000).toFixed(2) + ' 億';
  if (v >= 10000) return (v / 10000).toFixed(1) + ' 萬';
  return v.toLocaleString();
};


const ClockDisplay = React.memo(() => {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return (
    <div className="status-badge">
      <span className="pulse" />
      系統運作中: {time.toLocaleTimeString('zh-TW')}
    </div>
  );
});


const CandlestickShape = ({ x, y, width, height, low, high, open, close }) => {
  if (open === undefined || close === undefined) return null;
  const isUp = close >= open;
  const color = isUp ? '#ef4444' : '#22c55e';
  const bodyH = Math.max(Math.abs(height), 1);
  const ratio = bodyH / Math.max(Math.abs(open - close), 0.01);
  const cx = x + width / 2;
  return (
    <g>
      <line x1={cx} y1={y - (high - Math.max(open, close)) * ratio}
            x2={cx} y2={y + bodyH + (Math.min(open, close) - low) * ratio}
            stroke={color} strokeWidth={1.5} />
      <rect x={x} y={y} width={Math.max(width, 2)} height={bodyH} fill={color} />
    </g>
  );
};



const SummaryCard = React.memo(({ title, value, change, icon: Icon, color, unit = '' }) => (
  <div className="card summary-card">
    <div className="card-header">
      <div className="icon-wrapper" style={{ background: `${color}20`, color }}><Icon size={18} /></div>
      <h3>{title}</h3>
    </div>
    <div className="card-content">
      <p className="value">{value}<span className="unit">{unit}</span></p>
      <div className={`change ${Number(change) >= 0 ? 'positive' : 'negative'}`}>
        {Number(change) >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
        {Math.abs(Number(change) || 0).toFixed(2)}%
      </div>
    </div>
  </div>
));

const StockView = React.memo(({ stocks, searchSymbol }) => {
  const symbolData = useMemo(() => 
    [...(stocks || [])].filter(s => s.symbol.includes(searchSymbol)), 
    [stocks, searchSymbol]
  );
  const latest = symbolData[symbolData.length - 1];
  const twii = stocks?.find(s => s.symbol === '^TWII');

  return (
    <>
      <div className="summary-grid">
        <SummaryCard title={`個股行情 (${searchSymbol})`} value={latest ? `$${latest.close_price}` : '---'} change={1.25} icon={BarChart3} color="var(--blue)" />
        <SummaryCard title="加權指數 (^TWII)" value={fmt(twii?.close_price)} change={-0.34} icon={Activity} color="var(--purple)" />
        <SummaryCard title="市場成交量" value={fmt(twii?.volume)} unit="股" change={5.2} icon={TrendingUp} color="var(--trend-down)" />
        <SummaryCard title="大師指標情緒" value="偏多操作" change={12.5} icon={MessageSquare} color="var(--pink)" />
      </div>
      <div className="main-grid" style={{ gridTemplateColumns: '1fr' }}>
        <div className="chart-section card">
          <div className="section-header"><BarChart3 size={20} color="var(--blue)" /><h2>即時 K 線技術分析</h2></div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={symbolData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="trade_date" stroke="#475569" fontSize={11} tickFormatter={v => new Date(v).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' })} />
                <YAxis domain={['auto', 'auto']} stroke="#475569" fontSize={11} allowDataOverflow />
                <Tooltip cursor={false} isAnimationActive={false} wrapperStyle={{ pointerEvents: 'none' }} contentStyle={{ background: '#0f172a', border: '1px solid var(--border)', borderRadius: '12px' }} />
                <Bar isAnimationActive={false} dataKey="close_price" shape={props => <CandlestickShape {...props} open={props.payload.open_price} close={props.payload.close_price} low={props.payload.low_price} high={props.payload.high_price} />} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </>
  );
});

const HousingView = React.memo(({ housing, selectedRegion }) => {
  const latestDataPerDistrict = useMemo(() => {
    if (!housing || housing.length === 0) return [];
    const map = new Map();
    housing.forEach(item => {
      const existing = map.get(item.district);
      if (!existing || new Date(item.transaction_date) > new Date(existing.transaction_date)) {
        map.set(item.district, item);
      }
    });
    return Array.from(map.values()).sort((a, b) => b.price_per_ping - a.price_per_ping).slice(0, 10);
  }, [housing]);

  const regionTrend = useMemo(() =>
    [...(housing || [])].filter(h => h.district === selectedRegion).sort((a, b) => new Date(a.transaction_date) - new Date(b.transaction_date)),
    [housing, selectedRegion]
  );

  return (
    <>
      <div className="main-grid" style={{ marginBottom: '2rem' }}>
        <div className="chart-section card">
          <div className="section-header"><Home size={20} color="var(--trend-up)" /><h2>全台熱區最新均價 (萬/坪)</h2></div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={latestDataPerDistrict} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="district" stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 'auto']} stroke="#475569" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `${v}萬`} />
                <Tooltip cursor={false} isAnimationActive={false} wrapperStyle={{ pointerEvents: 'none' }} contentStyle={{ background: '#0f172a', border: '1px solid var(--border)', borderRadius: '12px' }} />
                <Bar isAnimationActive={false} dataKey="price_per_ping" fill="var(--blue)" radius={[6, 6, 0, 0]} barSize={45} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="chart-section card">
          <div className="section-header"><TrendingUp size={20} color="var(--blue)" /><h2>{selectedRegion} 房價趨勢</h2></div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={regionTrend} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <defs>
                  <linearGradient id="gHousing" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--blue)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--blue)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="transaction_date" stroke="#475569" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => new Date(v).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' })} />
                <YAxis domain={['auto', 'auto']} stroke="#475569" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `${v}萬`} />
                <Tooltip cursor={false} isAnimationActive={false} wrapperStyle={{ pointerEvents: 'none' }} contentStyle={{ background: '#0f172a', border: '1px solid var(--border)', borderRadius: '12px' }} />
                <Area isAnimationActive={false} type="monotone" dataKey="price_per_ping" stroke="var(--blue)" fill="url(#gHousing)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      <div className="card rank-section">
        <div className="section-header"><MapPin size={20} color="#4ade80" /><h2>全台行政區房價即時清單(坪)</h2></div>
        <div className="rank-list" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 3rem', padding: '0.5rem' }}>
          {TAIWAN_REGIONS.map((city, idx) => {
            const d = [...(housing || [])].filter(h => h.district === city)
              .sort((a, b) => new Date(b.transaction_date) - new Date(a.transaction_date))[0];
            const price = d ? Number(d.price_per_ping) : 0;
            return (
              <div key={city} className="rank-item" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <span className="rank-num">{idx + 1}</span>
                <span className="rank-name">{city}</span>
                <div className="rank-bar-bg"><div className="rank-bar-fill" style={{ width: `${Math.min(price / 1.5, 100)}%`, background: price > 60 ? 'var(--trend-up)' : 'var(--blue)' }} /></div>
                <span className="rank-val">{price > 0 ? `${price.toFixed(1)}萬` : '---'}</span>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
});

const GoldView = React.memo(({ gold }) => {
  const goldHistory = useMemo(() => [...(gold || [])].sort((a, b) => new Date(a.trade_date) - new Date(b.trade_date)), [gold]);
  const latest = goldHistory[goldHistory.length - 1];
  return (
    <div className="main-grid" style={{ gridTemplateColumns: '1fr 300px' }}>
      <div className="chart-section card">
        <div className="section-header"><Coins size={20} color="#fbbf24" /><h2>台灣實體金價 (台幣/錢)</h2></div>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={goldHistory}>
              <defs><linearGradient id="gGold" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#fbbf24" stopOpacity={0.3} /><stop offset="95%" stopColor="#fbbf24" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="trade_date" stroke="#475569" fontSize={11} tickFormatter={v => new Date(v).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' })} />
              <YAxis domain={['auto', 'auto']} stroke="#475569" fontSize={11} tickFormatter={v => (v / 10).toLocaleString()} />
              <Tooltip cursor={false} isAnimationActive={false} wrapperStyle={{ pointerEvents: 'none' }} contentStyle={{ background: '#0f172a', border: '1px solid var(--border)' }} formatter={v => [`${(v / 10).toLocaleString()} TWD`, '每錢價格']} />
              <Area isAnimationActive={false} type="monotone" dataKey="price_twd_liang" stroke="#fbbf24" fill="url(#gGold)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="card rank-section">
        <div className="section-header"><Activity size={20} color="#fbbf24" /><h2>實體金價即時回報</h2></div>
        <div style={{ padding: '0.5rem 0', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div><p style={{ color: 'var(--text-sub)', fontSize: '0.85rem' }}>最新成交 (每錢)</p><h2 style={{ color: '#fbbf24', fontSize: '2.8rem', fontWeight: 800 }}>{latest?.price_twd_liang ? `$${(Number(latest.price_twd_liang) / 10).toLocaleString()}` : '---'}</h2></div>
          <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '1rem' }}><p style={{ color: 'var(--text-sub)', fontSize: '0.75rem' }}>每兩成交價</p><p style={{ fontSize: '1.2rem', fontWeight: 700 }}>{latest?.price_twd_liang ? `$${Number(latest.price_twd_liang).toLocaleString()}` : '---'}</p></div>
          <div className="status-badge" style={{ background: 'rgba(251,191,36,0.05)', color: '#fbbf24', borderColor: 'rgba(251,191,36,0.2)', minWidth: 0 }}>自動整合 720 家金店行情</div>
        </div>
      </div>
    </div>
  );
});

const CurrencyView = React.memo(({ currencies }) => {
  const [base, setBase] = useState('TWD');
  const [amount, setAmount] = useState(1);

  const availableBases = useMemo(() => {
    const bases = new Set(['TWD', 'USD', 'EUR', 'JPY', 'GBP', 'CNY', 'HKD', 'KRW', 'SGD', 'CAD', 'AUD', 'THB', 'NZD', 'CHF', 'MYR', 'VND', 'PHP', 'INR', 'IDR']);
    (currencies || []).forEach(c => {
      const parts = c.pair.split('/');
      if (parts[0]) bases.add(parts[0]);
      if (parts[1]) bases.add(parts[1]);
    });
    return Array.from(bases).sort();
  }, [currencies]);


  const ratesMap = useMemo(() => {
    const map = {};
    (currencies || []).forEach(c => {
      const parts = c.pair.split('/');
      if (parts.length === 2) {
        const val = Number(c.rate);
        if (!isNaN(val)) {
          map[`${parts[0]}/${parts[1]}`] = val;
          map[`${parts[1]}/${parts[0]}`] = 1 / val;
        }
      }
    });
    return map;
  }, [currencies]);

  const convert = (target) => {
    if (base === target) return amount;
    
    // Level 1: Direct find
    if (ratesMap[`${base}/${target}`]) return amount * ratesMap[`${base}/${target}`];

    // Level 2: Via TWD Pivot (Common bridge)
    if (ratesMap[`${base}/TWD`] && ratesMap[`TWD/${target}`]) {
      return amount * ratesMap[`${base}/TWD`] * ratesMap[`TWD/${target}`];
    }

    // Level 3: Via USD Pivot (Global bridge)
    if (ratesMap[`${base}/USD`] && ratesMap[`USD/${target}`]) {
      return amount * ratesMap[`${base}/USD`] * ratesMap[`USD/${target}`];
    }

    // Level 4: Recursive deep search for any bridge
    const keys = Object.keys(ratesMap);
    for (const k of keys) {
      const [k1, k2] = k.split('/');
      if (k1 === base && ratesMap[`${k2}/${target}`]) {
        return amount * ratesMap[k] * ratesMap[`${k2}/${target}`];
      }
    }

    return null;
  };

  return (
    <div className="main-grid" style={{ gridTemplateColumns: '1.2fr 0.8fr' }}>
      <div className="card rank-section">
         <div className="section-header"><Globe size={20} color="var(--blue)" /><h2>全球外匯市場即時精確看板</h2></div>
         <div className="rank-list" style={{ maxHeight: '650px', overflowY: 'auto', paddingRight: '1rem' }}>
           {(currencies || []).length > 0 ? (currencies || []).sort((a,b) => a.pair.localeCompare(b.pair)).map(c => (
             <div key={c.pair} className="rank-item" style={{ padding: '0.8rem 0' }}>
               <div style={{ display: 'flex', flexDirection: 'column', width: '150px' }}>
                 <span className="rank-name" style={{ color: 'var(--text-main)', fontWeight: 700, fontSize: '1.1rem' }}>{c.pair}</span>
                 <span style={{ fontSize: '0.75rem', color: 'var(--text-sub)' }}>
                   {getLocName(c.pair.split('/')[0])} / {getLocName(c.pair.split('/')[1])}
                 </span>
               </div>
               <span className="rank-val" style={{ flex: 1, textAlign: 'left', color: 'var(--blue)', fontSize: '1.25rem', fontFamily: 'JetBrains Mono', fontWeight: 600 }}>{Number(c.rate).toFixed(5)}</span>
               <div className="change positive" style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                 <Activity size={10} /> Realtime
               </div>
             </div>
           )) : <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-sub)' }}>讀取全球匯率中...</div>}
         </div>
      </div>
      
      <div className="card rank-section" style={{ background: 'rgba(15, 23, 42, 0.9)', borderColor: 'rgba(192, 132, 252, 0.3)', position: 'sticky', top: '2rem' }}>
        <div className="section-header"><RefreshCw size={20} color="var(--purple)" /><h2>全球幣值換算</h2></div>
        <div className="currency-controls" style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.3)', marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="currency-input-group">
            <label style={{ fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block', color: 'var(--text-sub)' }}>輸入欲轉換金額</label>
            <div className="search-box" style={{ width: '100%', height: '56px', background: '#000', borderRadius: '12px' }}>
              <input type="number" className="no-spinner" value={amount} onChange={e => setAmount(Number(e.target.value))} style={{ width: '100%', fontSize: '1.6rem', fontWeight: 800, padding: '0 1rem' }} />
            </div>
          </div>
          <div className="currency-input-group">
            <label style={{ fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block', color: 'var(--text-sub)' }}>基準幣別 (Base Source)</label>
            <div className="region-selector" style={{ width: '100%', height: '56px', background: '#000', position: 'relative', borderRadius: '12px' }}>
              <select value={base} onChange={e => setBase(e.target.value)} style={{ width: '100%', cursor: 'pointer', padding: '0 1rem', fontSize: '1.1rem', fontWeight: 600 }}>
                {availableBases.map(b => <option key={b} value={b}>{b} {getLocName(b)}</option>)}
              </select>
            </div>
          </div>
        </div>
        
        <div className="rank-list" style={{ maxHeight: '450px', overflowY: 'auto', paddingRight: '0.5rem' }}>
          {availableBases.filter(b => b !== base).map(target => {
            const res = convert(target);
            return (
              <div key={target} className="rank-item" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', padding: '1rem 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span className="rank-name" style={{ color: 'var(--text-main)', fontSize: '1.1rem', fontWeight: 700 }}>{target}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-sub)' }}>{getLocName(target)}</span>
                  </div>
                  <ArrowRightLeft size={14} color="var(--text-sub)" />
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-sub)' }}>{base}</span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-sub)', opacity: 0.6 }}>{getLocName(base)}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className="rank-val" style={{ width: 'auto', color: 'var(--purple)', fontSize: '1.6rem', fontWeight: 800, fontFamily: 'JetBrains Mono' }}>
                    {res !== null ? res.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : '---'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});


const App = () => {
  const [data, setData] = useState({ stocks: [], housing: [], gold: [], currencies: [] });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchSymbol, setSearchSymbol] = useState('2330');
  const [selectedRegion, setSelectedRegion] = useState('台北市');
  const [tempSymbol, setTempSymbol] = useState('2330');
  const [activePage, setActivePage] = useState(PAGES.STOCKS);

  const dataRef = useRef(data);
  const symbolRef = useRef(searchSymbol);
  const regionRef = useRef(selectedRegion);

  useEffect(() => { dataRef.current = data; }, [data]);
  useEffect(() => { symbolRef.current = searchSymbol; }, [searchSymbol]);
  useEffect(() => { regionRef.current = selectedRegion; }, [selectedRegion]);

  const doFetch = async (isManual = false) => {
    if (isManual) setLoading(true); else setSyncing(true);
    try {
      const res = await fetch(`/api/v1/dashboard/overview?symbol=${symbolRef.current}&district=${regionRef.current}`);
      const json = await res.json();
      const next = { stocks: json.stocks || [], housing: json.housing || [], gold: json.gold || [], currencies: json.currencies || [] };
      const prev = dataRef.current;
      if (next.stocks.length === 0 && prev.stocks.length > 0) next.stocks = prev.stocks;
      if (next.housing.length === 0 && prev.housing.length > 0) next.housing = prev.housing;
      if (next.gold.length === 0 && prev.gold.length > 0) next.gold = prev.gold;
      next.stocks.sort((a, b) => new Date(a.trade_date) - new Date(b.trade_date));
      const same = (a, b, k) => a?.length === b?.length && (a?.length === 0 || a[a.length - 1][k] === b[b.length - 1][k]);
      if (isManual || !same(next.stocks, prev.stocks, 'close_price') || !same(next.housing, prev.housing, 'price_per_ping') || !same(next.gold, prev.gold, 'price_twd_liang')) setData(next);
    } catch (e) {
      console.warn('[Dashboard] Data Delay');
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  };

  const fetchRef = useRef(doFetch);
  fetchRef.current = doFetch;

  useEffect(() => {
    fetchRef.current(true);
    const interval = setInterval(() => fetchRef.current(false), 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="dashboard">
      <header className="main-header">
        <div className="title-section">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', height: '60px' }}>
            <h1>市場智能終端系統</h1>
            <div className="status-badge" style={{ padding: '6px 12px', fontSize: '0.75rem', minWidth: '95px', visibility: syncing ? 'visible' : 'hidden' }}>
              <RefreshCw size={14} className="spin" /> 同步數據中
            </div>
          </div>
          <p>專業數據中心：台股個股 / 全台房價 / 黃金行情 / 國際匯率 智能監測系統</p>
        </div>
        <div className="controls-section"><ClockDisplay /></div>
      </header>

      <div className="controls-section" style={{ marginBottom: '3rem', justifyContent: 'flex-start' }}>
        <div className="search-box">
          <Search size={18} color="var(--blue)" />
          <input type="text" placeholder="股票代號" value={tempSymbol} onChange={e => setTempSymbol(e.target.value)} onKeyDown={e => e.key === 'Enter' && setSearchSymbol(tempSymbol)} />
          <button className="btn-primary" onClick={() => setSearchSymbol(tempSymbol)}>查詢行情</button>
        </div>
        <div className="region-selector">
          <MapPin size={18} color="var(--blue)" />
          <select value={selectedRegion} onChange={e => setSelectedRegion(e.target.value)}>
            {TAIWAN_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <ChevronDown size={14} color="var(--text-sub)" />
        </div>
      </div>

      <nav className="top-nav">
        {Object.entries(PAGES).map(([k, label]) => (
          <div key={k} className={`nav-item ${activePage === label ? 'active' : ''}`} onClick={() => setActivePage(label)}>
            {label === PAGES.STOCKS && <BarChart3 size={18} />}
            {label === PAGES.HOUSING && <Home size={18} />}
            {label === PAGES.GOLD && <Coins size={18} />}
            {label === PAGES.CURRENCY && <Globe size={18} />}
            {label}
          </div>
        ))}
      </nav>

      <main style={{ minHeight: '600px' }}>
        {activePage === PAGES.STOCKS && <StockView stocks={data.stocks} searchSymbol={searchSymbol} />}
        {activePage === PAGES.HOUSING && <HousingView housing={data.housing} selectedRegion={selectedRegion} />}
        {activePage === PAGES.GOLD && <GoldView gold={data.gold} />}
        {activePage === PAGES.CURRENCY && <CurrencyView currencies={data.currencies} />}
      </main>

      {loading && <div className="loading-overlay"><RefreshCw className="spin" size={56} /><p style={{ marginTop: '1.2rem', fontSize: '1.2rem', fontWeight: 600 }}>數據載入中...</p></div>}
    </div>
  );
};

export default App;
