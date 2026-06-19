import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, ScanLine, SearchCheck, CalendarDays, ShieldAlert, CheckCircle2, XCircle, AlertTriangle, Loader2, Factory, Users, Activity, Keyboard, ScanBarcode } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { useHR } from '../context/HRContext';

const toneMap = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  error: 'border-rose-200 bg-rose-50 text-rose-800',
  warn: 'border-amber-200 bg-amber-50 text-amber-800',
  info: 'border-slate-200 bg-slate-50 text-slate-700'
};

function ScanBadge({ status, text }) {
  const icon =
    status === 'success' ? <CheckCircle2 className="h-4 w-4" /> :
    status === 'error' ? <XCircle className="h-4 w-4" /> :
    status === 'warn' ? <AlertTriangle className="h-4 w-4" /> : null;

  return (
    <div className={`rounded-none border px-4 py-3 text-sm ${toneMap[status] || toneMap.info}`}>
      <div className="flex items-center gap-2 font-semibold capitalize">
        {icon}
        {status || 'info'}
      </div>
      <div className="mt-1">{text || 'System is ready.'}</div>
    </div>
  );
}

function HallStatusCard({ hall }) {
  const count = Number(hall?.used ?? hall?.count ?? 0);
  const capacity = Number(hall?.capacity ?? 0);
  const safeCount = Number.isFinite(count) && count >= 0 ? count : 0;
  const safeCapacity = Number.isFinite(capacity) && capacity > 0 ? capacity : 0;
  const occupancy = safeCapacity > 0 ? Math.round((safeCount / safeCapacity) * 100) : 0;
  const status = safeCapacity === 0 ? 'ok' : occupancy >= 100 ? 'full' : occupancy >= 75 ? 'filling' : 'ok';
  const meta = {
    full: { label: 'Full', cls: 'bg-rose-100 text-rose-700 border-rose-200', icon: XCircle },
    filling: { label: 'Filling', cls: 'bg-amber-100 text-amber-700 border-amber-200', icon: AlertTriangle },
    ok: { label: 'Open', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2 }
  }[status];
  const Icon = meta.icon;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Factory className="h-4 w-4 text-slate-500" />
            {hall?.name || 'Unknown Hall'}
          </div>
          <div className="mt-1 text-xs text-slate-500">{hall?.location || 'Production floor'}</div>
        </div>
        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${meta.cls}`}>
          <Icon className="h-3.5 w-3.5" />
          {meta.label}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-lg bg-slate-50 p-3">
          <div className="text-xs text-slate-500">Capacity</div>
          <div className="mt-1 font-semibold text-slate-900">{safeCount}/{safeCapacity}</div>
        </div>
        <div className="rounded-lg bg-slate-50 p-3">
          <div className="text-xs text-slate-500">Occupancy</div>
          <div className="mt-1 font-semibold text-slate-900">{occupancy}%</div>
        </div>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${status === 'full' ? 'bg-rose-500' : status === 'filling' ? 'bg-amber-500' : 'bg-emerald-500'}`}
          style={{ width: `${Math.min(100, occupancy)}%` }}
        />
      </div>
    </div>
  );
}

export default function ScannerPanel() {
  const { state, setSelectedDate, processEntry, checkEligibility, overrideEntry, lastMessage, totals, canOverride, hallSummary, entriesForSelectedDate } = useHR();

  const [mode, setMode] = useState('scan');
  const [code, setCode] = useState('');
  const [preview, setPreview] = useState(null);
  const [cameraMode, setCameraMode] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [feedback, setFeedback] = useState({ status: 'info', text: 'System is ready.' });
  const [processing, setProcessing] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);

  const scannerRef = useRef(null);
  const isSubmittingRef = useRef(false);
  const lastScanRef = useRef('');
  const lastScanTimeRef = useRef(0);
  const resumeTimerRef = useRef(null);
  const handledCodesRef = useRef(new Set());

  const canScan = useMemo(() => !totals.locked, [totals.locked]);

  useEffect(() => {
    handledCodesRef.current = new Set(entriesForSelectedDate.map((e) => String(e.code).trim()));
  }, [entriesForSelectedDate]);

  const halls = Array.isArray(hallSummary) ? hallSummary : [];
  const fullHalls = halls.filter((h) => h?.full);
  const fillingHalls = halls.filter((h) => !h?.full && (Number(h?.used ?? 0) / Math.max(Number(h?.capacity ?? 0), 1)) >= 0.75);
  const activeHalls = [...fullHalls, ...fillingHalls];

  const beep = (type = 'success') => {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = type === 'success' ? 880 : 220;
      gain.gain.value = 0.07;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
      osc.onended = () => ctx.close();
    } catch {}
  };

  const showFeedback = (status, text) => setFeedback({ status, text });

  const stopCamera = async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    if (resumeTimerRef.current) {
      clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = null;
    }
    setCameraMode(false);
    if (scanner) {
      try { await scanner.stop(); } catch {}
      try { await scanner.clear(); } catch {}
    }
  };

  const handlePreview = () => {
    const value = code.trim();
    if (!value) return;
    const result = checkEligibility(value);
    setPreview(result);
    if (result?.duplicate) showFeedback('warn', 'Already scanned / duplicate entry.');
    else showFeedback('info', 'Preview loaded.');
  };

  const handleSubmit = async (value = code, source = 'manual') => {
    const trimmed = String(value).trim();
    if (!trimmed || isSubmittingRef.current) return;

    if (handledCodesRef.current.has(trimmed)) {
      setPreview(null);
      setCode('');
      beep('error');
      showFeedback('warn', 'Already scanned / duplicate entry.');
      return;
    }

    isSubmittingRef.current = true;
    setProcessing(true);
    setScanSuccess(false);

    try {
      const result = await processEntry(trimmed);
      setPreview(null);
      setCode('');

      if (result?.ok) {
        handledCodesRef.current.add(trimmed);
        setScanSuccess(true);
        showFeedback('success', source === 'camera' ? 'Verified. Scan saved successfully.' : 'Verified. Entry saved successfully.');
        beep('success');

        if (source === 'camera') {
          const scanner = scannerRef.current;
          if (scanner) {
            try { await scanner.pause(true); } catch {}
          }
          setTimeout(() => { stopCamera(); }, 450);
        }
      } else {
        beep('error');
        if (result?.duplicate) showFeedback('warn', 'Already scanned / duplicate entry.');
        else showFeedback('error', result?.text || 'Scan failed.');
      }
    } finally {
      setProcessing(false);
      isSubmittingRef.current = false;
    }
  };

  const handleQuickOverride = async () => {
    const value = code.trim();
    if (!value) return;

    const result = checkEligibility(value);
    if (result?.ok) return;

    const employee = result?.employee;
    if (!employee) return;

    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const ok = await overrideEntry({
      code: employee.code,
      name: employee.name,
      shift: employee.shift,
      weekOff: employee.weekOff,
      time,
      overrideReason: result?.text || 'HR override',
      hallName: 'HR Override',
      overriddenBy: 'HR'
    });

    if (ok) {
      handledCodesRef.current.add(String(employee.code).trim());
      setCode('');
      setPreview(null);
      beep('success');
      setScanSuccess(true);
      showFeedback('success', 'Verified by HR override.');
    } else {
      beep('error');
      showFeedback('error', 'Override failed.');
    }
  };

  useEffect(() => {
    if (!code) return;
    const trimmed = code.trim();
    if (!trimmed) return;
    if (mode === 'scan') handleSubmit(trimmed, 'manual');
  }, [code]);

  useEffect(() => {
    let mounted = true;

    const startCamera = async () => {
      if (!cameraMode || !canScan || mode !== 'scan') return;

      setCameraError('');
      setScanSuccess(false);

      try {
        const scanner = new Html5Qrcode('hr-camera-reader');
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 260, height: 130 }, continuous: true },
          async (decodedText) => {
            const scanned = String(decodedText).trim();
            if (!scanned || processing || isSubmittingRef.current) return;

            const now = Date.now();
            if (lastScanRef.current === scanned && now - lastScanTimeRef.current < 1200) return;

            lastScanRef.current = scanned;
            lastScanTimeRef.current = now;

            if (handledCodesRef.current.has(scanned)) {
              beep('error');
              showFeedback('warn', 'Already scanned / duplicate entry.');
              setScanSuccess(false);
              try { await scanner.pause(true); } catch {}
              setTimeout(() => {
                if (scannerRef.current && cameraMode) scannerRef.current.resume().catch(() => {});
              }, 700);
              return;
            }

            showFeedback('warn', `Scan detected: ${scanned}`);
            setCode(scanned);
            handleSubmit(scanned, 'camera');
          },
          () => {}
        );

        if (mounted) showFeedback('info', 'Camera started. Point at barcode to scan.');
      } catch (err) {
        if (mounted) {
          setCameraError(err?.message || 'Camera could not be started.');
          setCameraMode(false);
        }
      }
    };

    startCamera();

    return () => {
      mounted = false;
      const scanner = scannerRef.current;
      scannerRef.current = null;
      lastScanRef.current = '';
      lastScanTimeRef.current = 0;
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
      if (scanner) scanner.stop().catch(() => {}).finally(() => scanner.clear().catch(() => {}));
    };
  }, [cameraMode, canScan, processing, mode]);

  return (
    <div className="card overflow-hidden">
      <div className="border-b border-slate-200 bg-white px-5 py-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Instant Entry Scanner</h2>
            <p className="mt-1 text-sm text-slate-500">Scan mode aur manual mode dono available hain.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className={`btn-secondary ${cameraMode && mode === 'scan' ? 'border-brand-600 bg-brand-50 text-brand-700' : ''}`}
              onClick={() => {
                setMode('scan');
                setCameraMode((prev) => !prev);
              }}
              disabled={!canScan || processing}
            >
              <ScanBarcode className="h-4 w-4" />
              {cameraMode && mode === 'scan' ? 'Stop Scan' : 'Scan Mode'}
            </button>

            <button
              type="button"
              className={`btn-secondary ${mode === 'manual' ? 'border-brand-600 bg-brand-50 text-brand-700' : ''}`}
              onClick={() => {
                setMode((prev) => (prev === 'manual' ? 'scan' : 'manual'));
                setCameraMode(false);
              }}
              disabled={processing}
            >
              <Keyboard className="h-4 w-4" />
              {mode === 'manual' ? 'Manual Mode' : 'Manual Type'}
            </button>

            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-slate-400" />
              <input
                type="date"
                value={state.selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="input max-w-[180px]"
                disabled={!canScan || processing}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-5">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_420px]">
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto_auto_auto]">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder={mode === 'manual' ? 'Type punch code manually' : 'Scan barcode or enter punch code'}
                className="input"
                disabled={!canScan || processing}
              />
              <button className="btn-secondary" onClick={handlePreview} disabled={!canScan || processing} type="button">
                <SearchCheck className="h-4 w-4" />
                Check
              </button>
              <button className="btn-primary" onClick={() => handleSubmit()} disabled={!canScan || processing} type="button">
                {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanLine className="h-4 w-4" />}
                {processing ? 'Processing...' : 'Process Entry'}
              </button>
              <button
                className={`btn-secondary ${canOverride ? 'border-amber-200 bg-amber-50 text-amber-700' : 'opacity-60'}`}
                onClick={handleQuickOverride}
                disabled={!canScan || !canOverride || processing}
                type="button"
              >
                <ShieldAlert className="h-4 w-4" />
                HR Override
              </button>
            </div>

            <div className="rounded-none border border-slate-200 bg-white p-3">
              <div id="hr-camera-reader" className="min-h-[240px] w-full overflow-hidden rounded-md bg-slate-950" />
            </div>

            <ScanBadge status={feedback.status} text={feedback.text} />

            {scanSuccess && (
              <div className="rounded-none border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                <div className="flex items-center gap-2 font-semibold">
                  <CheckCircle2 className="h-4 w-4" />
                  Verified
                </div>
                <div className="mt-1">Scan completed and saved successfully.</div>
              </div>
            )}

            {preview && (
              <div className={`rounded-none border px-4 py-3 text-sm ${toneMap[preview.type] || toneMap.info}`}>
                <div className="font-semibold">Preview check</div>
                <div className="mt-1">{preview.text}</div>
                {preview.duplicate && <div className="mt-1 font-semibold text-amber-700">Already scanned / duplicate entry.</div>}
                {preview.canOverride && canOverride && preview.employee && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" className="btn-primary" onClick={handleQuickOverride}>
                      <ShieldAlert className="h-4 w-4" />
                      Save HR Override
                    </button>
                  </div>
                )}
              </div>
            )}

            {cameraError && (
              <div className="rounded-none border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                {cameraError}
              </div>
            )}

            {!canScan && (
              <div className="rounded-none border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                Hall capacity is full. Scan and manual entry are disabled.
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <Users className="h-4 w-4 text-slate-500" />
                    Hall Status
                  </div>
                  <div className="mt-1 text-xs text-slate-500">Live occupancy and saturation state</div>
                </div>
                <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  {activeHalls.length} alert{activeHalls.length === 1 ? '' : 's'}
                </div>
              </div>

              <div className="mt-4 space-y-3 max-h-[520px] overflow-auto pr-1">
                {halls.length ? (
                  halls.map((hall) => <HallStatusCard key={hall?.id || hall?.name} hall={hall} />)
                ) : (
                  <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                    No hall status data available.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Activity className="h-4 w-4 text-slate-500" />
                Quick Summary
              </div>
              <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                <div className="rounded-lg bg-slate-50 p-3">
                  <div className="text-xs text-slate-500">Total Halls</div>
                  <div className="mt-1 font-semibold text-slate-900">{halls.length}</div>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <div className="text-xs text-slate-500">Full</div>
                  <div className="mt-1 font-semibold text-rose-600">{fullHalls.length}</div>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <div className="text-xs text-slate-500">Filling</div>
                  <div className="mt-1 font-semibold text-amber-600">{fillingHalls.length}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}