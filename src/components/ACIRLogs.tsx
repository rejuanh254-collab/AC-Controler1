import React, { useState } from 'react';
import { Radio, Download, Send, RefreshCw, CheckCircle2, Shield } from 'lucide-react';
import { useSmartAC } from '../context/SmartACContext';

export const ACIRLogs: React.FC = () => {
  const { logs, ac, testIrBlast, language, t } = useSmartAC();
  const [testing, setTesting] = useState(false);

  const handleTestSignal = async () => {
    setTesting(true);
    await testIrBlast();
    setTimeout(() => setTesting(false), 1200);
  };

  const handleExportLogs = () => {
    const csv =
      'data:text/csv;charset=utf-8,' +
      ['Timestamp,Command,Brand,HexCode,Protocol,Source']
        .concat(
          logs.map(
            (l) =>
              `"${l.timestamp}","${l.command}","${l.brand}","${l.hexCode}","${l.protocol}","${l.source}"`
          )
        )
        .join('\n');
    const uri = encodeURI(csv);
    const a = document.createElement('a');
    a.href = uri;
    a.download = `coolhome_ac_ir_logs_${Date.now()}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with live Hex Code */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Radio className="w-4 h-4 text-cyan-400" />
              <span>{language === 'bn' ? 'বর্তমান ৩৮kHz আইআর প্যাকেট ও সিগন্যাল মনিটর' : 'Active 38kHz IR Signal Monitor'}</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {language === 'bn'
                ? 'এসিতে পাঠানো সর্বশেষ ইনফ্রারেড কোড ও ফার্মওয়্যার ডেসপ্যাচ লগ'
                : 'Raw infrared binary packets blasted to your physical AC unit via ESP32.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleTestSignal}
              disabled={testing}
              className="px-3.5 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-xs shadow-md transition-all active:scale-95 flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{testing ? 'Blasting IR...' : t.testIrBlast}</span>
            </button>
            <button
              onClick={handleExportLogs}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium border border-slate-700 transition-all flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Live Active Hex Code Display */}
        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-mono text-slate-500 tracking-wider">
              {t.lastIrHex} ({ac.brand})
            </span>
            <p className="text-base sm:text-lg font-mono font-bold text-cyan-300 tracking-wider">
              {ac.lastIrHex}
            </p>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-mono text-slate-500 block">Command Dispatched:</span>
            <span className="text-xs font-mono text-emerald-400 font-semibold">{ac.lastIrCommand}</span>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          {language === 'bn' ? 'সিগন্যাল ট্রাফিকের ইতিহাস' : 'Recent IR Transmission Audit Log'}
        </h4>

        <div className="divide-y divide-slate-800/80 max-h-96 overflow-y-auto">
          {logs.map((log) => {
            const timeStr = new Date(log.timestamp).toLocaleTimeString();
            const cmd = language === 'bn' ? log.commandBn || log.command : log.command;

            return (
              <div key={log.id} className="py-3 first:pt-0 last:pb-0 flex items-start justify-between gap-3 group">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0 mt-0.5 text-cyan-400">
                    <Radio className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-200 group-hover:text-white transition-colors">
                      {cmd}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500 mt-0.5">
                      <span className="text-cyan-400 font-bold">{log.brand}</span>
                      <span>·</span>
                      <span>{log.hexCode}</span>
                      <span>·</span>
                      <span>Source: {log.source}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[10px] font-mono text-slate-500 block">{timeStr}</span>
                  <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                    38kHz SENT
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
