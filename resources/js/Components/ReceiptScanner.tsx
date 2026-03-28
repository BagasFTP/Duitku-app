import { useRef, useState, useEffect } from 'react';
import axios from 'axios';
import { Camera, X, Loader2, ScanLine, ImagePlus, Video, CircleDot } from 'lucide-react';

interface ScannedData {
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
    const [open, setOpen]           = useState(false);
    const [preview, setPreview]     = useState<string | null>(null);
    const [loading, setLoading]     = useState(false);
    const [error, setError]         = useState<string | null>(null);
    const [webcamOn, setWebcamOn]   = useState(false);

    const fileRef   = useRef<HTMLInputElement>(null);
    const cameraRef = useRef<HTMLInputElement>(null);
    const videoRef  = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    // Stop webcam when modal closes
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
            // Attach stream to video element after render
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
            <button
                type="button"
                onClick={() => { setOpen(true); reset(); }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-indigo-300 text-indigo-600 text-sm font-medium hover:bg-indigo-50 transition w-full justify-center"
            >
                <ScanLine size={16} />
                Scan Struk Belanja
            </button>

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
                                        {/* scan guide overlay */}
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
                                <div className="relative">
                                    <img
                                        src={preview}
                                        alt="Preview struk"
                                        className="w-full max-h-64 object-contain rounded-xl border border-slate-200 bg-slate-50"
                                    />
                                    <button
                                        type="button"
                                        onClick={reset}
                                        className="absolute top-2 right-2 bg-white rounded-full p-1 shadow text-slate-500 hover:text-red-500"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            )}

                            {/* Pilihan sumber foto */}
                            {!webcamOn && !preview && (
                                <div className="grid grid-cols-3 gap-2">
                                    {/* Webcam */}
                                    <button
                                        type="button"
                                        onClick={startWebcam}
                                        className="flex flex-col items-center justify-center gap-2 p-4 border-2 border-dashed border-slate-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50 transition text-slate-500 hover:text-indigo-600"
                                    >
                                        <Video size={22} />
                                        <span className="text-xs font-medium">Webcam</span>
                                    </button>

                                    {/* Kamera HP */}
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

                                    {/* Galeri */}
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
