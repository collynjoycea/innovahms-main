import React, { useEffect, useState } from 'react';
import { 
  Download, 
  MessageSquare, 
  Flag, 
  Eye, 
  TrendingUp, 
  Heart,
  BarChart3,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import axios from 'axios';

const Reviews = ({ 
  data: initialData = [], 
  sentimentStats: initialSentimentStats = null, 
  trendData: initialTrendData = [], 
  insight: initialInsight = null 
}) => {
  const [data, setData] = useState(initialData);
  const [sentimentStats, setSentimentStats] = useState(initialSentimentStats);
  const [trendData, setTrendData] = useState(initialTrendData);
  const [insight, setInsight] = useState(initialInsight);
  const [trendFilter, setTrendFilter] = useState('Monthly');
  const [alert, setAlert] = useState({ show: false, message: '', type: '' });

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const res = await axios.get('/api/reviews/summary');
        setData(res.data?.data || []);
        setSentimentStats(res.data?.sentimentStats || null);
        setTrendData(res.data?.trendData || []);
        setInsight(res.data?.insight || null);
      } catch (err) {
        console.error('Error loading reviews:', err);
      }
    };

    fetchReviews();
    const interval = setInterval(fetchReviews, 15000);
    const onFocus = () => fetchReviews();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  // Custom Alert Function
  const showAlert = (message, type = 'success') => {
    setAlert({ show: true, message, type });
    setTimeout(() => setAlert({ show: false, message: '', type: '' }), 3000);
  };

  const exportToCSV = () => {
    if (data.length === 0) {
      showAlert("No data available to export at the moment.", "error");
      return;
    }
    
    try {
      const headers = ["Guest", "Room", "Service", "Cleanliness", "Food", "Value", "Feedback", "Date", "Status"];
      const csvContent = [
        headers.join(","),
        ...data.map(item => [
          item.guestName,
          item.room,
          item.ratings.service,
          item.ratings.clean,
          item.ratings.food,
          item.ratings.value,
          `"${item.content.replace(/"/g, '""')}"`,
          item.date,
          item.status
        ].join(","))
      ].join("\n");

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Hotel_Reviews_${new Date().toISOString().split('T')[0]}.csv`);
      link.click();
      
      showAlert("Report exported successfully! Check your downloads.");
    } catch (err) {
      showAlert("Failed to export report. Please try again.", "error");
    }
  };

  return (
    <div className="p-8 bg-[#F9F8F3] min-h-screen font-sans text-slate-800 relative">
      
      {/* CUSTOM TOAST ALERT */}
      {alert.show && (
        <div className={`fixed top-10 right-10 z-50 flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl border animate-in slide-in-from-right duration-300 ${
          alert.type === 'success' 
          ? 'bg-white border-green-100 text-green-800' 
          : 'bg-white border-red-100 text-red-800'
        }`}>
          {alert.type === 'success' ? <CheckCircle2 className="text-green-500 w-5 h-5" /> : <XCircle className="text-red-500 w-5 h-5" />}
          <span className="font-medium">{alert.message}</span>
        </div>
      )}

      {/* Header Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-serif font-bold text-[#1A1A1A]">Reputation Management</h1>
        <p className="text-slate-500 mt-1 text-sm">Monitor and analyze guest satisfaction across all platforms.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Overall Sentiment Card */}
        <div className="bg-white p-7 rounded-3xl border border-[#E8E2D2] shadow-sm">
          <div className="flex items-center gap-2 mb-8">
            <Heart className="w-5 h-5 text-[#C5A358]" />
            <h2 className="font-bold text-slate-700">Overall Sentiment</h2>
          </div>
          
          <div className="flex flex-col items-center justify-center min-h-[160px] border-2 border-dashed border-[#F1EAD7] rounded-2xl bg-[#FCFAF5]">
            {sentimentStats ? (
              <div className="flex items-center gap-8 w-full px-6">
                {/* Circular Chart Placeholder */}
                <div className="relative w-24 h-24 flex items-center justify-center rounded-full border-8 border-slate-50 border-t-[#C5A358]">
                   <span className="font-bold text-xl">{sentimentStats.positive}%</span>
                </div>
                <div className="space-y-2 text-xs font-semibold">
                    <p className="text-[#C5A358]">POSITIVE: {sentimentStats.positive}%</p>
                    <p className="text-slate-400">NEUTRAL: {sentimentStats.neutral}%</p>
                    <p className="text-red-400">NEGATIVE: {sentimentStats.negative}%</p>
                </div>
              </div>
            ) : (
              <>
                <div className="w-12 h-12 rounded-full border-4 border-slate-100 border-t-[#C5A358] animate-spin mb-3"></div>
                <p className="text-slate-400 text-xs font-medium italic">Analyzing guest emotions...</p>
              </>
            )}
          </div>

          <div className="mt-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-4">Live Key Themes</p>
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1.5 bg-slate-50 text-slate-400 text-[10px] rounded-full italic border border-slate-100">
                Awaiting more feedback...
              </span>
            </div>
          </div>
        </div>

        {/* Rating Trends Card */}
        <div className="lg:col-span-2 bg-white p-7 rounded-3xl border border-[#E8E2D2] shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#C5A358]" />
              <h2 className="font-bold text-slate-700">Rating Trends</h2>
            </div>
            <div className="flex p-1 bg-slate-50 rounded-xl">
              {['Weekly', 'Monthly', 'Yearly'].map((type) => (
                <button 
                  key={type}
                  onClick={() => setTrendFilter(type)}
                  className={`px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all ${
                    trendFilter === type 
                    ? 'bg-white text-[#C5A358] shadow-sm' 
                    : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
          
          <div className="h-56 flex flex-col items-center justify-center border-2 border-dashed border-[#F1EAD7] rounded-2xl bg-[#FCFAF5]">
            {trendData.length > 0 ? (
               <div className="w-full h-full p-4">{/* Chart bars */}</div>
            ) : (
              <>
                <BarChart3 className="w-8 h-8 text-[#E8E2D2] mb-2" />
                <p className="text-slate-400 text-xs font-medium italic">No historical data found for {trendFilter} view.</p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Correlation Insight Banner */}
      <div className="bg-white border border-[#E8E2D2] p-5 rounded-2xl mb-10 flex items-center gap-5 shadow-sm overflow-hidden relative group">
        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#C5A358]"></div>
        <div className="bg-[#FEF9EC] p-3 rounded-xl">
          <TrendingUp className="w-5 h-5 text-[#C5A358]" />
        </div>
        <div>
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#C5A358] mb-0.5">Smart Correlation Analysis</h4>
          {insight ? (
            <p className="text-sm text-slate-700 font-medium">{insight}</p>
          ) : (
            <p className="text-sm text-slate-400 italic">Gathering more data points to identify service patterns...</p>
          )}
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-3xl border border-[#E8E2D2] shadow-sm overflow-hidden">
        <div className="p-7 border-b border-slate-50 flex justify-between items-center bg-white">
          <h2 className="font-bold text-lg text-slate-800 font-serif">Customer Feedback Logs</h2>
          <button 
            onClick={exportToCSV}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#C5A358] text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-[#B49247] transition-all shadow-md shadow-amber-100 active:scale-95"
          >
            <Download className="w-4 h-4 text-white" /> Export CSV
          </button>
        </div>

        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#FCFAF5] text-[10px] uppercase tracking-[0.15em] text-slate-400 font-bold border-b border-[#F1EAD7]">
              <tr>
                <th className="px-8 py-5">Customer Information</th>
                <th className="px-8 py-5">Category Ratings</th>
                <th className="px-8 py-5">Guest Experience</th>
                <th className="px-8 py-5">Date</th>
                <th className="px-8 py-5">Status</th>
                <th className="px-8 py-5 text-center">Manage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.length > 0 ? (
                data.map((review, idx) => (
                   <tr key={idx}>{/* Same row logic as before */}</tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center opacity-40">
                      <MessageSquare className="w-10 h-10 mb-2" />
                      <p className="text-sm font-medium italic">No recent guest feedback found in the database.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Reviews;
