import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';
import { X, ScanLine } from 'lucide-react';

interface Props {
  onScan: (text: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onScan, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    let done = false;

    reader.decodeFromConstraints(
      { video: { facingMode: 'environment' } },
      videoRef.current!,
      (result, _err, controls) => {
        controlsRef.current = controls;
        if (result && !done) {
          done = true;
          controls.stop();
          onScan(result.getText());
        }
      }
    ).catch(() => {
      setError('カメラへのアクセスに失敗しました');
    });

    return () => {
      done = true;
      controlsRef.current?.stop();
      BrowserMultiFormatReader.releaseAllStreams();
    };
  }, []);

  return (
    <div style={{ background: 'rgba(28,25,23,0.85)' }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4">
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, overflow: 'hidden', width: '100%', maxWidth: 400 }}>
        {/* Header */}
        <div style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}
          className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2">
            <ScanLine size={18} style={{ color: 'var(--accent)' }} />
            <h2 style={{ fontFamily: 'var(--font-serif)', color: 'var(--ink)', fontSize: 16, fontWeight: 700 }}>
              バーコードスキャン
            </h2>
          </div>
          <button onClick={onClose} style={{ color: 'var(--ink-muted)', background: 'transparent' }}>
            <X size={22} />
          </button>
        </div>

        {/* Viewfinder */}
        <div style={{ position: 'relative', background: '#000', aspectRatio: '4/3' }}>
          <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted playsInline />

          {/* Scan guide overlay */}
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{
              width: '72%', height: '35%',
              border: '2px solid var(--accent)',
              borderRadius: 8,
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)',
            }} />
          </div>
        </div>

        <div className="px-5 py-4 text-center">
          {error ? (
            <p style={{ color: 'var(--accent)', fontFamily: 'var(--font-sans)', fontSize: 13 }}>{error}</p>
          ) : (
            <p style={{ color: 'var(--ink-muted)', fontFamily: 'var(--font-sans)', fontSize: 12 }}>
              バーコードを枠内に合わせてください
            </p>
          )}
          <button onClick={onClose}
            style={{ marginTop: 12, padding: '8px 24px', borderRadius: 20, border: '1px solid var(--border)', color: 'var(--ink-muted)', fontFamily: 'var(--font-sans)', fontSize: 13, background: 'transparent' }}>
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
}
