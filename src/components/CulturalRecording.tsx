import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Mic, MicOff, Square, Play, Pause, Download, Upload, 
  X, AlertCircle, CheckCircle, Clock, Globe, Volume2,
  Music, BookOpen, Sparkles, Hammer, Utensils, Heart, Tag
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface Recording {
  id: string;
  title: string;
  description: string;
  category: string;
  language: string;
  duration: number;
  audioUrl?: string;
  transcript?: string;
  translation?: string;
  metadata: {
    recordingDate: string;
    location?: string;
    storytellerInfo?: string;
    culturalContext?: string;
    tags: string[];
  };
  status: 'draft' | 'processing' | 'completed' | 'published';
  createdAt: string;
}

interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  audioBlob?: Blob;
  audioUrl?: string;
  isUploading: boolean;
  error?: string;
}

const languages = [
  { code: 'en', name: 'English' },
  { code: 'kal', name: 'Kalabari' },
  { code: 'pidgin', name: 'Nigerian Pidgin' },
  { code: 'ig', name: 'Igbo' },
  { code: 'yo', name: 'Yoruba' },
];

const categories = [
  { id: 'history', name: 'Historical Events', icon: Clock },
  { id: 'traditions', name: 'Cultural Traditions', icon: Globe },
  { id: 'language', name: 'Language & Proverbs', icon: Volume2 },
  { id: 'music', name: 'Music & Songs', icon: Music },
  { id: 'stories', name: 'Folktales & Legends', icon: BookOpen },
  { id: 'rituals', name: 'Rituals & Ceremonies', icon: Sparkles },
  { id: 'crafts', name: 'Traditional Crafts', icon: Hammer },
  { id: 'food', name: 'Food & Cuisine', icon: Utensils },
  { id: 'medicine', name: 'Traditional Medicine', icon: Heart },
];

export function CulturalRecording() {
  const { user, token } = useAuth();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number>();

  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [currentRecording, setCurrentRecording] = useState<Recording | null>(null);
  const [recordingState, setRecordingState] = useState<RecordingState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    isUploading: false,
  });

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    language: 'en',
    location: '',
    storytellerInfo: '',
    culturalContext: '',
    tags: [] as string[],
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [volume, setVolume] = useState(1);

  // Initialize audio context and analyzer
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        const audioContext = new AudioContext();
        analyserRef.current = audioContext.createAnalyser();
        analyserRef.current.fftSize = 2048;
      }
    }
  }, []);

  // Load existing recordings
  useEffect(() => {
    if (token) {
      loadRecordings();
    }
  }, [token]);

  const loadRecordings = async () => {
    try {
      const data = await api.getElderStories();
      setRecordings(data as Recording[]);
    } catch (error) {
      console.error('Failed to load recordings:', error);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
        },
        video: false, // Audio only for now
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        setRecordingState(prev => ({
          ...prev,
          audioBlob,
          audioUrl,
          isRecording: false,
        }));

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(1000); // Collect data every second
      setRecordingState(prev => ({ ...prev, isRecording: true }));

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingState(prev => ({ ...prev, duration: prev.duration + 1 }));
      }, 1000);

      // Visual feedback
      startVisualizer();

    } catch (error) {
      console.error('Error starting recording:', error);
      setRecordingState(prev => ({
        ...prev,
        error: 'Failed to access microphone. Please check permissions.',
      }));
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recordingState.isRecording) {
      mediaRecorderRef.current.stop();
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      stopVisualizer();
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && recordingState.isRecording) {
      mediaRecorderRef.current.pause();
      setRecordingState(prev => ({ ...prev, isPaused: true }));
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && recordingState.isPaused) {
      mediaRecorderRef.current.resume();
      setRecordingState(prev => ({ ...prev, isPaused: false }));
      
      timerRef.current = setInterval(() => {
        setRecordingState(prev => ({ ...prev, duration: prev.duration + 1 }));
      }, 1000);
    }
  };

  const startVisualizer = () => {
    if (!canvasRef.current || !analyserRef.current) return;

    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext('2d');
    const analyser = analyserRef.current;

    analyser.getByteFrequencyData(new Uint8Array(analyser.frequencyBinCount));

    const draw = () => {
      if (!recordingState.isRecording) return;

      requestAnimationFrame(draw);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyser.getByteFrequencyData(dataArray);

      canvasCtx.fillStyle = 'rgb(249, 115, 22)';
      canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 255 * canvas.height * 0.8;
        
        canvasCtx.fillStyle = `rgb(${Math.floor(barHeight + 100)}, 249, 115)`;
        canvasCtx.fillRect(x, canvas.height - barHeight - 1, barWidth, barHeight);
        
        x += barWidth + 1;
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();
  };

  const stopVisualizer = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    if (canvasRef.current) {
      const canvasCtx = canvasRef.current.getContext('2d');
      canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  const saveRecording = async () => {
    if (!recordingState.audioBlob || !token) return;

    setRecordingState(prev => ({ ...prev, isUploading: true }));

    try {
      // Convert Blob to File
      const audioFile = new File([recordingState.audioBlob], `recording-${Date.now()}.webm`, {
        type: 'audio/webm',
        lastModified: Date.now(),
      });
      
      // Upload audio file
      const uploadResponse = await api.uploadFile(token, audioFile);
      const audioUrl = (uploadResponse as { url: string }).url;

      // Create recording entry
      const recordingData = {
        title: formData.title || `Recording ${new Date().toLocaleString()}`,
        description: formData.description,
        category: formData.category || 'stories',
        language: formData.language,
        duration: recordingState.duration,
        audioUrl,
        metadata: {
          recordingDate: new Date().toISOString(),
          location: formData.location,
          storytellerInfo: formData.storytellerInfo,
          culturalContext: formData.culturalContext,
          tags: formData.tags,
        },
        status: 'completed',
      };

      const savedRecording = await api.createElderStory(token, recordingData);
      
      setRecordings(prev => [savedRecording as Recording, ...prev]);
      setCurrentRecording(savedRecording as Recording);
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        category: '',
        language: 'en',
        location: '',
        storytellerInfo: '',
        culturalContext: '',
        tags: [],
      });

      setRecordingState({
        isRecording: false,
        isPaused: false,
        duration: 0,
        audioUrl: recordingState.audioUrl,
        isUploading: false,
      });

    } catch (error) {
      console.error('Error saving recording:', error);
      setRecordingState(prev => ({
        ...prev,
        isUploading: false,
        error: 'Failed to save recording. Please try again.',
      }));
    }
  };

  const deleteRecording = async (recordingId: string) => {
    if (!token) return;

    try {
      await api.deleteElderStory(token, recordingId);
      setRecordings(prev => prev.filter(r => r.id !== recordingId));
      if (currentRecording?.id === recordingId) {
        setCurrentRecording(null);
      }
    } catch (error) {
      console.error('Error deleting recording:', error);
    }
  };

  const playPauseAudio = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !formData.tags.includes(trimmedTag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, trimmedTag],
      }));
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove),
    }));
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Recording Interface */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <Mic className="w-6 h-6 text-primary" />
          Cultural Recording Studio
        </h2>

        {/* Visualizer */}
        <div className="mb-6">
          <canvas
            ref={canvasRef}
            width={800}
            height={200}
            className="w-full h-48 bg-gray-100 dark:bg-gray-900 rounded-lg"
          />
        </div>

        {/* Recording Controls */}
        <div className="flex flex-col items-center space-y-4 mb-6">
          <div className="flex items-center gap-4">
            {!recordingState.isRecording ? (
              <button
                onClick={startRecording}
                className="p-4 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                disabled={recordingState.isUploading}
              >
                <Mic className="w-6 h-6" />
              </button>
            ) : (
              <>
                {recordingState.isPaused ? (
                  <button
                    onClick={resumeRecording}
                    className="p-4 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors"
                  >
                    <Play className="w-6 h-6" />
                  </button>
                ) : (
                  <button
                    onClick={pauseRecording}
                    className="p-4 bg-yellow-500 text-white rounded-full hover:bg-yellow-600 transition-colors"
                  >
                    <Pause className="w-6 h-6" />
                  </button>
                )}
                <button
                  onClick={stopRecording}
                  className="p-4 bg-gray-500 text-white rounded-full hover:bg-gray-600 transition-colors"
                >
                  <Square className="w-6 h-6" />
                </button>
              </>
            )}
          </div>

          {/* Duration Display */}
          <div className="text-center">
            <div className="text-3xl font-mono text-gray-700 dark:text-gray-300">
              {formatDuration(recordingState.duration)}
            </div>
            {recordingState.isRecording && (
              <div className="flex items-center gap-2 justify-center text-red-500">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-sm">Recording...</span>
              </div>
            )}
          </div>
        </div>

        {/* Error Display */}
        {recordingState.error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
              <AlertCircle className="w-5 h-5" />
              <span>{recordingState.error}</span>
            </div>
          </div>
        )}

        {/* Audio Playback */}
        {recordingState.audioUrl && (
          <div className="space-y-4">
            <audio
              ref={audioRef}
              src={recordingState.audioUrl}
              controls={false}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
            />
            
            <div className="flex items-center gap-4">
              <button
                onClick={playPauseAudio}
                className="p-2 bg-primary text-white rounded-full hover:bg-primary/90 transition-colors"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
              
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-gray-600" />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={(e) => {
                    setVolume(parseFloat(e.target.value));
                    if (audioRef.current) {
                      audioRef.current.volume = volume;
                    }
                  }}
                  className="w-24"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Speed:</span>
                <select
                  value={playbackSpeed}
                  onChange={(e) => {
                    setPlaybackSpeed(parseFloat(e.target.value));
                    if (audioRef.current) {
                      audioRef.current.playbackRate = playbackSpeed;
                    }
                  }}
                  className="text-sm border border-gray-300 dark:border-gray-700 rounded px-2 py-1"
                >
                  <option value={0.5}>0.5x</option>
                  <option value={1}>1x</option>
                  <option value={1.5}>1.5x</option>
                  <option value={2}>2x</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Metadata Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Give your recording a title"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe the cultural significance of this recording"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Language
              </label>
              <select
                value={formData.language}
                onChange={(e) => setFormData(prev => ({ ...prev, language: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {languages.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Location
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
              placeholder="Where was this recording made?"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Storyteller Information
            </label>
            <input
              type="text"
              value={formData.storytellerInfo}
              onChange={(e) => setFormData(prev => ({ ...prev, storytellerInfo: e.target.value }))}
              placeholder="Name, age, role, etc."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Cultural Context
            </label>
            <textarea
              value={formData.culturalContext}
              onChange={(e) => setFormData(prev => ({ ...prev, culturalContext: e.target.value }))}
              placeholder="Provide cultural context and background"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tags
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                >
                  {tag}
                  <button
                    onClick={() => removeTag(tag)}
                    className="hover:text-primary/70"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <input
              type="text"
              placeholder="Add tags (press Enter)"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  addTag(e.currentTarget.value);
                  e.currentTarget.value = '';
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Save Button */}
          <button
            onClick={saveRecording}
            disabled={!recordingState.audioBlob || !formData.title.trim() || recordingState.isUploading}
            className="w-full py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {recordingState.isUploading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                <span>Save Recording</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Saved Recordings */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-bold mb-4">Your Cultural Recordings</h3>
        
        {recordings.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Mic className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No recordings yet. Start recording to preserve cultural heritage.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {recordings.map((recording) => (
              <div
                key={recording.id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 dark:text-white">{recording.title}</h4>
                    {recording.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{recording.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDuration(recording.duration)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Globe className="w-3 h-3" />
                        {languages.find(l => l.code === recording.language)?.name || recording.language}
                      </span>
                      <span className="flex items-center gap-1">
                        <Tag className="w-3 h-3" />
                        {categories.find(c => c.id === recording.category)?.name || recording.category}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {recording.audioUrl && (
                      <button
                        onClick={() => {
                          if (audioRef.current) {
                            audioRef.current.src = recording.audioUrl;
                            audioRef.current.play();
                          }
                        }}
                        className="p-2 text-gray-600 hover:text-primary transition-colors"
                      >
                        <Play className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => deleteRecording(recording.id)}
                      className="p-2 text-gray-600 hover:text-red-500 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
