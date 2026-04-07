import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Download, Video } from 'lucide-react';

const Preview = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const video = state?.video;

  if (!video) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4">
        <p>Video not found</p>
        <button onClick={() => navigate('/dashboard')} className="btn-primary">Back to Dashboard</button>
      </div>
    );
  }

  const clips = video.clips || [];

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 pt-8">
      <button 
        onClick={() => navigate('/dashboard')}
        className="flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </button>

      <h1 className="text-2xl font-bold mb-2">Generated Shorts</h1>
      <p className="text-slate-400 mb-8 max-w-2xl">
        Review your AI-generated clips. We extracted the most engaging moments from "{video.originalFilename}".
      </p>

      {clips.length === 0 ? (
        <div className="card p-12 text-center text-slate-400">
          No clips generated for this video. Something might have failed during clipping.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {clips.map((clip, i) => {
            // Use dynamically assigned MinIO presigned URL
            const videoUrl = clip.url || '';

            return (
              <div key={clip.id} className="card group flex flex-col h-full bg-surface border-white/5">
                {/* Video Player */}
                <div className="relative pt-[177%] w-full bg-black/50 overflow-hidden flex-shrink-0">
                  {clip.localUrl ? (
                    <video 
                      src={videoUrl}
                      controls
                      className="absolute top-0 left-0 w-full h-full object-cover"
                      preload="metadata"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Play className="w-12 h-12 text-white/20" />
                    </div>
                  )}
                  <div className="absolute top-3 left-3 bg-black/60 backdrop-blur px-2 py-1 rounded text-xs font-medium">
                    Part {i + 1}
                  </div>
                </div>

                {/* Details */}
                <div className="p-4 flex flex-col flex-grow">
                  <h3 className="font-semibold text-lg line-clamp-2 leading-tight mb-2">{clip.title}</h3>
                  <p className="text-xs text-slate-400 mb-4 line-clamp-3 bg-background/50 p-2 rounded flex-grow">
                    <strong>AI Note:</strong> {clip.reason || "Engaging moment"}
                  </p>

                  <div className="flex flex-wrap gap-2 mt-auto">
                    {/* These wouldn't work perfectly locally without real YT logic, but UI shows the intent */}
                    <button className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded font-medium text-sm flex items-center justify-center gap-2 transition active:scale-95">
                      <Video className="w-4 h-4"/> Upload
                    </button>
                    <button 
                      onClick={() => navigate(`/editor/${clip.id}`, { state: { video: clip } })}
                      className="bg-primary/20 hover:bg-primary/30 text-primary py-2 px-3 flex items-center justify-center rounded transition active:scale-95"
                      title="Edit this Short"
                    >
                      <span className="text-sm font-medium">Edit</span>
                    </button>
                    <a 
                      href={videoUrl} 
                      download 
                      target="_blank"
                      rel="noreferrer"
                      className="w-10 bg-white/10 hover:bg-white/20 flex items-center justify-center rounded transition active:scale-95"
                    >
                      <Download className="w-4 h-4 text-white" />
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Preview;
