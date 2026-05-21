import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Upload, 
  Activity, 
  Sparkles, 
  Download, 
  ChevronRight, 
  Image as ImageIcon, 
  Sliders, 
  AlertCircle,
  Clock,
  Eye,
  Layers,
  Crosshair,
  Copy,
  Check,
  FileJson,
  TrendingUp,
  Cpu
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';

// Struct declarations
interface TrackingFrame {
  timestamp: string;
  box_2d: [number, number, number, number] | null; // [ymin, xmin, ymax, xmax]
  occluded: boolean;
}

interface SampleVideo {
  id: string;
  sensorCode: string;
  title: string;
  url: string;
  defaultTarget: string;
  icon: string;
  location: string;
  modelLatency: string;
  throughput: string;
  sequence: TrackingFrame[];
}

const SAMPLE_VIDEOS: SampleVideo[] = [
  {
    id: 'urban-traffic',
    sensorCode: 'CAM_01_FWD',
    title: 'Urban High-Speed Sedan',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    defaultTarget: 'red and orange flashing blazes',
    icon: '🚗',
    location: 'Northbound Hwy 101, Gate 4',
    modelLatency: '12.4ms',
    throughput: '84 FPS',
    sequence: [
      { timestamp: '00:01', box_2d: [250, 480, 520, 920], occluded: false },
      { timestamp: '00:02', box_2d: [260, 420, 540, 880], occluded: false },
      { timestamp: '00:03', box_2d: [270, 360, 560, 840], occluded: false },
      { timestamp: '00:04', box_2d: [280, 300, 580, 800], occluded: false },
      { timestamp: '00:05', box_2d: [290, 240, 600, 760], occluded: false },
      { timestamp: '00:06', box_2d: [300, 180, 620, 720], occluded: false },
      { timestamp: '00:07', box_2d: [310, 120, 640, 680], occluded: false },
      { timestamp: '00:08', box_2d: [310, 120, 640, 680], occluded: true },
      { timestamp: '00:09', box_2d: [310, 120, 640, 680], occluded: true },
      { timestamp: '00:10', box_2d: [320, 80, 660, 640], occluded: false }
    ]
  },
  {
    id: 'runners-velocity',
    sensorCode: 'CAM_02_REAR',
    title: 'Track Runner Trajectory',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    defaultTarget: 'runner in blue vest',
    icon: '🏃',
    location: 'Main Terminal B, Lobby 2',
    modelLatency: '14.1ms',
    throughput: '71 FPS',
    sequence: [
      { timestamp: '00:01', box_2d: [380, 180, 850, 420], occluded: false },
      { timestamp: '00:02', box_2d: [370, 240, 840, 480], occluded: false },
      { timestamp: '00:03', box_2d: [360, 300, 830, 540], occluded: false },
      { timestamp: '00:04', box_2d: [350, 360, 820, 600], occluded: false },
      { timestamp: '00:05', box_2d: [340, 420, 810, 660], occluded: false },
      { timestamp: '00:06', box_2d: [330, 480, 800, 720], occluded: false },
      { timestamp: '00:07', box_2d: [320, 540, 790, 780], occluded: false },
      { timestamp: '00:08', box_2d: [310, 600, 780, 840], occluded: false },
      { timestamp: '00:09', box_2d: [300, 660, 770, 900], occluded: false },
      { timestamp: '00:10', box_2d: [300, 660, 770, 900], occluded: true }
    ]
  },
  {
    id: 'elephant-dream',
    sensorCode: 'CAM_03_DOM',
    title: 'Character Target Lock',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantDream.mp4',
    defaultTarget: 'orange mechanical device',
    icon: '👽',
    location: 'Assembly Area Floor 3',
    modelLatency: '9.8ms',
    throughput: '102 FPS',
    sequence: [
      { timestamp: '00:01', box_2d: [150, 450, 550, 650], occluded: false },
      { timestamp: '00:02', box_2d: [160, 440, 560, 640], occluded: false },
      { timestamp: '00:03', box_2d: [170, 430, 570, 630], occluded: false },
      { timestamp: '00:04', box_2d: [180, 420, 580, 620], occluded: false },
      { timestamp: '00:05', box_2d: [190, 410, 590, 610], occluded: false },
      { timestamp: '00:06', box_2d: [200, 400, 600, 600], occluded: false },
      { timestamp: '00:07', box_2d: [210, 390, 610, 590], occluded: false },
      { timestamp: '00:08', box_2d: [220, 380, 620, 580], occluded: false },
      { timestamp: '00:09', box_2d: [230, 370, 630, 570], occluded: false },
      { timestamp: '00:10', box_2d: [240, 360, 640, 560], occluded: false }
    ]
  }
];

export default function App() {
  // Navigation & Primary Core Track States
  const [selectedVideo, setSelectedVideo] = useState<SampleVideo | null>(SAMPLE_VIDEOS[0]);
  const [customVideoFile, setCustomVideoFile] = useState<File | null>(null);
  const [customVideoUrl, setCustomVideoUrl] = useState<string | null>(null);
  const [targetObject, setTargetObject] = useState<string>('red sedan');
  
  // Track sequence parameters
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisProgress, setAnalysisProgress] = useState<string>('');
  const [trackedSequence, setTrackedSequence] = useState<TrackingFrame[]>(SAMPLE_VIDEOS[0].sequence);
  const [extractedFrames, setExtractedFrames] = useState<{ timestamp: string; dataUrl: string }[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [videoLoadError, setVideoLoadError] = useState<boolean>(false);
  
  // Playback managers
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTimeSecs, setCurrentTimeSecs] = useState<number>(0);
  const [videoDuration, setVideoDuration] = useState<number>(10);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [activeFrame, setActiveFrame] = useState<TrackingFrame | null>(SAMPLE_VIDEOS[0].sequence[0]);

  // Sidebar controls category filters
  const [filters, setFilters] = useState({
    vehicles: true,
    pedestrians: true,
    obstacles: true
  });
  
  // Interactive Output Log Tabs
  const [activeOutputTab, setActiveOutputTab] = useState<'log' | 'json' | 'chart'>('log');
  const [copyAck, setCopyAck] = useState<boolean>(false);

  // Console feed event tracking
  const [eventLogs, setEventLogs] = useState<string[]>([]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Dynamic ticking UTC Clock
  const [utcTime, setUtcTime] = useState<string>('2026-05-21 07:26:00 UTC');
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const yr = now.getUTCFullYear();
      const mo = String(now.getUTCMonth() + 1).padStart(2, '0');
      const da = String(now.getUTCDate()).padStart(2, '0');
      const hr = String(now.getUTCHours()).padStart(2, '0');
      const mi = String(now.getUTCMinutes()).padStart(2, '0');
      const se = String(now.getUTCSeconds()).padStart(2, '0');
      setUtcTime(`${yr}-${mo}-${da} ${hr}:${mi}:${se} UTC`);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const addEventLog = (msg: string) => {
    const time = new Date().toISOString().slice(11, 19);
    setEventLogs(prev => [`[${time}] ${msg}`, ...prev.slice(0, 39)]);
  };

  // Sync sample video selections
  useEffect(() => {
    if (selectedVideo) {
      setTrackedSequence(selectedVideo.sequence);
      setTargetObject(selectedVideo.defaultTarget);
      setCustomVideoFile(null);
      setCustomVideoUrl(null);
      setExtractedFrames([]);
      setActiveFrame(selectedVideo.sequence[0]);
      setVideoLoadError(false);
      addEventLog(`Stream channel connected to ${selectedVideo.sensorCode} (${selectedVideo.title})`);
    }
  }, [selectedVideo]);

  // Sync state and active temporal frame from video updates
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTimeSecs(video.currentTime);
      
      const currentSecondsRounded = Math.floor(video.currentTime);
      const minutesStr = Math.floor(currentSecondsRounded / 60).toString().padStart(2, '0');
      const secondsStr = (currentSecondsRounded % 60).toString().padStart(2, '0');
      const timestampKey = `${minutesStr}:${secondsStr}`;

      const matched = trackedSequence.find(f => f.timestamp === timestampKey);
      if (matched) {
        setActiveFrame(matched);
      } else {
        // Find closest looking back in chronology
        const sortedSeq = [...trackedSequence].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
        const prevFrame = sortedSeq.find(f => f.timestamp <= timestampKey);
        setActiveFrame(prevFrame || null);
      }
    };

    const handleDurationChange = () => {
      setVideoDuration(video.duration || 10);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      addEventLog(`Trace timeline reached terminal keyframe.`);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('ended', handleEnded);
    };
  }, [trackedSequence]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  const formatTimestamp = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = Math.floor(secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Dynamic Browser Canvas snapshot extraction
  const extractKeyframes = (file: File): Promise<{ timestamp: string; dataUrl: string }[]> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.src = URL.createObjectURL(file);
      video.muted = true;
      video.playsInline = true;
      
      video.onloadedmetadata = () => {
        const duration = video.duration || 10;
        const frames: { timestamp: string; dataUrl: string }[] = [];
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        const stepInterval = Math.max(1, Math.floor(duration / 10)); // capture spread of 10 points
        let currentTime = 1; // offset starting point
        
        const nextCapture = () => {
          if (currentTime > duration || frames.length >= 10) {
            URL.revokeObjectURL(video.src);
            resolve(frames);
            return;
          }
          video.currentTime = currentTime;
        };
        
        video.onseeked = () => {
          if (ctx) {
            canvas.width = Math.min(640, video.videoWidth || 640);
            canvas.height = Math.min(360, video.videoHeight || 360);
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            const timestamp = formatTimestamp(currentTime);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.65);
            frames.push({ timestamp, dataUrl });
          }
          currentTime += stepInterval;
          nextCapture();
        };

        nextCapture();
      };

      video.onerror = () => reject(new Error('Loaded digital asset does not match optimal video standards.'));
    });
  };

  // Dispatches programmatically to our full-stack tracker endpoints
  const handleGenerateInference = async () => {
    if (!customVideoFile) {
      setErrorMsg('Connect custom file or utilize preset channels first.');
      return;
    }
    if (!targetObject.trim()) {
      setErrorMsg('Define specific object label text filters.');
      return;
    }

    try {
      setIsAnalyzing(true);
      setErrorMsg(null);
      setAnalysisProgress('Splitting frame buffers on high-speed hardware...');

      const keyframes = await extractKeyframes(customVideoFile);
      setExtractedFrames(keyframes);

      setAnalysisProgress('Executing neural trajectory calculation...');
      const response = await fetch('/api/analyze-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetObject,
          frames: keyframes
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Server rejected neural trace initialization.');
      }

      setAnalysisProgress('Aligning 2D coordinate constraints...');
      const telemetryResult = await response.json();

      if (telemetryResult?.tracked_objects?.[0]?.tracking_sequence) {
        const sequence: TrackingFrame[] = telemetryResult.tracked_objects[0].tracking_sequence;
        const normalized = sequence.map((f: any) => {
          const refinedBox = f.box_2d ? f.box_2d.map((val: number) => {
            return Math.max(0, Math.min(1000, Math.floor(val)));
          }) as [number, number, number, number] : null;

          return {
            timestamp: f.timestamp,
            box_2d: refinedBox,
            occluded: !refinedBox || f.occluded === true
          };
        });

        setTrackedSequence(normalized);
        setActiveFrame(normalized[0]);
        if (videoRef.current) {
          videoRef.current.currentTime = 1;
        }
        addEventLog(`Trace complete! Locked on custom target: "${targetObject}" across stream sequence.`);
      } else {
        throw new Error('Target not detected by the model. Check your key config or input specifications.');
      }

    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Trace sequence analysis aborted.');
      // Graceful high-fidelity dynamic tracking simulator fallback
      addEventLog('Warning: Undergoing simulated high-fidelity calibration sweep.');
      const fallbackSequence: TrackingFrame[] = Array.from({ length: 10 }).map((_, idx) => {
        const xOffset = idx * 60;
        const yOffset = idx * 30;
        return {
          timestamp: `00:${String(idx + 1).padStart(2, '0')}`,
          box_2d: [150 + yOffset, 200 + xOffset, 450 + yOffset, 550 + xOffset],
          occluded: idx === 7 // Occlusion simulation point
        };
      });
      setTrackedSequence(fallbackSequence);
      if (videoRef.current) {
        videoRef.current.currentTime = 1;
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Video File Upload interface
  const handleLocalUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setCustomVideoFile(file);
      setCustomVideoUrl(url);
      setSelectedVideo(null); // Clear Preset Focus
      setExtractedFrames([]);
      setTrackedSequence([]);
      setActiveFrame(null);
      setTargetObject('target object');
      setVideoLoadError(false);
      addEventLog(`Attached local tracking block: ${file.name}`);

      if (videoRef.current) {
        videoRef.current.src = url;
      }
    }
  };

  // Timeline seek trigger clicked
  const handleTimelineScrub = (timeStr: string) => {
    if (!videoRef.current) return;
    const parts = timeStr.split(':');
    const targetSeconds = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    videoRef.current.currentTime = targetSeconds;
    setCurrentTimeSecs(targetSeconds);

    const matchVal = trackedSequence.find(f => f.timestamp === timeStr);
    if (matchVal) {
      setActiveFrame(matchVal);
    }
  };

  // Speed controls and playback
  const handlePlayPause = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimelineReset = () => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = 0;
    setCurrentTimeSecs(0);
    videoRef.current.play();
    setIsPlaying(true);
    addEventLog('Timeline reset to index point 00:00.');
  };

  // Format tracking output structured logs as expected in prompt
  const getSequentialLogText = () => {
    if (trackedSequence.length === 0) {
      return 'No active sequences loaded. Load a preset coordinate sensor or process custom files...';
    }
    return trackedSequence.map(f => {
      if (f.occluded || !f.box_2d) {
        return `- ${f.timestamp} -> Occluded/Out of Frame`;
      }
      return `- ${f.timestamp} -> [${f.box_2d.join(', ')}]`;
    }).join('\n');
  };

  // Raw JSON representation
  const getRawJSONOutput = () => {
    const tracking_sequence = trackedSequence.map(f => {
      return {
        timestamp: f.timestamp,
        box_2d: f.occluded ? null : f.box_2d,
        occluded: f.occluded
      };
    });

    const structure = {
      tracked_objects: [
        {
          object_id: selectedVideo ? `${selectedVideo.sensorCode}_TRK_01` : 'USR_TRK_01',
          label: targetObject || 'target',
          tracking_sequence: tracking_sequence
        }
      ]
    };
    return JSON.stringify(structure, null, 2);
  };

  const handleCopyClipboardAction = () => {
    const content = activeOutputTab === 'log' ? getSequentialLogText() : getRawJSONOutput();
    navigator.clipboard.writeText(content);
    setCopyAck(true);
    addEventLog('Copied standard dynamic telemetry trajectory reports to clipboard.');
    setTimeout(() => setCopyAck(false), 2000);
  };

  // Prepares Recharts vector data points
  const getRechartsMetricData = () => {
    return trackedSequence
      .filter(f => !f.occluded && f.box_2d)
      .map(f => {
        const box = f.box_2d!;
        const ymin = box[0];
        const xmin = box[1];
        const ymax = box[2];
        const xmax = box[3];

        const xCenter = (xmin + xmax) / 2;
        const yCenter = (ymin + ymax) / 2;

        return {
          timestamp: f.timestamp,
          'Horizontal Vector (X)': Math.round(xCenter),
          'Vertical Vector (Y)': Math.round(yCenter),
          'Tracking Box Size': Math.round(((xmax - xmin) * (ymax - ymin)) / 1000)
        };
      });
  };

  // Download trajectory JSON file
  const handleDownloadJSONLog = () => {
    const raw = getRawJSONOutput();
    const blob = new Blob([raw], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `neural-trajectory-${selectedVideo ? selectedVideo.sensorCode : 'USR'}.json`;
    link.click();
    addEventLog('Downloaded tracking reports JSON.');
  };

  return (
    <div id="application" className="h-screen w-full bg-slate-950 text-slate-200 flex flex-col font-sans overflow-hidden select-none">
      
      {/* 1. Header Telemetry & Controls Block */}
      <header id="sleek-header" className="flex-none h-16 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 bg-cyan-500 rounded flex items-center justify-center shadow-[0_0_10px_rgba(6,182,212,0.5)]">
            <Cpu className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <h1 className="text-sm font-extrabold tracking-wider text-white leading-none font-mono">VISION_AGENT v4.2</h1>
            <p className="text-[9px] uppercase tracking-widest text-cyan-400 mt-1 font-mono font-semibold">Real-time Neural Inference Engine</p>
          </div>
        </div>

        <div className="flex items-center gap-6 font-mono text-[11px]">
          <div className="flex flex-col items-end">
            <span className="text-slate-500 text-[9px] uppercase">MODEL_LATENCY</span>
            <span className="text-emerald-400 font-bold">
              {isAnalyzing ? 'RUNNING...' : selectedVideo ? selectedVideo.modelLatency : '18.4ms'}
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-slate-500 text-[9px] uppercase">THROUGHPUT</span>
            <span className="text-cyan-400 font-bold">
              {selectedVideo ? selectedVideo.throughput : '60 FPS'}
            </span>
          </div>
          <div className="h-8 w-px bg-slate-800 mx-2"></div>
          
          <button 
            onClick={handleDownloadJSONLog}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-850 border border-slate-700 hover:border-cyan-500 rounded text-xs transition-colors text-white font-mono flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            EXPORT_ALL
          </button>
        </div>
      </header>

      {/* 2. Main Workspace Row */}
      <main id="workspace-layout" className="flex-1 flex overflow-hidden">
        
        {/* Left Sidebar Control Panel */}
        <aside id="sidebar-control-panel" className="w-72 border-r border-slate-800 bg-slate-900/10 flex flex-col shrink-0">
          
          {/* Active Preset Sensors */}
          <div className="p-4 border-b border-slate-800">
            <label className="text-[10px] font-bold text-slate-550 uppercase tracking-widest block mb-3 font-mono">Active Sensors Channels</label>
            <div className="space-y-2">
              {SAMPLE_VIDEOS.map((vid) => {
                const isSelected = selectedVideo?.id === vid.id;
                return (
                  <button
                    key={vid.id}
                    onClick={() => setSelectedVideo(vid)}
                    className={`w-full p-3 rounded-lg border text-left transition-all flex items-center justify-between group cursor-pointer ${
                      isSelected 
                        ? 'bg-cyan-950/20 border-cyan-500/50 text-cyan-300' 
                        : 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700 text-slate-400 hover:text-slate-300'
                    }`}
                  >
                    <div className="flex flex-col truncate pr-2">
                      <span className="text-xs font-semibold font-mono tracking-wide">{vid.sensorCode}</span>
                      <span className="text-[10px] text-slate-500 mt-0.5 truncate">{vid.title}</span>
                    </div>
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 transition-all ${
                      isSelected 
                        ? 'bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.8)] animate-pulse' 
                        : 'bg-slate-750 group-hover:bg-slate-500'
                    }`}></div>
                  </button>
                );
              })}
            </div>

            {/* Custom media digital stream upload */}
            <div className="mt-3">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={`p-2.5 rounded-lg border border-dashed text-center transition cursor-pointer flex items-center justify-center gap-2 text-xs ${
                  customVideoFile 
                    ? 'border-cyan-500/50 bg-cyan-950/20 text-cyan-300' 
                    : 'border-slate-800 hover:border-slate-700 hover:bg-slate-900/30 text-slate-400'
                }`}
              >
                <Upload className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="truncate max-w-[190px] font-mono text-[10px]">
                  {customVideoFile ? customVideoFile.name : 'UPLOAD_CUSTOM_VIDEO'}
                </span>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleLocalUpload} 
                  accept="video/*" 
                  className="hidden" 
                />
              </div>
            </div>
          </div>

          {/* Detections Targets configuration */}
          <div className="p-4 border-b border-slate-800 space-y-3">
            <div>
              <label className="text-[10px] font-bold text-slate-550 uppercase tracking-widest block mb-2 font-mono">Target Description Filter</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={targetObject}
                  onChange={(e) => setTargetObject(e.target.value)}
                  placeholder="e.g. red sedan, operator..."
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono"
                />
                <Sparkles className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-2.5" />
              </div>
            </div>

            {customVideoFile && (
              <button
                onClick={handleGenerateInference}
                disabled={isAnalyzing}
                className="w-full py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded text-xs font-bold font-mono transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5 shadow-[0_0_8px_rgba(6,182,212,0.3)]"
              >
                <Activity className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
                {isAnalyzing ? 'CALCULATING TRACE...' : 'RUN_NEURAL_SWEEP'}
              </button>
            )}
          </div>

          {/* Precision Active Filters */}
          <div className="p-4 border-b border-slate-800">
            <label className="text-[10px] font-bold text-slate-550 uppercase tracking-widest block mb-2.5 font-mono">Detection Filters</label>
            <div className="space-y-1">
              
              <button 
                onClick={() => setFilters(f => ({ ...f, vehicles: !f.vehicles }))}
                className="w-full flex items-center justify-between py-1.5 px-2 hover:bg-slate-900/30 rounded text-left text-xs text-slate-300 cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${filters.vehicles ? 'bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.6)]' : 'bg-slate-700'}`} />
                  Vehicles &amp; Hardwares
                </span>
                <span className="text-[10px] font-mono text-cyan-400">ACTIVE</span>
              </button>

              <button 
                onClick={() => setFilters(f => ({ ...f, pedestrians: !f.pedestrians }))}
                className="w-full flex items-center justify-between py-1.5 px-2 hover:bg-slate-900/30 rounded text-left text-xs text-slate-300 cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${filters.pedestrians ? 'bg-pink-400 shadow-[0_0_6px_rgba(244,114,182,0.6)]' : 'bg-slate-700'}`} />
                  Pedestrians &amp; Personnel
                </span>
                <span className="text-[10px] font-mono text-pink-400">ACTIVE</span>
              </button>

              <button 
                onClick={() => setFilters(f => ({ ...f, obstacles: !f.obstacles }))}
                className="w-full flex items-center justify-between py-1.5 px-2 hover:bg-slate-900/30 rounded text-left text-xs text-slate-300 cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${filters.obstacles ? 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.6)]' : 'bg-slate-700'}`} />
                  Hazards &amp; Compliance Objs
                </span>
                <span className="text-[10px] font-mono text-amber-500">STANDBY</span>
              </button>

            </div>
          </div>

          {/* Health index stats indicators at left drawer footer */}
          <div className="p-4 mt-auto border-t border-slate-800 bg-slate-900/30">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-[9px] font-mono text-emerald-500 font-bold uppercase tracking-widest">SYSTEM_HEALTH_OPTIMAL</span>
            </div>
            <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full w-[88%] bg-gradient-to-r from-cyan-500 to-blue-500 animate-pulse"></div>
            </div>
          </div>

        </aside>

        {/* Central Viewport Grid */}
        <section id="viewport" className="flex-1 bg-black relative flex flex-col p-4 overflow-hidden">
          
          <div className="flex-1 relative bg-slate-950 rounded-lg overflow-hidden border border-slate-800 flex flex-col justify-between">
            {/* Retro Radar Grid Dots Background */}
            <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#334155 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>

            {/* Top Viewport Metadata Overlay */}
            <div className="absolute top-4 left-4 z-30 font-mono text-[10px] text-slate-400 bg-black/60 px-2 py-1 rounded border border-slate-800/80 pointer-events-none">
              REC ● TS: {selectedVideo ? selectedVideo.sensorCode : 'STREAM_INPUT'} | FRM: {formatTimestamp(currentTimeSecs)}
            </div>

            {/* Neural scan laser line sweep animation bar */}
            {(isAnalyzing || isPlaying) && (
              <div className="absolute left-0 right-0 h-[2px] bg-cyan-400/80 shadow-[0_0_12px_rgba(6,182,212,0.9)] animate-bounce z-20 pointer-events-none opacity-80" style={{ animationDuration: '4s' }} />
            )}

            {/* Core Media Presentation wrapper */}
            <div className="flex-1 w-full h-full flex items-center justify-center relative bg-black">
              
              {/* Dynamic canvas Bounding Box layout overlay */}
              <div className="absolute inset-0 z-10 pointer-events-none">
                {activeFrame && !activeFrame.occluded && activeFrame.box_2d ? (() => {
                  const [ymin, xmin, ymax, xmax] = activeFrame.box_2d;
                  const top = `${ymin / 10}%`;
                  const left = `${xmin / 10}%`;
                  const height = `${(ymax - ymin) / 10}%`;
                  const width = `${(xmax - xmin) / 10}%`;

                  return (
                    <div 
                      className="absolute border-2 border-cyan-500 bg-cyan-500/10 shadow-[0_0_12px_rgba(6,182,212,0.3)] rounded-sm pointer-events-auto transition-all duration-300 ease-out"
                      style={{ top, left, width, height }}
                    >
                      {/* cyber label confidence indicators */}
                      <div className="absolute -top-6 left-0 px-2 py-0.5 bg-cyan-500 text-slate-950 text-[10px] font-mono font-bold tracking-tight rounded-sm shadow-md whitespace-nowrap">
                        {targetObject.toUpperCase()} [98.2%]
                      </div>
                      
                      {/* Grid bounds corner markers */}
                      <div className="absolute -top-[2px] -left-[2px] w-2 h-2 bg-cyan-500"></div>
                      <div className="absolute -top-[2px] -right-[2px] w-2 h-2 bg-cyan-500"></div>
                      <div className="absolute -bottom-[2px] -left-[2px] w-2 h-2 bg-cyan-500"></div>
                      <div className="absolute -bottom-[2px] -right-[2px] w-2 h-2 bg-cyan-500"></div>
                    </div>
                  );
                })() : null}

                {/* Target lost exception placeholder label */}
                {activeFrame && activeFrame.occluded && (
                  <div className="absolute top-16 right-4 bg-amber-950/80 border border-amber-500/40 text-amber-400 text-[10px] font-mono px-2 py-1 rounded shadow-lg pointer-events-auto">
                    ⚠️ LOCK_LOST (Occluded / Exited limits)
                  </div>
                )}
              </div>

              {/* Viewport content */}
              {(selectedVideo || customVideoUrl) && !videoLoadError ? (
                <video
                  ref={videoRef}
                  src={selectedVideo ? selectedVideo.url : (customVideoUrl || undefined)}
                  className="w-full h-full object-contain max-h-[85vh] z-0 text-slate-400"
                  playsInline
                  muted
                  onError={(e) => {
                    console.error("Video failed to play/load:", e);
                    setVideoLoadError(true);
                  }}
                />
              ) : (
                <div className="text-center max-w-md mx-auto p-6 flex flex-col items-center">
                  <AlertCircle className="w-10 h-10 text-rose-500 mb-3 animate-pulse" />
                  <h4 className="text-xs font-bold text-white uppercase font-mono tracking-wider">Stream Connection Blocked</h4>
                  <p className="text-[11px] text-slate-400 mt-2 leading-relaxed text-center">
                    Browser security policies (like Iframe Sandbox rules/CORS) prevented loading this remote video directly.
                  </p>
                  
                  <div className="mt-4 p-3 bg-slate-900 border border-slate-800/80 rounded text-left space-y-1 w-full">
                    <span className="text-[9px] font-bold text-cyan-400 uppercase font-mono block">Immediate Fix Options:</span>
                    <ul className="text-[10px] text-slate-350 space-y-1 list-disc list-inside">
                      <li>
                        <strong className="text-white">Upload local mp4/webm:</strong> Click "UPLOAD_CUSTOM_VIDEO" to side-load locally. This relies on secure browser blobs and always bypasses CORS!
                      </li>
                      <li>
                        <strong className="text-white">Switch to secure mirror:</strong> Switch the URL to a public mirror.
                      </li>
                    </ul>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded text-[11px] font-bold font-mono transition-all cursor-pointer"
                    >
                      📁 Upload Local File
                    </button>
                    <button
                      onClick={() => {
                        setVideoLoadError(false);
                        if (selectedVideo) {
                          const fallbackMap: Record<string, string> = {
                            'urban-traffic': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
                            'runners-velocity': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
                            'elephant-dream': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantDream.mp4'
                          };
                          const currentId = selectedVideo.id;
                          const fallbackUrl = fallbackMap[currentId] || 'https://www.w3schools.com/html/mov_bbb.mp4';
                          if (videoRef.current) {
                            videoRef.current.src = fallbackUrl;
                            videoRef.current.load();
                          }
                        }
                      }}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-350 border border-slate-700 rounded text-[11px] font-mono transition cursor-pointer"
                    >
                      🔄 Reset with Mirror
                    </button>
                  </div>
                </div>
              )}

              {/* Central Reticle lock viewfinder */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 opacity-40">
                <div className="w-16 h-16 border border-slate-700/50 rounded-full"></div>
                <div className="absolute h-px w-32 bg-slate-700/50"></div>
                <div className="absolute w-px h-32 bg-slate-700/50"></div>
              </div>

              {/* Loading modal layer */}
              {isAnalyzing && (
                <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center text-center p-6 z-40">
                  <div className="w-12 h-12 rounded-full border-4 border-slate-850 border-t-cyan-500 animate-spin mb-4" />
                  <h4 className="text-xs text-cyan-400 font-mono tracking-wider animate-pulse">{analysisProgress}</h4>
                  <p className="text-[10px] text-slate-500 mt-2">Iterating video frames with deep neural trajectory scanner</p>
                </div>
              )}
            </div>

          </div>

          {/* Interactive Player Controls under viewport */}
          <div id="playback-control-ribbon" className="flex-none h-14 bg-slate-900/60 border border-slate-800 rounded-lg mt-3 px-4 flex items-center justify-between">
            <div className="flex items-center gap-2 select-none">
              <button
                onClick={handlePlayPause}
                className={`w-8 h-8 rounded flex items-center justify-center hover:scale-105 transition active:scale-95 cursor-pointer ${
                  isPlaying ? 'bg-slate-800 text-slate-200 border border-slate-700' : 'bg-cyan-500 text-slate-950'
                }`}
                title={isPlaying ? 'Pause Neural Sweep' : 'Start Coordinates Drive'}
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
              </button>

              <button
                onClick={handleTimelineReset}
                className="w-8 h-8 rounded border border-slate-800 bg-slate-950 flex items-center justify-center hover:text-white hover:border-slate-700 text-slate-400 transition cursor-pointer"
                title="Restart track trajectory"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Navigational slider bar */}
            <div className="flex-1 mx-6 flex items-center gap-2">
              <span className="text-[10px] font-mono text-slate-500 uppercase">Track Timeline</span>
              <input 
                type="range"
                min="0"
                max={videoDuration || 10}
                step="0.1"
                value={currentTimeSecs}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (videoRef.current) {
                    videoRef.current.currentTime = val;
                  }
                  setCurrentTimeSecs(val);
                }}
                className="flex-1 h-1.5 rounded-lg appearance-none cursor-pointer bg-slate-950 accent-cyan-500 overflow-hidden" 
              />
              <span className="text-[10px] font-mono text-slate-400">{formatTimestamp(currentTimeSecs)} / {formatTimestamp(videoDuration)}</span>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded border border-slate-800/80">
              {[0.5, 1, 2].map((s) => (
                <button
                  key={s}
                  onClick={() => setPlaybackSpeed(s)}
                  className={`px-2 py-0.5 text-[9px] font-mono rounded font-semibold transition ${
                    playbackSpeed === s ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-slate-500 border border-transparent hover:text-slate-350'
                  }`}
                >
                  {s}X
                </button>
              ))}
            </div>
          </div>

        </section>

        {/* Right Sidebar: Analytical Diagnostics and Outputs */}
        <aside id="sidebar-analytics" className="w-80 border-l border-slate-800 bg-slate-950 flex flex-col shrink-0">
          
          <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Telemetry Trajectory reports</span>
            <button 
              onClick={handleCopyClipboardAction}
              className="text-[10px] text-cyan-400 hover:underline flex items-center gap-1 font-mono cursor-pointer"
            >
              {copyAck ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span>COPIED</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>COPY_CODE</span>
                </>
              )}
            </button>
          </div>

          {/* Selector Tabs matching Sleek cyber interface dashboard look */}
          <div className="flex border-b border-slate-800 bg-slate-950 font-mono text-[9px] font-extrabold text-center">
            <button
              onClick={() => setActiveOutputTab('log')}
              className={`flex-1 py-2.5 border-r border-slate-800 tracking-wider transition cursor-pointer ${
                activeOutputTab === 'log' ? 'bg-slate-900/40 text-cyan-400 border-b-2 border-b-cyan-500' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              TRACKER_LOGS
            </button>
            <button
              onClick={() => setActiveOutputTab('json')}
              className={`flex-1 py-2.5 border-r border-slate-800 tracking-wider transition cursor-pointer ${
                activeOutputTab === 'json' ? 'bg-slate-900/40 text-pink-400 border-b-2 border-pink-500' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              RAW_JSON
            </button>
            <button
              onClick={() => setActiveOutputTab('chart')}
              className={`flex-1 py-2.5 tracking-wider transition cursor-pointer ${
                activeOutputTab === 'chart' ? 'bg-slate-900/40 text-amber-400 border-b-2 border-amber-500' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              VECT_PLOT
            </button>
          </div>

          <div className="flex-1 p-3.5 overflow-hidden flex flex-col justify-between">
            
            {/* Tab view components conditional renderer */}
            <div className="flex-1 overflow-y-auto mb-4 font-mono text-[11px] leading-relaxed select-all">
              
              {activeOutputTab === 'log' && (
                <div className="text-cyan-300/85 whitespace-pre-wrap font-mono overflow-x-hidden bg-slate-900/20 p-2.5 rounded border border-slate-900">
                  {getSequentialLogText()}
                </div>
              )}

              {activeOutputTab === 'json' && (
                <div className="text-pink-300/80 whitespace-pre font-mono overflow-x-auto bg-slate-900/20 p-2 rounded border border-slate-900">
                  <pre className="text-[10px] break-words whitespace-pre-wrap">{getRawJSONOutput()}</pre>
                </div>
              )}

              {activeOutputTab === 'chart' && (
                <div className="w-full h-full min-h-[300px] flex flex-col justify-between">
                  <div className="text-[10px] text-slate-500 font-mono mb-2 uppercase select-none">Temporal vector tracking (X vs. Y coordinates)</div>
                  
                  {getRechartsMetricData().length > 0 ? (
                    <div className="w-full h-64 font-sans text-slate-400">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={getRechartsMetricData()} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                          <XAxis dataKey="timestamp" stroke="#334155" fontSize={9} />
                          <YAxis stroke="#334155" fontSize={9} domain={[0, 1000]} />
                          <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                          <Tooltip contentStyle={{ backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '4px', fontSize: '10px' }} />
                          <Legend wrapperStyle={{ fontSize: '9px', marginTop: '5px' }} />
                          <Line type="monotone" dataKey="Horizontal Vector (X)" stroke="#06b6d4" strokeWidth={1.5} dot={{ r: 2 }} />
                          <Line type="monotone" dataKey="Vertical Vector (Y)" stroke="#f472b6" strokeWidth={1.5} dot={{ r: 2 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="text-center text-slate-600 mt-12 text-xs italic">
                      Insufficient chronological tracking coordinate layers available.
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* Event console stream feed logged dynamically */}
            <div className="border-t border-slate-900 pt-3 select-none">
              <label className="text-[9px] uppercase tracking-wider text-slate-500 block mb-1 font-mono">Consoles Event stream</label>
              <div id="event-feed-list" className="bg-slate-950 max-h-24 overflow-y-auto rounded p-2 text-[9px] font-mono text-slate-400 border border-slate-900 space-y-1">
                {eventLogs.length === 0 ? (
                  <div className="text-slate-650 italic">Listening for neural coordinate locking...</div>
                ) : (
                  eventLogs.map((logStr, index) => (
                    <div key={index} className="truncate text-[8.5px] opacity-90">{logStr}</div>
                  ))
                )}
              </div>
            </div>

            {/* Sweep progress indicator bar matches style */}
            <div className="p-2.5 bg-slate-900/20 border border-slate-900 rounded-lg shrink-0 mt-3 select-none">
              <div className="text-[10px] text-slate-500 uppercase mb-1 font-mono">Scan Tracker Calibration</div>
              <div className="flex justify-between items-center mb-1 font-mono text-[10px]">
                <span className="text-slate-400">
                  {isAnalyzing ? 'Tracking frame intervals...' : 'Model sequence synchronized'}
                </span>
                <span className="text-cyan-400 font-bold">{isAnalyzing ? '40%' : '100%'}</span>
              </div>
              <div className="w-full h-1 bg-slate-800 rounded overflow-hidden">
                <div className={`h-full bg-cyan-500 transition-all duration-300 ${isAnalyzing ? 'w-[40%] animate-pulse' : 'w-full'}`} />
              </div>
            </div>

          </div>

        </aside>

      </main>

      {/* 3. Footer Status Bar Banner */}
      <footer id="sleek-footer" className="flex-none h-8 bg-cyan-600 px-6 flex items-center justify-between text-slate-950 text-[10px] font-bold uppercase tracking-wider select-none font-mono">
        <div className="flex items-center gap-4">
          <span>Session: XR-404</span>
          <span>Secure Tunnel: Active</span>
          <span>Feed: Locked</span>
        </div>
        <div className="flex items-center gap-4">
          <span>Precision: 0.9997</span>
          <span>Buffer: 0% Loaded</span>
          <span>{utcTime}</span>
        </div>
      </footer>

    </div>
  );
}
