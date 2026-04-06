import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { UploadCloud, FileVideo, Clock, CheckCircle, AlertCircle, Loader, Trash2 } from 'lucide-react';

const Dashboard = () => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [videos, setVideos] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    fetchVideos();
  }, [navigate]);

  const fetchVideos = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/videos', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setVideos(res.data);
    } catch (error) {
      console.error(error);
      if (error.response?.status === 401) navigate('/login');
    }
  };

  const handleDelete = async (e, videoId) => {
    e.stopPropagation(); // Shield navigation collision
    if (!window.confirm("Are you sure you want to completely delete this project? This removes the video and clips from your storage.")) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/api/videos/${videoId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchVideos();
    } catch (error) {
      console.error('Delete failed', error);
      alert('Delete failed');
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('video', file);

    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:5000/api/videos/upload', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      setFile(null);
      fetchVideos();
    } catch (error) {
      console.error('Upload failed', error);
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const renderStatus = (status) => {
    const s = status.toLowerCase();
    if (s.includes('error')) return <span className="flex items-center gap-2 text-red-400"><AlertCircle className="w-4 h-4"/> Error</span>;
    if (s === 'processed') return <span className="flex items-center gap-2 text-green-400"><CheckCircle className="w-4 h-4"/> Ready</span>;
    return <span className="flex items-center gap-2 text-yellow-400"><Loader className="w-4 h-4 animate-spin"/> {status}</span>;
  };

  return (
    <div className="max-w-5xl mx-auto p-8 pt-16">
      <div className="flex justify-between items-center mb-12">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          Dashboard
        </h1>
        <button 
          onClick={() => { localStorage.removeItem('token'); navigate('/login') }}
          className="text-slate-400 hover:text-white transition"
        >
          Logout
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <div className="card p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <UploadCloud className="text-primary"/> Upload Video
            </h2>
            <form onSubmit={handleUpload}>
              <div className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center hover:bg-white/5 transition cursor-pointer relative group">
                <input 
                  type="file" 
                  accept="video/*" 
                  onChange={(e) => setFile(e.target.files[0])}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <FileVideo className="w-12 h-12 mx-auto mb-4 text-slate-500 group-hover:text-primary transition" />
                <p className="text-sm text-slate-300">
                  {file ? file.name : "Drag & drop video or click to browse"}
                </p>
              </div>
              <button 
                type="submit" 
                disabled={!file || uploading}
                className="btn-primary w-full mt-4 flex justify-center items-center gap-2 disabled:opacity-50"
              >
                {uploading ? <><Loader className="animate-spin w-5 h-5"/> Uploading...</> : "Generate Shorts"}
              </button>
            </form>
          </div>
        </div>

        <div className="md:col-span-2">
          <h2 className="text-xl font-semibold mb-4 px-2">Your Projects</h2>
          <div className="space-y-4">
            {videos.length === 0 && (
              <div className="p-8 text-center text-slate-500 bg-surface/50 rounded-xl border border-white/5">
                No videos uploaded yet.
              </div>
            )}
            {videos.map(video => (
              <div 
                key={video.id} 
                className="card p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-primary/50 transition cursor-pointer"
                onClick={() => video.status === 'processed' && navigate(`/preview/${video.id}`, { state: { video } })}
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileVideo className="text-primary w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-medium text-white line-clamp-1">{video.originalFilename}</h3>
                    <div className="text-sm text-slate-400 flex items-center gap-3 mt-1">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3"/> {new Date(video.createdAt).toLocaleDateString()}</span>
                      <span>•</span>
                      {renderStatus(video.status)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-4 md:mt-0">
                  {video.status === 'processed' && (
                    <button className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-sm transition">
                      View {video.clips?.length || 0} Clips
                    </button>
                  )}
                  <button
                    onClick={(e) => handleDelete(e, video.id)}
                    className="group hover:bg-red-500/20 text-slate-400 hover:text-red-400 p-2 rounded-lg transition"
                    title="Delete Project"
                  >
                    <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
