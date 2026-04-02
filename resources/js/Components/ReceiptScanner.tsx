import { useRef, useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from '@inertiajs/react';
import { Camera, X, Loader2, ScanLine, ImagePlus, Video, CircleDot, ZoomIn, RefreshCw, History } from 'lucide-react';

interface ScannedData {
    scan_id: number;
    amount: string;
    type: 'income' | 'expense';
    description: string;
    date: string;
    category_id: string;
}

interface Props {
    onScanned: (data: ScannedData) => void;
}

export default function ReceiptScanner({ onScanned }: Props) {
    const [open, setOpen]                     = useState(false);
    const [preview, setPreview]               = useState<string | null>(null);
    const [loading, setLoading]               = useState(false);
    const [error, setError]                   = useState<string | null>(null);
    const [webcamOn, setWebcamOn]             = useState(false);
    const [scannedPreview, setScannedPreview] = useState<string | null>(null);
    const [showFullPreview, setShowFullPreview] = useState(false);

    const fileRef   = useRef<HTMLInputElement>(null);
    const cameraRef = useRef<HTMLInputElement>(null);
    const videoRef  = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    useEffect(() => {
        if (!open) stopWebcam();
    }, [open]);

    const stopWebcam = () => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        setWebcamOn(false);
    };

    const startWebcam = async () => {
        setError(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 1280 } },
            });
            streamRef.current = stream;
            setWebcamOn(true);
            setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.play();
                }
            }, 50);
        } catch {
            setError('Tidak dapat mengakses kamera. Izinkan akses kamera di browser.');
        }
    };

    const captureFrame = () => {
        const video  = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) return;

        canvas.width  = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d')!.drawImage(video, 0, 0);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        setPreview(dataUrl);
        stopWebcam();
    };

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setError(null);
        const reader = new FileReader();
        reader.onload = (ev) => setPreview(ev.target?.result as string);
        reader.readAsDataURL(file);
    };

    const handleScan = async () => {
        if (!preview) return;
        setLoading(true);
        setError(null);
        try {
            const res = await axios.post('/receipt/scan', { image: preview });
            setScannedPreview(preview);
            onScanned(res.data);
            setOpen(false);
            setPreview(null);
        } catch (err: any) {
            setError(err.response?.data?.error ?? 'Gagal memproses struk. Coba foto ulang.');
        } finally {
            setLoading(false);
        }
    };

    const reset = () => {
        setPreview(null);
        setError(null);
        stopWebcam();
        if (fileRef.current)   fileRef.current.value   = '';
        if (cameraRef.current) cameraRef.current.value = '';
    };

    return (
        <>
            {/* Tombol scan / scan ulang + link riwayat */}
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={() => { setOpen(true); reset(); }}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-indigo-300 text-indigo-600 text-sm font-medium hover:bg-indigo-50 transition flex-1 justify-center"
                >
                    <ScanLine size={16} />
                    {scannedPreview ? 'Scan Ulang' : 'Scan Struk Belanja'}
                </button>
                <Link
                    href="/receipt/history"
                    className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-200 text-slate-500 text-xs font-medium hover:bg-slate-50 hover:text-indigo-600 transition shrink-0"
                    title="Riwayat Scan"
                >
                    <History size={15} />
                    <span className="hidden sm:inline">Riwayat</span>
                </Link>
            </div>

            {/* Thumbnail struk hasil scan */}
            {scannedPreview && !open && (
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-2 border-b border-indigo-100">
                        <span className="text-xs font-medium text-indigo-700 flex items-center gap-1.5">
                            <ScanLine size={12} />
                            Struk dipindai — koreksi data di bawah jika perlu
                        </span>
                        <button
                            type="button"
                            onClick={() => setScannedPreview(null)}
                            className="text-slate-400 hover:text-red-500 transition-colors"
                        >
                            <X size={14} />
                        </button>
                    </div>
                    <div
                        className="relative cursor-zoom-in group"
                        onClick={() => setShowFullPreview(true)}
                    >
                        <img
                            src={scannedPreview}
                            alt="Struk yang dipindai"
                            className="w-full max-h-52 object-contain bg-white"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/55 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 backdrop-blur-sm">
                                <ZoomIn size={12} />
                                Perbesar
                            </span>
                        </div>
                    </div>
                    <div className="px-3 py-2 flex items-center justify-between">
                        <span className="text-xs text-slate-400">Tap gambar untuk memperbesar</span>
                        <button
                            type="button"
                            onClick={() => { setOpen(true); reset(); }}
                            className="flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700 font-medium transition-colors"
                        >
                            <RefreshCw size={11} />
                            Scan ulang
                        </button>
                    </div>
                </div>
            )}

            {/* Lightbox full size */}
            {showFullPreview && scannedPreview && (
                <div
                    className="fixed inset-0 z-[60] bg-black/85 flex items-center justify-center p-4"
                    onClick={() => setShowFullPreview(false)}
                >
                    <button
                        type="button"
                        className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white rounded-full p-2 transition-colors"
                        onClick={() => setShowFullPreview(false)}
                    >
                        <X size={20} />
                    </button>
                    <img
                        src={scannedPreview}
                        alt="Struk"
                        className="max-w-full max-h-[90vh] rounded-xl shadow-2xl object-contain"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}

            {/* Modal scan */}
            {open && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b">
                            <div className="flex items-center gap-2">
                                <ScanLine size={18} className="text-indigo-500" />
                                <span className="font-semibold text-slate-700">Scan Struk</span>
                            </div>
                            <button type="button" onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-5 space-y-4">

                            {/* Webcam live view */}
                            {webcamOn && (
                                <div className="space-y-3">
                                    <div className="relative rounded-xl overflow-hidden bg-black">
                                        <video
                                            ref={videoRef}
                                            autoPlay
                                            playsInline
                                            muted
                                            className="w-full max-h-64 object-cover"
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                            <div className="border-2 border-white/60 rounded-xl w-4/5 h-3/4" />
                                        </div>
                                    </div>
                                    <canvas ref={canvasRef} className="hidden" />
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            onClick={stopWebcam}
                                            className="py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition"
                                        >
                                            Batal
                                        </button>
                                        <button
                                            type="button"
                                            onClick={captureFrame}
                                            className="flex items-center justify-center gap-2 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition"
                                        >
                                            <CircleDot size={16} />
                                            Ambil Foto
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Preview hasil foto */}
                            {!webcamOn && preview && (
                                <div className="relative rounded-xl overflow-hidden">
                                    <style>{`
                                        @keyframes scanLine {
                                            0%   { top: 4%; }
                                            50%  { top: 88%; }
                                            100% { top: 4%; }
                                        }
                                        .receipt-scan-line {
                                            animation: scanLine 1.8s ease-in-out infinite;
                                        }
                                    `}</style>

                                    <img
                                        src={preview}
                                        alt="Preview struk"
                                        className="w-full max-h-64 object-contain rounded-xl border border-slate-200 bg-slate-50"
                                    />

                                    {/* Scan animation overlay */}
                                    {loading && (
                                        <div className="absolute inset-0 rounded-xl overflow-hidden">
                                            <div className="absolute inset-0 bg-black/25" />
                                            <div
                                                className="receipt-scan-line absolute left-4 right-4 h-0.5 rounded-full pointer-events-none"
                                                style={{
                                                    background: 'linear-gradient(90deg, transparent, #a5b4fc, #6366f1, #a5b4fc, transparent)',
                                                    boxShadow: '0 0 10px 3px rgba(99,102,241,0.6)',
                                                }}
                                            />
                                            <div className="absolute top-3 left-3 w-7 h-7 border-t-2 border-l-2 border-indigo-400 rounded-tl" />
                                            <div className="absolute top-3 right-3 w-7 h-7 border-t-2 border-r-2 border-indigo-400 rounded-tr" />
                                            <div className="absolute bottom-3 left-3 w-7 h-7 border-b-2 border-l-2 border-indigo-400 rounded-bl" />
                                            <div className="absolute bottom-3 right-3 w-7 h-7 border-b-2 border-r-2 border-indigo-400 rounded-br" />
                                            <div className="absolute bottom-4 left-0 right-0 flex justify-center pointer-events-none">
                                                <span className="bg-black/50 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-sm flex items-center gap-1.5">
                                                    <Loader2 size={11} className="animate-spin" />
                                                    Menganalisis struk...
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    {!loading && (
                                        <button
                                            type="button"
                                            onClick={reset}
                                            className="absolute top-2 right-2 bg-white rounded-full p-1 shadow text-slate-500 hover:text-red-500"
                                        >
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Pilihan sumber foto */}
                            {!webcamOn && !preview && (
                                <div className="grid grid-cols-3 gap-2">
                                    <button
                                        type="button"
                                        onClick={startWebcam}
                                        className="flex flex-col items-center justify-center gap-2 p-4 border-2 border-dashed border-slate-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50 transition text-slate-500 hover:text-indigo-600"
                                    >
                                        <Video size={22} />
                                        <span className="text-xs font-medium">Webcam</span>
                                    </button>

                                    <label className="flex flex-col items-center justify-center gap-2 p-4 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-indigo-300 hover:bg-indigo-50 transition text-slate-500 hover:text-indigo-600">
                                        <Camera size={22} />
                                        <span className="text-xs font-medium">Kamera</span>
                                        <input
                                            ref={cameraRef}
                                            type="file"
                                            accept="image/*"
                                            capture="environment"
                                            className="hidden"
                                            onChange={handleFile}
                                        />
                                    </label>

                                    <label className="flex flex-col items-center justify-center gap-2 p-4 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-indigo-300 hover:bg-indigo-50 transition text-slate-500 hover:text-indigo-600">
                                        <ImagePlus size={22} />
                                        <span className="text-xs font-medium">Galeri</span>
                                        <input
                                            ref={fileRef}
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={handleFile}
                                        />
                                    </label>
                                </div>
                            )}

                            {/* Error */}
                            {error && (
                                <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
                            )}

                            {/* Tombol proses */}
                            {!webcamOn && preview && (
                                <button
                                    type="button"
                                    onClick={handleScan}
                                    disabled={loading}
                                    className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 transition"
                                >
                                    {loading ? (
                                        <><Loader2 size={16} className="animate-spin" /> Memproses struk...</>
                                    ) : (
                                        <><ScanLine size={16} /> Proses Struk</>
                                    )}
                                </button>
                            )}

                            {!webcamOn && (
                                <p className="text-xs text-slate-400 text-center">
                                    Pastikan foto struk terlihat jelas dan terang
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
