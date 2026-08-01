import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import api from '../services/api';
import { getSocket } from '../services/socket';
import { RefreshCw, ShieldCheck, Clock, Users, Sparkles, Key, Eye } from 'lucide-react';

interface DynamicQRDisplayProps {
  sessionId: string;
  subjectName: string;
  subjectCode?: string;
  facultyName?: string;
  periodNumber?: string | number;
  sessionDate?: string;
  timeRange?: string;
  department: string;
  section: string;
  liveRecordsCount: number;
}

export const DynamicQRDisplay: React.FC<DynamicQRDisplayProps> = ({
  sessionId,
  subjectName,
  subjectCode,
  facultyName,
  periodNumber,
  sessionDate,
  timeRange,
  department,
  section,
  liveRecordsCount
}) => {
  const [attendanceCode, setAttendanceCode] = useState<string>('4821');
  const [timestamp, setTimestamp] = useState<number>(Date.now());
  const [qrSvg, setQrSvg] = useState<string>('');
  const [rawPayload, setRawPayload] = useState<string>('');
  const [showPayloadModal, setShowPayloadModal] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [timeLeft, setTimeLeft] = useState<number>(5);

  const renderQRCode = async (payloadObj: any) => {
    const payloadStr = typeof payloadObj === 'string' ? payloadObj : JSON.stringify(payloadObj);
    setRawPayload(payloadStr);

    try {
      const svg = await QRCode.toString(payloadStr, {
        type: 'svg',
        errorCorrectionLevel: 'L',
        color: {
          dark: '#111827',
          light: '#FFFFFF'
        },
        margin: 2,
        width: 320
      });
      setQrSvg(svg);
    } catch (e) {
      console.error('QR rendering error', e);
    }
  };

  const rotateQR = async () => {
    try {
      setIsLoading(true);
      const res = await api.post(`/sessions/${sessionId}/rotate`);
      const payload = res.data.qrPayload;
      const newCode = payload.nonce || payload.attendanceCode;

      setAttendanceCode(newCode);
      setTimestamp(payload.timestamp || Date.now());
      setTimeLeft(5);
      await renderQRCode(payload);
    } catch (err) {
      console.error('Failed to rotate QR', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    rotateQR();

    const timerInterval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          rotateQR();
          return 5;
        }
        return prev - 1;
      });
    }, 1000);

    const socket = getSocket();
    socket.on('qr_rotated', (data: any) => {
      if (data.sessionId === sessionId) {
        const payload = data.qrPayload || data;
        setAttendanceCode(payload.nonce || data.attendanceCode);
        setTimestamp(payload.timestamp || Date.now());
        setTimeLeft(5);
        renderQRCode(payload);
      }
    });

    return () => {
      clearInterval(timerInterval);
      socket.off('qr_rotated');
    };
  }, [sessionId]);

  return (
    <div className="bg-white rounded-[24px] p-6 lg:p-8 border border-[#E7E7E7] shadow-enterprise relative overflow-hidden text-center max-w-md mx-auto space-y-6 animate-fade-in">
      {/* Header Info */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#F3F0FF] border border-[#6D5DFC]/20 text-[#6D5DFC] text-xs font-bold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" />
          5s Dynamic Rotating QR
        </div>
        
        <div className="pt-1">
          {subjectCode && (
            <span className="px-2.5 py-0.5 rounded-full bg-[#F3F0FF] text-[#6D5DFC] font-mono text-[10px] font-extrabold border border-[#6D5DFC]/20 mr-1.5">
              {subjectCode}
            </span>
          )}
          <h3 className="font-display font-extrabold text-2xl text-[#111827] inline">{subjectName}</h3>
        </div>

        {facultyName && (
          <p className="text-xs text-[#4F7CFF] font-bold">
            Faculty: {facultyName}
          </p>
        )}

        <div className="p-3 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] grid grid-cols-2 gap-2 text-xs text-[#6B7280]">
          <div>
            <span className="text-[10px] font-bold text-[#6D5DFC] block uppercase">Date & Period</span>
            <strong className="text-[#111827]">{sessionDate || new Date().toLocaleDateString()} • Period {periodNumber || 1}</strong>
          </div>
          <div>
            <span className="text-[10px] font-bold text-[#6D5DFC] block uppercase">Dept & Section</span>
            <strong className="text-[#111827]">{department} (Sec {section})</strong>
          </div>
        </div>

        {/* Active Code Badge */}
        <div className="mt-2 inline-flex items-center gap-2 px-5 py-2 rounded-2xl bg-[#F7F3EE] border border-[#E7E7E7] text-[#111827] font-mono text-sm font-bold shadow-sm">
          <Key className="w-4 h-4 text-[#6D5DFC] animate-pulse" />
          <span>Active Code: <strong className="text-[#6D5DFC] text-2xl tracking-widest font-extrabold ml-1">{attendanceCode}</strong></span>
        </div>
      </div>

      {/* QR Code Container */}
      <div className="relative p-5 rounded-2xl bg-white border-2 border-[#E7E7E7] shadow-sm flex flex-col items-center justify-center min-h-[280px]">
        {isLoading && !qrSvg ? (
          <div className="flex flex-col items-center gap-3 text-[#6B7280]">
            <RefreshCw className="w-8 h-8 animate-spin text-[#6D5DFC]" />
            <p className="text-xs font-bold">Generating Dynamic QR...</p>
          </div>
        ) : (
          <>
            <div
              className="w-full max-w-[260px] mx-auto filter drop-shadow-sm"
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />

            {/* Countdown Badge */}
            <div className="mt-3 flex items-center justify-center gap-2 text-xs font-mono text-[#111827] bg-[#F3F0FF] px-4 py-1.5 rounded-full border border-[#6D5DFC]/20 font-bold">
              <Clock className="w-3.5 h-3.5 text-[#6D5DFC] animate-spin" />
              <span>Rotation in: <strong className="text-[#6D5DFC] text-sm font-extrabold">{timeLeft}s</strong></span>
            </div>
          </>
        )}
      </div>

      {/* Payload Modal Toggle */}
      <button
        onClick={() => setShowPayloadModal(!showPayloadModal)}
        className="px-4 py-2 rounded-full bg-white border border-[#E7E7E7] text-[#111827] hover:bg-[#FAFAFA] text-xs font-bold flex items-center justify-center gap-2 mx-auto shadow-sm"
      >
        <Eye className="w-3.5 h-3.5 text-[#6D5DFC]" />
        <span>{showPayloadModal ? 'Hide QR Payload' : 'Show Current QR Payload'}</span>
      </button>

      {showPayloadModal && (
        <div className="p-4 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-left text-xs font-mono space-y-2 text-[#111827]">
          <p className="text-[10px] text-[#6D5DFC] font-bold uppercase">Dynamic QR Payload:</p>
          <pre className="text-[11px] bg-white p-3 rounded-xl border border-[#E7E7E7] text-[#12B76A] font-bold overflow-x-auto">
            {rawPayload}
          </pre>
        </div>
      )}

      {/* Status Indicators */}
      <div className="grid grid-cols-2 gap-3 text-left pt-3 border-t border-[#E7E7E7]">
        <div className="p-3 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7]">
          <div className="flex items-center gap-1.5 text-[#12B76A] text-xs font-bold">
            <ShieldCheck className="w-3.5 h-3.5" />
            Instant Scan
          </div>
          <p className="text-[10px] text-[#6B7280] font-medium mt-0.5">Anti-tamper HMAC token signed.</p>
        </div>

        <div className="p-3 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7]">
          <div className="flex items-center gap-1.5 text-[#6D5DFC] text-xs font-bold">
            <Users className="w-3.5 h-3.5" />
            Present Count
          </div>
          <p className="text-sm font-bold text-[#111827] font-mono mt-0.5">{liveRecordsCount} Students</p>
        </div>
      </div>
    </div>
  );
};
