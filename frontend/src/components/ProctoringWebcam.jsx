import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Camera, ShieldCheck, ShieldAlert } from 'lucide-react';

const MODEL_URL = 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights';
const DETECTION_INTERVAL_MS = 4000;

/**
 * Self-contained proctoring widget: shows the live webcam feed, runs
 * lightweight face detection on an interval, and listens for tab-switch /
 * window-blur / fullscreen-exit events. Every violation is reported via
 * `onViolation({ eventType, metadata })` so the parent page can persist it
 * (POST /api/proctoring/attempts/:id/events) and optionally enforce policy
 * (e.g. auto-submit after `maxTabSwitches`).
 */
export default function ProctoringWebcam({ onViolation, maxTabSwitches = 3, onMaxTabSwitchesExceeded }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const tabSwitchCountRef = useRef(0);

  const [status, setStatus] = useState('initializing'); // initializing | ok | warning | error
  const [statusMessage, setStatusMessage] = useState('Starting camera...');
  const [modelsReady, setModelsReady] = useState(false);

  // ---- camera + model setup ----
  useEffect(() => {
    let stream;

    async function setup() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (err) {
        setStatus('error');
        setStatusMessage('Camera access denied. Proctoring cannot continue.');
        onViolation?.({ eventType: 'connection_lost', metadata: { reason: 'camera_denied' } });
        return;
      }

      try {
        // face-api.js is loaded globally via a <script defer> tag in index.html.
        const faceapi = window.faceapi;
        if (!faceapi) throw new Error('face-api.js not loaded');
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        setModelsReady(true);
        setStatus('ok');
        setStatusMessage('Monitoring active');
      } catch (err) {
        // Detection model failed to load (e.g. no internet on the CDN) -
        // proctoring degrades gracefully to tab/fullscreen monitoring only.
        setStatus('warning');
        setStatusMessage('Face detection unavailable - monitoring tab activity only.');
      }
    }

    setup();
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- periodic face detection ----
  useEffect(() => {
    if (!modelsReady) return;
    const faceapi = window.faceapi;

    const interval = setInterval(async () => {
      if (!videoRef.current) return;
      try {
        const detections = await faceapi.detectAllFaces(
          videoRef.current,
          new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 })
        );
        if (detections.length === 0) {
          setStatus('warning');
          setStatusMessage('No face detected');
          onViolation?.({ eventType: 'no_face', metadata: {} });
        } else if (detections.length > 1) {
          setStatus('warning');
          setStatusMessage(`${detections.length} faces detected`);
          onViolation?.({ eventType: 'multiple_faces', metadata: { count: detections.length } });
        } else {
          setStatus('ok');
          setStatusMessage('Monitoring active');
        }
      } catch {
        // Swallow transient detection errors (e.g. frame not ready) silently.
      }
    }, DETECTION_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [modelsReady, onViolation]);

  // ---- tab switch / window blur / fullscreen exit ----
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.hidden) {
        tabSwitchCountRef.current += 1;
        onViolation?.({ eventType: 'tab_switch', metadata: { count: tabSwitchCountRef.current } });
        if (tabSwitchCountRef.current >= maxTabSwitches) {
          onMaxTabSwitchesExceeded?.();
        }
      }
    }
    function handleBlur() {
      onViolation?.({ eventType: 'window_blur', metadata: {} });
    }
    function handleFullscreenChange() {
      if (!document.fullscreenElement) {
        onViolation?.({ eventType: 'fullscreen_exit', metadata: {} });
      }
    }
    function handleCopyPaste(e) {
      onViolation?.({ eventType: 'copy_paste', metadata: { action: e.type } });
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('copy', handleCopyPaste);
    document.addEventListener('paste', handleCopyPaste);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('copy', handleCopyPaste);
      document.removeEventListener('paste', handleCopyPaste);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxTabSwitches]);

  const STATUS_STYLES = {
    initializing: 'border-white/10 text-slate-400',
    ok: 'border-success/40 text-success',
    warning: 'border-warning/40 text-warning',
    error: 'border-danger/40 text-danger',
  };
  const StatusIcon = status === 'ok' ? ShieldCheck : status === 'error' ? ShieldAlert : AlertTriangle;

  return (
    <div className="glass-card">
      <div className="relative mb-3 overflow-hidden rounded-xl border border-white/10 bg-black">
        <video ref={videoRef} muted playsInline className="aspect-video w-full object-cover" />
        <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 hidden" />
        <div className="absolute left-2 top-2 flex items-center gap-1.5 rounded-full bg-black/60 px-2 py-1 text-[11px] text-white">
          <Camera size={11} /> Live
        </div>
      </div>
      <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium ${STATUS_STYLES[status]}`}>
        <StatusIcon size={14} />
        {statusMessage}
      </div>
    </div>
  );
}
