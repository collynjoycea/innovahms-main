import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp,
  Activity, Play, Download, RefreshCw, AlertTriangle, Search, FileText, CheckCircle2, ArrowLeft, Filter
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const pesoFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  maximumFractionDigits: 2,
});

const formatPeso = (value) => {
  if (value === null || value === undefined || value === '') return '--';
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? pesoFormatter.format(numericValue) : '--';
};

const formatSimulationMetric = (value, type = 'percent') => {
  if (value === null || value === undefined || value === '') return '--';

  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return '--';

  if (type === 'currency') {
    const sign = numericValue > 0 ? '+' : '';
    return `${sign}${pesoFormatter.format(numericValue)}`;
  }

  const sign = numericValue > 0 ? '+' : '';
  return `${sign}${numericValue.toFixed(1)}%`;
};

const toSearchable = (value) => String(value ?? '').toLowerCase();

const Reports = () => {
  const ownerSession = (() => {
    try {
      return JSON.parse(localStorage.getItem('ownerSession') || '{}');
    } catch {
      return {};
    }
  })();
  const ownerId = ownerSession?.id;
  const [data, setData] = useState(null);
  const [logs, setLogs] = useState([]);
  const [simValue, setSimValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showSimAlert, setShowSimAlert] = useState(false);
  
  // --- NEW STATES FOR NAVIGATION & FILTERING ---
  const [currentView, setCurrentView] = useState("dashboard"); // dashboard | table-view
  const [activeCategory, setActiveCategory] = useState(null);
  const [roomTypeFilter, setRoomTypeFilter] = useState("All");

  useEffect(() => {
    fetchReportData();
    const interval = setInterval(fetchReportData, 15000);
    const onFocus = () => fetchReportData();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const [resStats, resLogs] = await Promise.all([
        axios.get('/api/reports/full-stats', { params: ownerId ? { owner_id: ownerId } : {} }),
        axios.get('/api/reports/transactions', { params: ownerId ? { owner_id: ownerId } : {} })
      ]);
      setData(resStats.data);
      setLogs(resLogs.data);
    } catch (err) {
      console.error("Error loading dynamic reports", err);
    } finally {
      setLoading(false);
    }
  };

  // --- FUNCTIONAL EXPORTS ---
  
  const exportCSV = () => {
    const headers = ["Event,Customer,Value,Status,Time\n"];
    const rows = logs.map(log => `${log.event},${log.user},${log.value},${log.status},${log.time}\n`);
    const blob = new Blob([...headers, ...rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `Transaction_Report_${new Date().toLocaleDateString()}.csv`);
    a.click();
  };

  const exportPDF = () => {
  try {
    const doc = new jsPDF();
    const safeLogs = logs || [];

    doc.setFillColor(245, 158, 11); 
    doc.rect(0, 0, 210, 2, 'F'); 

    doc.setTextColor(15, 23, 42); 
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text("VELORA", 14, 20);
    
    doc.setFillColor(245, 158, 11);
    doc.circle(53, 18, 1, 'F');

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(150, 150, 150);
    doc.text("PREMIUM ANALYTICS REPORT", 14, 28);

    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`ISSUED: ${new Date().toLocaleDateString()}`, 160, 20);
    doc.text(`REF: ${new Date().getTime()}`, 160, 25);

    const tableColumn = ["EVENT TYPE", "CUSTOMER / STAFF", "VALUE", "STATUS", "TIMESTAMP"];
    const tableRows = safeLogs.map(log => [
      String(log.event || 'N/A').toUpperCase(), 
      String(log.user || 'SYSTEM'), 
      String(log.value || '-'), 
      String(log.status || 'N/A').toUpperCase(), 
      String(log.time || '---')
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 40,
      theme: 'plain',
      headStyles: { 
        fillColor: [255, 255, 255],
        textColor: [245, 158, 11],
        fontSize: 8,
        fontStyle: 'bold',
        halign: 'left',
        lineWidth: { bottom: 0.5 },
        lineColor: { bottom: [245, 158, 11] }
      },
      bodyStyles: { 
        fontSize: 8,
        textColor: [71, 85, 105],
        cellPadding: 6
      },
      columnStyles: {
        2: { fontStyle: 'bold', textColor: [15, 23, 42] },
        3: { fontStyle: 'bold' }
      },
      didDrawCell: (data) => {
        if (data.section === 'body' && data.column.index === 3) {
          const status = data.cell.raw;
          if (status === 'CONFIRMED' || status === 'SUCCESS') {
            doc.setTextColor(34, 197, 94);
          } else if (status === 'ALERT') {
            doc.setTextColor(239, 68, 68);
          }
        }
      },
      margin: { left: 14, right: 14 }
    });

    const pageCount = doc.internal.getNumberOfPages();
    doc.setFontSize(7);
    doc.setTextColor(180, 180, 180);
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.text(`Hotel Velora Luxury Residences - Confidential Document - Page ${i} of ${pageCount}`, 105, 285, { align: "center" });
    }

    doc.save(`Velora_Gold_Report_${new Date().getTime()}.pdf`);

  } catch (err) {
    console.error("PDF Design Error:", err);
    alert("Technical issue with Gold PDF styling.");
  }
};

  const handleRunSimulation = () => {
    setShowSimAlert(true);
    axios.post('/api/reports/simulate', { delta: simValue, owner_id: ownerId })
      .then((res) => {
        setData((prev) => ({
          ...(prev || {}),
          simulation_results: res.data || {},
        }));
      })
      .catch(() => null);
    setTimeout(() => setShowSimAlert(false), 4000);
  };

  const filteredLogs = useMemo(() => {
    return logs.filter(log => 
      toSearchable(log.event).includes(searchTerm.toLowerCase()) ||
      toSearchable(log.user).includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, logs]);

  // --- NEW DYNAMIC TABLE DATA LOGIC ---
  const dynamicTableData = useMemo(() => {
    if (!activeCategory || !data?.details) return [];
    const list = data.details[activeCategory] || [];
    return list.filter(item => {
      const matchesSearch = [
        item.customerName,
        item.customerId,
        item.roomId,
        item.hotelId,
        item.status,
      ].some(value => toSearchable(value).includes(searchTerm.toLowerCase()));
      const matchesRoom = roomTypeFilter === "All" ? true : item.roomType === roomTypeFilter;
      return matchesSearch && matchesRoom;
    });
  }, [data, activeCategory, searchTerm, roomTypeFilter]);

  const handleCardClick = (categoryKey) => {
    setActiveCategory(categoryKey);
    setSearchTerm("");
    setCurrentView("table-view");
  };

  if (loading) return (
    <div className="flex h-screen flex-col items-center justify-center bg-[#F8F9FA] dark:bg-transparent">
       <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
       <p className="text-slate-500 font-black uppercase tracking-[0.3em] animate-pulse text-xs">Initializing AI Engine</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8F9FA] p-8 font-sans text-slate-700 dark:bg-transparent dark:text-slate-100">
      
      {/* CUSTOM ANIMATED ALERT */}
      <AnimatePresence>
        {showSimAlert && (
          <motion.div 
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 20, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
              className="fixed top-0 left-1/2 z-[99] flex -translate-x-1/2 items-center gap-4 rounded-2xl border border-slate-700 bg-slate-900 px-6 py-4 text-white shadow-2xl"
          >
            <div className="p-2 bg-blue-500 rounded-lg animate-pulse"><RefreshCw size={18} /></div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-blue-400">Simulation Active</p>
              <p className="text-sm font-bold">Recalculating metrics for {simValue}% price delta...</p>
            </div>
            <div className="ml-4 h-1 w-12 bg-slate-700 rounded-full overflow-hidden">
               <motion.div initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ duration: 4 }} className="h-full bg-blue-500" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER WITH BACK NAVIGATION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div className="flex items-center gap-4">
          {currentView === "table-view" && (
            <button 
              onClick={() => setCurrentView("dashboard")}
              className="group rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-all hover:bg-slate-50 dark:border-white/10 dark:bg-[#11151d] dark:hover:bg-white/5"
            >
              <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
              {currentView === "dashboard" ? "Advanced Analytics" : activeCategory?.replace(/_/g, ' ')}
            </h1>
            <p className="mt-1 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              {currentView === "dashboard" ? "Live forecasting and behavioral monitoring." : "Viewing detailed records."}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={exportCSV} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-black uppercase tracking-widest text-slate-600 shadow-sm transition-all hover:bg-slate-50 dark:border-white/10 dark:bg-[#11151d] dark:text-slate-200 dark:shadow-none dark:hover:bg-white/5">
            <Download size={14}/> CSV
          </button>
          <button onClick={exportPDF} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-black uppercase tracking-widest text-slate-600 shadow-sm transition-all hover:bg-slate-50 dark:border-white/10 dark:bg-[#11151d] dark:text-slate-200 dark:shadow-none dark:hover:bg-white/5">
            <FileText size={14}/> PDF
          </button>
          <button onClick={fetchReportData} className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black hover:bg-slate-800 shadow-lg shadow-slate-200 transition-all uppercase tracking-widest">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""}/> Sync
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {currentView === "dashboard" ? (
          <motion.div key="dash" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {/* SECTION 1: Dynamic Top Metrics (Added onClick) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
              <StatCard title="Total Reservations" value={data?.summary?.total_res} change={data?.summary?.res_change} isUp={true} onClick={() => handleCardClick("total_reservations")} />
              <StatCard title="Today's Check-ins" value={data?.summary?.today_checkins} sub={`${data?.summary?.pending || 0} pending arrivals`} onClick={() => handleCardClick("today_checkins")} />
              <StatCard title="Available Rooms" value={data?.summary?.available} sub={`${data?.summary?.occupancy || 0}% Occupancy`} highlight onClick={() => handleCardClick("available_rooms")} />
              <StatCard title="Today's Check-outs" value={data?.summary?.today_checkouts} live onClick={() => handleCardClick("today_checkouts")} />
            </div>

            {/* SECTION 2: Logs & Operational Data */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-10">
              <div className="xl:col-span-2">
                <div className="rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-[#11151d] dark:shadow-none">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
                    <h3 className="text-lg font-black text-slate-900 flex items-center gap-2 uppercase tracking-tight">
                      <Activity size={20} className="text-blue-600"/> Real-time Logs
                    </h3>
                    <div className="relative w-full sm:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                        type="text" 
                        placeholder="Search guest or event..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full rounded-xl border border-slate-100 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/5 dark:border-white/10 dark:bg-[#0d1118] dark:text-slate-200 dark:focus:bg-[#11151d]" 
                      />
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:border-white/10 dark:text-slate-500">
                          <th className="text-left pb-4">Event Type</th>
                          <th className="text-left pb-4">Staff</th>
                          <th className="text-left pb-4">Value</th>
                          <th className="text-left pb-4">Status</th>
                          <th className="text-right pb-4">Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 dark:divide-white/10">
                        {filteredLogs.map((log, i) => (
                          <tr key={i} className="group transition-colors hover:bg-slate-50/50 dark:hover:bg-white/[0.03]">
                            <td className="py-4 font-bold text-slate-800 dark:text-white">{log.event}</td>
                            <td className="py-4 text-blue-600 font-semibold group-hover:underline cursor-pointer">{log.user}</td>
                            <td className="py-4 font-black text-slate-900 dark:text-slate-100">{log.value}</td>
                            <td className="py-4">
                              <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-tighter ${
                                log.status === 'CONFIRMED' || log.status === 'SUCCESS' ? 'bg-green-100 text-green-600' : 
                                log.status === 'ALERT' || log.status === 'STOCK OUT' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                              }`}>{log.status}</span>
                            </td>
                            <td className="py-4 text-right font-medium text-slate-400 dark:text-slate-500">{log.time}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <OperationalCard 
                  title="Inventory Alert" 
                  alert={data?.operational?.inventory?.stock} 
                  alertItem={data?.operational?.inventory?.item} 
                />
                <OperationalCard 
                  title="Payroll & Attendance" 
                  sub={data?.operational?.staff?.next_date ? `Next Distribution: ${data.operational.staff.next_date}` : "Next Distribution: --"} 
                  val={formatPeso(data?.operational?.staff?.payroll)} 
                  percentage={data?.operational?.staff?.attendance ?? null} 
                  label="Attendance Rate" 
                />
              </div>
            </div>

            {/* SECTION 3: Simulation Engine */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative overflow-hidden rounded-[3rem] border border-slate-200 bg-white p-10 shadow-sm dark:border-white/10 dark:bg-[#11151d] dark:shadow-none"
            >
              <div className="flex items-center gap-4 mb-10">
                <div className="p-4 bg-amber-100 text-amber-600 rounded-2xl shadow-inner"><Play size={24} fill="currentColor"/></div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase">Simulation Engine</h3>
                  <p className="text-sm text-slate-500 font-medium italic">"What-if" analysis for pricing strategy.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
                <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8">Scenario Params</p>
                  <div className="mb-10">
                    <label className="text-xs font-black text-slate-700 block mb-6 uppercase tracking-wider">Price Delta ({simValue}%)</label>
                    <input 
                      type="range" min="-50" max="50" value={simValue}
                      className="w-full accent-slate-900 h-1.5"
                      onChange={(e) => setSimValue(parseInt(e.target.value))}
                    />
                    <div className="flex justify-between text-[10px] font-bold text-slate-400 mt-4">
                      <span>-50%</span><span>BASE</span><span>+50%</span>
                    </div>
                  </div>
                  <button 
                    onClick={handleRunSimulation}
                    className="w-full py-4 bg-amber-500 text-white font-black rounded-2xl shadow-xl shadow-amber-200 hover:bg-amber-600 hover:-translate-y-1 active:translate-y-0 transition-all uppercase tracking-widest text-xs"
                  >
                    Run Simulation
                  </button>
                </div>

                <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <SimBox title="Revenue Impact" value={formatSimulationMetric(data?.simulation_results?.revenue, "currency")} status="Forecasted Delta" color="green" />
                  <SimBox title="Occupancy" value={formatSimulationMetric(data?.simulation_results?.occupancy)} status="Predicted Volume" color="blue" />
                  <SimBox title="Workload" value={formatSimulationMetric(data?.simulation_results?.workload)} status="Staffing Needs" color="amber" warning />
                  <SimBox title="Supply Chain" value={formatSimulationMetric(data?.simulation_results?.velocity)} status="Stock Burn Rate" color="slate" />
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : (
          /* NEW SECTION: TABLE VIEW FOR CARDS */
          <motion.div key="table" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <div className="rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-[#11151d] dark:shadow-none">
              <div className="flex flex-col lg:flex-row justify-between items-center gap-6 mb-10">
                <div className="relative w-full lg:w-96">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="Search by Name or ID..." 
                    className="w-full rounded-2xl border border-slate-100 bg-slate-50 py-3.5 pl-12 pr-4 text-sm outline-none transition-all focus:bg-white focus:ring-4 focus:ring-blue-500/5 dark:border-white/10 dark:bg-[#0d1118] dark:text-slate-200 dark:focus:bg-[#11151d]" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-4 py-2 dark:border-white/10 dark:bg-[#0d1118]">
                    <Filter size={14} className="text-slate-400" />
                    <select 
                      onChange={(e) => setRoomTypeFilter(e.target.value)}
                      className="bg-transparent text-[10px] font-black uppercase outline-none cursor-pointer"
                    >
                      <option value="All">All Room Types</option>
                      <option value="Single">Single</option>
                      <option value="Double">Double</option>
                      <option value="Suite">Suite</option>
                      <option value="Deluxe">Deluxe</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:border-white/10 dark:text-slate-500">
                      <th className="pb-6">Hotel ID</th>
                      <th className="pb-6">Room ID</th>
                      <th className="pb-6">Customer ID</th>
                      <th className="pb-6">Name</th>
                      <th className="pb-6">Status</th>
                      <th className="pb-6">Check-in</th>
                      <th className="pb-6">Check-out</th>
                      <th className="pb-6 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-white/10">
                    {dynamicTableData.map((row, i) => (
                      <tr key={i} className="group transition-colors hover:bg-slate-50 dark:hover:bg-white/[0.03]">
                        <td className="py-5 font-bold text-slate-500 dark:text-slate-400">{row.hotelId}</td>
                        <td className="py-5 font-bold text-slate-900 dark:text-white">{row.roomId}</td>
                        <td className="py-5 font-black text-blue-600">{row.customerId ?? '--'}</td>
                        <td className="py-5 font-black uppercase text-slate-800 dark:text-white">{row.customerName}</td>
                        <td className="py-5 font-medium text-slate-500 dark:text-slate-400">{row.status || '--'}</td>
                        <td className="py-5 font-medium text-slate-500 dark:text-slate-400">{row.checkInDate || '--'}</td>
                        <td className="py-5 font-medium text-slate-500 dark:text-slate-400">{row.checkOutDate || '--'}</td>
                        <td className="py-5 text-right font-black text-slate-900 dark:text-white">{formatPeso(row.totalAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {dynamicTableData.length === 0 && (
                  <div className="py-20 text-center text-xs font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">No records found for this category</div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- SUB-COMPONENTS ---

const StatCard = ({ title, value, change, sub, isUp, live, highlight, onClick }) => (
  <div 
    onClick={onClick}
    className={`cursor-pointer rounded-[2rem] border bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md dark:bg-[#11151d] dark:shadow-none dark:hover:shadow-none ${highlight ? 'border-blue-500 shadow-blue-50 dark:border-blue-500/40' : 'border-slate-100 dark:border-white/10'}`}
  >
    <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">{title}</p>
    <div className="flex items-center gap-3">
      <h2 className="text-3xl font-black tracking-tighter text-slate-900 dark:text-white">{value ?? 0}</h2>
      {change && (
        <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg flex items-center gap-1 ${isUp ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
          <TrendingUp size={10} /> {change}
        </span>
      )}
      {live && (
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[9px] font-black text-blue-500 uppercase">Live</span>
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping"></div>
        </div>
      )}
    </div>
    {sub && <p className="mt-2 text-xs font-bold uppercase tracking-tight text-slate-400 dark:text-slate-500">{sub}</p>}
  </div>
);

const OperationalCard = ({ title, alert, alertItem, sub, val, percentage, label }) => {
  const isInventory = title === "Inventory Alert";
  const numericAlert = Number(alert ?? 0);
  const numericPercentage = Number.isFinite(Number(percentage)) ? Number(percentage) : null;
  
  return (
    <div className="rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-sm transition-all hover:shadow-md dark:border-white/10 dark:bg-[#11151d] dark:shadow-none dark:hover:shadow-none">
      <h4 className="mb-6 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">{title}</h4>
      {isInventory ? (
        <div className={`rounded-2xl border p-5 ${numericAlert > 0 && numericAlert < 30 ? 'bg-red-50 border-red-100 dark:bg-red-500/10 dark:border-red-500/20' : 'bg-slate-50 border-slate-100 dark:bg-[#0d1118] dark:border-white/10'}`}>
          <div className="flex justify-between items-center mb-1">
            <span className={`text-[10px] font-black uppercase tracking-wider ${numericAlert > 0 && numericAlert < 30 ? 'text-red-600' : 'text-slate-500'}`}>
              {numericAlert > 0 && numericAlert < 30 ? 'Critical Stock' : 'Stock Level'}
            </span>
            <span className={`text-[10px] font-black px-3 py-1 rounded-lg ${numericAlert > 0 && numericAlert < 30 ? 'bg-red-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
              {alert ?? '--'} LEFT
            </span>
          </div>
          <p className="text-sm font-black uppercase text-slate-800 dark:text-white">{alertItem || 'No Alerts'}</p>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex justify-between items-end">
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500">{label}</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white">{numericPercentage === null ? '--' : `${numericPercentage}%`}</p>
            </div>
            <p className="text-sm font-black text-slate-800 dark:text-slate-200">{val}</p>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-[#0d1118]">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${numericPercentage ?? 0}%` }}
              transition={{ duration: 1 }}
              className={`h-full ${(numericPercentage ?? 0) > 90 ? 'bg-green-500' : 'bg-amber-500'}`}
            />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-tight text-slate-400 dark:text-slate-500">{sub}</p>
        </div>
      )}
    </div>
  );
};

const SimBox = ({ title, value, status, color, warning }) => {
  const themes = {
    green: 'bg-green-50 text-green-600 border-green-100',
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    slate: 'bg-slate-50 text-slate-600 border-slate-100'
  };
  return (
    <div className={`rounded-[2rem] border p-6 shadow-sm transition-all hover:scale-[1.02] dark:shadow-none ${themes[color]}`}>
      <div className="flex justify-between items-start mb-4">
        <p className="text-[10px] font-black uppercase tracking-widest opacity-70">{title}</p>
        {warning && <AlertTriangle size={16} className="animate-bounce" />}
      </div>
      <h4 className="text-2xl font-black tracking-tight">{value || '--'}</h4>
      <p className="text-[10px] font-black mt-2 uppercase tracking-wider opacity-60 flex items-center gap-1">
        <CheckCircle2 size={10} /> {status}
      </p>
    </div>
  );
};

export default Reports;
