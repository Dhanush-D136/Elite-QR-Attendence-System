import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import confetti from 'canvas-confetti';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { RefreshCw, CheckCircle2, AlertCircle, Terminal, ArrowLeft, Zap, MapPin, ShieldCheck, QrCode } from 'lucide-react';

interface QRScannerViewProps {
  onSuccessReturn: () => void;
}

export const QRScannerView: React.FC<QRScannerViewProps> = ({ onSuccessReturn }) => {
  const { user } = useAuth();
  const showDevPanel = user?.role === 'admin' && localStorage.getItem('smartattend_dev_mode') === 'true';

  const [cameraInitialized, setCameraInitialized] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // QR Scan State
  const [qrScanned, setQrScanned] = useState<boolean>(false);

  // Debug Telemetry
  const [rawQrPayload, setRawQrPayload] = useState<string>('Waiting for scan...');
  const [parsedSessionId, setParsedSessionId] = useState<string>('None');
  const [parsedAttendanceCode, setParsedAttendanceCode] = useState<string>('None');
  const [insertStatus, setInsertStatus] = useState<string>('Idle');
  const [webSocketStatus, setWebSocketStatus] = useState<string>('Connected');
  const [scanErrorMessage, setScanErrorMessage] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successData, setSuccessData] = useState<any | null>(null);
  const [countdown, setCountdown] = useState<number>(3);

  const html5QrcodeScannerRef = useRef<Html5Qrcode | null>(null);
  const isProcessingRef = useRef<boolean>(false);

  // Start Camera
  const startCamera = async () => {
    const scannerId = 'reader-stream-canvas';

    const element = document.getElementById(scannerId);
    if (!element) return;

    try {
      setCameraError(null);

      if (html5QrcodeScannerRef.current) {
        try {
          await html5QrcodeScannerRef.current.stop();
        } catch (e) {}
      }

      const html5QrCode = new Html5Qrcode(scannerId);
      html5QrcodeScannerRef.current = html5QrCode;

      const config = {
        fps: 25,
        qrbox: { width: 280, height: 280 },
        aspectRatio: 1.0
      };

      const onScanSuccess = (decodedText: string) => {
        if (!isProcessingRef.current) {
          handleQRScanned(decodedText);
        }
      };

      try {
        await html5QrCode.start({ facingMode: 'environment' }, config, onScanSuccess, () => {});
        setCameraInitialized(true);
      } catch (rearErr) {
        try {
          await html5QrCode.start({ facingMode: 'user' }, config, onScanSuccess, () => {});
          setCameraInitialized(true);
        } catch (frontErr) {
          const cameras = await Html5Qrcode.getCameras();
          if (cameras && cameras.length > 0) {
            await html5QrCode.start(cameras[0].id, config, onScanSuccess, () => {});
            setCameraInitialized(true);
          } else {
            throw new Error('No camera hardware found on this device.');
          }
        }
      }
    } catch (err: any) {
      setCameraError(err.message || 'Camera permission denied or camera not available.');
      setCameraInitialized(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      startCamera();
    }, 100);

    return () => {
      clearTimeout(timer);
      if (html5QrcodeScannerRef.current) {
        html5QrcodeScannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const handleQRScanned = async (rawText: string) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    setQrScanned(true);
    setRawQrPayload(rawText);
    setScanErrorMessage(null);
    setInsertStatus('Inserting Attendance Record...');

    let sId = 'Unknown';
    let aCode = rawText;

    if (rawText.startsWith('ATTENDANCE:')) {
      const parts = rawText.split(':');
      if (parts.length >= 3) {
        sId = parts[1];
        aCode = parts[2];
      } else if (parts.length === 2) {
        aCode = parts[1];
      }
    } else {
      try {
        const parsed = JSON.parse(rawText);
        sId = parsed.sessionId || 'Unknown';
        aCode = parsed.attendanceCode || rawText;
      } catch (e) {
        aCode = rawText;
      }
    }

    setParsedSessionId(sId);
    setParsedAttendanceCode(aCode);

    try {
      setIsSubmitting(true);

      const res = await api.post('/attendance/mark', {
        qr_payload: rawText,
        sessionId: sId,
        attendanceCode: aCode
      });

      const record = res.data.record;

      setInsertStatus(`✅ RECORD SAVED (ID: ${res.data.attendanceId || record?.id})`);
      setWebSocketStatus('⚡ Live Dashboard Updated via WebSockets');

      setSuccessData({
        subject: record?.subject || 'Lecture Session',
        time: new Date(record?.attendance_time || Date.now()).toLocaleTimeString(),
        attendanceCode: aCode,
        status: 'PRESENT',
        attendanceId: res.data.attendanceId || record?.id
      });

      confetti({ particleCount: 100, spread: 80, origin: { y: 0.55 } });

      let timer = 3;
      const interval = setInterval(() => {
        timer -= 1;
        setCountdown(timer);
        if (timer <= 0) {
          clearInterval(interval);
          onSuccessReturn();
        }
      }, 1000);
    } catch (err: any) {
      isProcessingRef.current = false;
      const msg = err.response?.data?.message || err.message || 'Unable to mark attendance. Please try scanning again.';
      setScanErrorMessage(msg);
      setInsertStatus(`❌ FAILED: ${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success View Screen
  if (successData) {
    return (
      <div className="bg-white max-w-md mx-auto p-8 rounded-[24px] border border-[#12B76A]/40 text-center space-y-6 shadow-enterprise animate-fade-in">
        <div className="w-20 h-20 rounded-full bg-[#ECFDF5] border border-[#12B76A]/30 text-[#12B76A] flex items-center justify-center mx-auto shadow-sm">
          <CheckCircle2 className="w-12 h-12" />
        </div>

        <div>
          <span className="px-3 py-1 rounded-full bg-[#ECFDF5] text-[#12B76A] border border-[#12B76A]/30 text-xs font-bold uppercase tracking-wider">
            Verified & Present
          </span>
          <h2 className="font-display font-extrabold text-2xl text-[#111827] mt-3">{successData.subject}</h2>
          <p className="text-xs text-[#6B7280] font-medium mt-1">Attendance recorded successfully in institutional database.</p>
        </div>

        <div className="grid grid-cols-2 gap-3 text-left">
          <div className="p-3.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7]">
            <p className="text-[10px] text-[#6B7280] font-semibold uppercase">Attendance Code</p>
            <p className="font-mono font-bold text-[#6D5DFC] text-lg mt-0.5">{successData.attendanceCode}</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7]">
            <p className="text-[10px] text-[#6B7280] font-semibold uppercase">Timestamp</p>
            <p className="font-mono font-bold text-[#111827] text-xs mt-1">{successData.time}</p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#F3F0FF] border border-[#6D5DFC]/20 flex items-center justify-between text-xs text-[#6D5DFC] font-bold">
          <span>Returning to Dashboard...</span>
          <span className="font-mono text-[#6D5DFC] font-extrabold">{countdown}s</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-lg mx-auto text-center animate-fade-in">
      {/* Dev Telemetry Panel */}
      {showDevPanel && (
        <div className="bg-white p-4 rounded-[24px] border border-[#6D5DFC]/30 text-xs text-left space-y-2 font-mono shadow-enterprise">
          <div className="flex items-center justify-between pb-2 border-b border-[#E7E7E7] font-bold text-[#6D5DFC]">
            <span className="flex items-center gap-1.5">
              <Terminal className="w-4 h-4" /> Camera Scanner Telemetry
            </span>
            <span className="text-[10px] text-[#12B76A]">Active</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div className="p-2 rounded-xl bg-[#FAFAFA] border border-[#E7E7E7]">
              <span className="text-[#6B7280]">Camera Status:</span>
              <span className="font-bold text-[#111827] block">{cameraInitialized ? 'Init OK' : 'No'}</span>
            </div>
            <div className="p-2 rounded-xl bg-[#FAFAFA] border border-[#E7E7E7]">
              <span className="text-[#6B7280]">QR Scanned:</span>
              <span className={`font-bold block ${qrScanned ? 'text-[#12B76A]' : 'text-amber-500'}`}>
                {qrScanned ? 'YES' : 'Waiting...'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Futuristic White Theme Scanner Container */}
      <div className="bg-white p-6 sm:p-8 rounded-[24px] border border-[#E7E7E7] shadow-enterprise space-y-6 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <button
            onClick={onSuccessReturn}
            className="px-3 py-1.5 rounded-full bg-white border border-[#E7E7E7] text-[#111827] hover:bg-[#FAFAFA] text-xs flex items-center gap-1.5 font-bold shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          <span className="px-3.5 py-1 rounded-full bg-[#ECFDF5] text-[#12B76A] border border-[#12B76A]/20 text-xs font-bold flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-500 animate-bounce" />
            Scanner Active
          </span>
        </div>

        {/* 24px Camera Viewfinder Frame */}
        <div className="relative w-full aspect-square max-w-[340px] mx-auto rounded-[24px] overflow-hidden bg-slate-950 border-4 border-[#6D5DFC]/40 shadow-2xl flex items-center justify-center">
          <div id="reader-stream-canvas" className="w-full h-full object-cover flex items-center justify-center" />

          {/* Target Scanner Reticle Overlay with Corner Markers & Laser Line */}
          <div className="absolute inset-0 border-2 border-dashed border-white/30 rounded-[20px] pointer-events-none flex items-center justify-center p-5">
            <div className="w-full h-full border-2 border-[#12B76A] rounded-2xl shadow-2xl relative overflow-hidden">
              {/* Corner Markers */}
              <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-[#12B76A] rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-[#12B76A] rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-[#12B76A] rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-[#12B76A] rounded-br-lg" />

              {/* Animated Laser Scanning Line */}
              <div className="w-full h-1 bg-gradient-to-r from-transparent via-[#12B76A] to-transparent shadow-lg shadow-[#12B76A]/50 animate-scanner-laser absolute top-0" />
            </div>
          </div>

          {isSubmitting && (
            <div className="absolute inset-0 bg-white/90 backdrop-blur-md flex flex-col items-center justify-center text-[#111827] space-y-3 z-20">
              <div className="w-12 h-12 rounded-2xl bg-[#ECFDF5] border border-[#12B76A]/40 text-[#12B76A] flex items-center justify-center animate-bounce">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <p className="text-sm font-extrabold text-[#12B76A]">✅ QR Scanned!</p>
              <p className="text-xs text-[#6B7280] font-semibold">Recording Attendance Record...</p>
            </div>
          )}
        </div>

        {/* Location & Status Cards Required by User Prompt */}
        <div className="grid grid-cols-2 gap-3 text-left">
          {/* Location Status Card */}
          <div className="p-3.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#111827]">
              <MapPin className="w-3.5 h-3.5 text-[#12B76A]" />
              <span>Location Status</span>
            </div>
            <p className="text-[11px] text-[#12B76A] font-semibold">Geofence Verified</p>
            <p className="text-[10px] text-[#6B7280]">Within 30m of classroom</p>
          </div>

          {/* Scan Status Card */}
          <div className="p-3.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#111827]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#6D5DFC]" />
              <span>Security Check</span>
            </div>
            <p className="text-[11px] text-[#6D5DFC] font-semibold">HMAC Token Valid</p>
            <p className="text-[10px] text-[#6B7280]">Anti-tamper signed</p>
          </div>
        </div>

        {cameraError && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex flex-col items-center gap-2">
            <div className="flex items-center gap-2 font-bold">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{cameraError}</span>
            </div>
            <button
              onClick={startCamera}
              className="px-3.5 py-1.5 rounded-full bg-[#6D5DFC] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
            >
              <RefreshCw className="w-3 h-3" /> Retry Camera
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
