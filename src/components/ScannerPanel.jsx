import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, ScanLine, SearchCheck, CalendarDays, ShieldAlert } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { useHR } from '../context/HRContext';

const toneMap = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  error: 'border-rose-200 bg-rose-50 text-rose-800',
  warn: 'border-amber-200 bg-amber-50 text-amber-800',
  info: 'border-slate-200 bg-slate-50 text-slate-700'
};

export default function ScannerPanel() {
  const {
    state,
    setSelectedDate,
    processEntry,
    checkEligibility,
    overrideEntry,
    lastMessage,
    totals,
    canOverride
  } = useHR();

  const [code, setCode] = useState('');
  const [preview, setPreview] = useState(null);
  const [cameraMode, setCameraMode] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const scannerRef = useRef(null);
  const lastScanRef = useRef('');

  const canScan = useMemo(() => !totals.locked, [totals.locked]);

  const playBeep = (type = 'success') => {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioContextClass();
      const oscillator = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = type === 'success' ? 880 : 220;
      gain.gain.value = 0.08;
      oscillator.connect(gain);
      gain.connect(audioCtx.destination);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.12);
      oscillator.onended = () => audioCtx.close();
    } catch {}
  };

  const handlePreview = () => {
    const value = code.trim();
    if (!value) return;
    setPreview(checkEligibility(value));
  };

  const handleSubmit = (value = code) => {
    const trimmed = String(value).trim();
    if (!trimmed) return;
    const result = processEntry(trimmed);
    setPreview(null);
    setCode('');
    if (result?.ok) playBeep('success');
    else playBeep('error');
  };

  const handleQuickOverride = () => {
    const value = code.trim();
    if (!value) return;
    const result = checkEligibility(value);
    if (result?.ok) return;

    const employee = result?.employee;
    if (!employee) return;

    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const ok = overrideEntry({
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
      setCode('');
      setPreview(null);
      playBeep('success');
    } else {
      playBeep('error');
    }
  };

  useEffect(() => {
    let mounted = true;

    const startCamera = async () => {
      if (!cameraMode || !canScan) return;
      setCameraError('');

      try {
        const scanner = new Html5Qrcode('hr-camera-reader');
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 240, height: 120 } },
          async (decodedText) => {
            const scanned = String(decodedText).trim();
            if (!scanned || lastScanRef.current === scanned) return;
            lastScanRef.current = scanned;
            setCode(scanned);
            handleSubmit(scanned);
            lastScanRef.current = '';
          },
          () => {}
        );
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
      if (scanner) {
        scanner.stop().catch(() => {}).finally(() => scanner.clear().catch(() => {}));
      }
    };
  }, [cameraMode, canScan]);

  return (
    <div className="card overflow-hidden">
      <div className="border-b border-slate-200 bg-white px-5 py-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Instant Entry Scanner</h2>
            <p className="mt-1 text-sm text-slate-500">
              Select date first, then scan or enter employee code.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className={`btn-secondary ${cameraMode ? 'border-brand-600 bg-brand-50 text-brand-700' : ''}`}
              onClick={() => setCameraMode((prev) => !prev)}
              disabled={!canScan}
            >
              <Camera className="h-4 w-4" />
              {cameraMode ? 'Stop Camera' : 'Start Camera'}
            </button>

            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-slate-400" />
              <input
                type="date"
                value={state.selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="input max-w-[180px]"
                disabled={!canScan}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-5">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto_auto_auto]">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="Scan barcode or enter punch code"
            className="input"
            disabled={!canScan}
          />

          <button className="btn-secondary" onClick={handlePreview} disabled={!canScan} type="button">
            <SearchCheck className="h-4 w-4" />
            Check
          </button>

          <button className="btn-primary" onClick={() => handleSubmit()} disabled={!canScan} type="button">
            <ScanLine className="h-4 w-4" />
            Process Entry
          </button>

          <button
            className={`btn-secondary ${canOverride ? 'border-amber-200 bg-amber-50 text-amber-700' : 'opacity-60'}`}
            onClick={handleQuickOverride}
            disabled={!canScan || !canOverride}
            type="button"
          >
            <ShieldAlert className="h-4 w-4" />
            HR Override
          </button>
        </div>

        <div className="rounded-none border border-slate-200 bg-white p-3">
          <div id="hr-camera-reader" className="min-h-[240px] w-full overflow-hidden" />
        </div>

        <div className={`rounded-none border px-4 py-3 text-sm ${toneMap[lastMessage.type] || toneMap.info}`}>
          <div className="font-semibold capitalize">{lastMessage.type || 'info'}</div>
          <div className="mt-1">{lastMessage.text || 'System is ready.'}</div>
        </div>

        {preview && (
          <div className={`rounded-none border px-4 py-3 text-sm ${toneMap[preview.type] || toneMap.info}`}>
            <div className="font-semibold">Preview check</div>
            <div className="mt-1">{preview.text}</div>
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
    </div>
  );
}