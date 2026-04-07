import React, { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { Play, ArrowLeft, Loader, Music, Cpu, Plus, X, ListVideo } from 'lucide-react';

const VideoEditor = () => {
  const { id: videoId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const video = location.state?.video;
  const videoUrl = video?.url;

  // Editor States
  const [cuts, setCuts] = useState([{ start: 0, end: 15 }]);
  const [musicFile, setMusicFile] = useState(null);
  const [musicType, setMusicType] = useState('none');
  const [captions, setCaptions] = useState([]);
  const [effects, setEffects] = useState([]);
  const [outputName, setOutputName] = useState('Edited_Short.mp4');
  const [processing, setProcessing] = useState(false);
  
  // AI Specific States
  const [category, setCategory] = useState('motivational');
  const [tone, setTone] = useState('');
  const [generatingAI, setGeneratingAI] = useState(false);

  // Caption Input
  const [newCapText, setNewCapText] = useState('');
  const [newCapStart, setNewCapStart] = useState(0);
  const [newCapEnd, setNewCapEnd] = useState(5);
  const [capColor, setCapColor] = useState('white');
  const [capPos, setCapPos] = useState('center');

  if (!video) {
    return (
      <div className="p-8 max-w-5xl mx-auto flex flex-col items-center">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-4">No video provided</h2>
        <button onClick={()=>navigate(-1)} className="btn-primary flex items-center gap-2"><ArrowLeft className="w-4 h-4"/> Go Back</button>
      </div>
    );
  }

  const handleGenerateAIPlan = async () => {
    setGeneratingAI(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('http://localhost:5000/api/videos/generate-edit-plan', {
        videoId: video.id,
        category,
        tone
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const plan = res.data.editPlan.editPlan;
      if (plan.cuts) setCuts(plan.cuts);
      if (plan.captions) setCaptions(plan.captions);
      if (plan.effects) setEffects(plan.effects);
      if (plan.music?.type) setMusicType(plan.music.type);
      
      alert('AI Edit Plan Loaded! Review your timeline.');
    } catch (e) {
      console.error(e);
      alert(e.response?.data?.error || 'Failed to generate AI plan. Ensure transcript is ready.');
    } finally {
      setGeneratingAI(false);
    }
  };

  const handleAddCaption = () => {
    if (!newCapText) return;
    setCaptions([...captions, { 
      text: newCapText, 
      start: parseFloat(newCapStart), 
      end: parseFloat(newCapEnd), 
      style: { color: capColor, fontSize: 60, position: capPos, bold: true } 
    }]);
    setNewCapText('');
  };

  const handleAddCut = () => {
    setCuts([...cuts, { start: 0, end: 5 }]);
  };

  const updateCut = (index, field, value) => {
    const newCuts = [...cuts];
    newCuts[index][field] = parseFloat(value) || 0;
    setCuts(newCuts);
  };

  const removeCut = (index) => {
    const newCuts = cuts.filter((_, i) => i !== index);
    setCuts(newCuts);
  };

  const handleProcess = async () => {
    setProcessing(true);
    try {
      const token = localStorage.getItem('token');
      
      let uploadedMusicUrl = null;
      if (musicFile) {
        const formData = new FormData();
        formData.append('music', musicFile);
        const musicRes = await axios.post('http://localhost:5000/api/videos/upload-music', formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        uploadedMusicUrl = musicRes.data.localUrl;
      }

      await axios.post('http://localhost:5000/api/videos/process-short', {
        videoUrl: video.localUrl,
        musicUrl: uploadedMusicUrl,
        musicType: uploadedMusicUrl ? null : musicType,
        cuts: cuts,
        captions: captions,
        effects: effects,
        outputName: outputName
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert('Short processing queued! It will appear on your dashboard.');
      navigate('/dashboard');
    } catch (e) {
      console.error(e);
      alert('Failed to process short');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 pt-12">
      <button onClick={() => navigate(-1)} className="mb-6 flex items-center gap-2 text-slate-400 hover:text-primary transition">
        <ArrowLeft className="w-5 h-5"/> Back to Dashboard
      </button>

      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          AI Auto-Editor
        </h1>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="card p-6 bg-surface/30 flex items-center justify-center">
            <video 
              src={videoUrl} 
              controls 
              className="w-full aspect-[9/16] bg-black rounded-lg object-[contain]"
            />
          </div>

          <div className="card p-6 border border-primary/30">
            <h2 className="text-xl font-semibold mb-4 text-primary flex items-center gap-2"><Cpu className="w-5 h-5"/> Generate AI Plan</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-slate-400 mb-1 block">Category/Style</label>
                <select value={category} onChange={e=>setCategory(e.target.value)} className="w-full bg-surface border border-white/10 rounded px-3 py-2 text-sm outline-none focus:border-primary transition">
                  <option value="motivational">Motivational</option>
                  <option value="podcast">Podcast Clip</option>
                  <option value="funny">Funny</option>
                  <option value="educational">Educational</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-1 block">Custom Tone (Optional)</label>
                <input type="text" placeholder="e.g. Energetic, aggressive, calm..." value={tone} onChange={e=>setTone(e.target.value)} className="w-full bg-surface border border-white/10 rounded px-3 py-2 text-sm outline-none focus:border-primary transition" />
              </div>
              <button onClick={handleGenerateAIPlan} disabled={generatingAI} className="w-full bg-white text-black hover:bg-white/80 font-semibold py-2 px-4 rounded transition flex justify-center items-center gap-2">
                {generatingAI ? <Loader className="w-4 h-4 animate-spin"/> : <Cpu className="w-4 h-4" />} 
                {generatingAI ? 'Analyzing...' : 'Auto-Generate Edit Plan'}
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 space-y-6">
          <div className="card p-6">
            <h2 className="text-xl font-semibold mb-4 text-primary flex items-center gap-2">
              <ListVideo className="w-5 h-5"/> Timeline Cuts
            </h2>
            <div className="space-y-3 mb-4">
              {cuts.map((cut, i) => (
                <div key={i} className="flex gap-4 items-center bg-black/40 p-3 rounded">
                  <span className="text-sm text-slate-400 w-16">Cut #{i+1}</span>
                  <div className="flex-1 flex items-center gap-2">
                    <span className="text-xs text-slate-500">Start (s)</span>
                    <input type="number" step="0.1" value={cut.start} onChange={e=>updateCut(i, 'start', e.target.value)} className="w-full bg-surface border border-white/10 rounded px-2 py-1 text-sm outline-none focus:border-primary" />
                  </div>
                  <div className="flex-1 flex items-center gap-2">
                    <span className="text-xs text-slate-500">End (s)</span>
                    <input type="number" step="0.1" value={cut.end} onChange={e=>updateCut(i, 'end', e.target.value)} className="w-full bg-surface border border-white/10 rounded px-2 py-1 text-sm outline-none focus:border-primary" />
                  </div>
                  <button onClick={() => removeCut(i)} className="p-2 text-red-400 hover:bg-white/10 rounded"><X className="w-4 h-4"/></button>
                </div>
              ))}
            </div>
            <button onClick={handleAddCut} className="text-sm bg-white/10 hover:bg-white/20 px-3 py-2 rounded flex items-center gap-2 transition">
              <Plus className="w-4 h-4"/> Add Cut Segment
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
             <div className="card p-6">
              <h2 className="text-xl font-semibold mb-4 text-primary flex items-center gap-2"><Music className="w-4 h-4"/> Audio Track</h2>
              
              <label className="text-sm text-slate-400 mb-1 block">Stock Music</label>
              <select value={musicType} onChange={e=>setMusicType(e.target.value)} className="w-full bg-surface border border-white/10 rounded px-3 py-2 text-sm outline-none focus:border-primary transition mb-4">
                  <option value="none">None</option>
                  <option value="motivational">Motivational / Epic</option>
                  <option value="podcast">Lo-fi / Calm</option>
                  <option value="funny">Upbeat / Energetic</option>
              </select>

              <label className="text-sm text-slate-400 mb-1 block mt-2">Or Upload Custom Music (Overrides Stock)</label>
              <input type="file" accept="audio/*" onChange={e=>setMusicFile(e.target.files[0])} className="text-sm text-slate-300 w-full file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-primary/20 file:text-primary hover:file:bg-primary/30 cursor-pointer" />
            </div>

            <div className="card p-6">
              <h2 className="text-xl font-semibold mb-4 text-primary">Output Settings</h2>
              <div>
                <label className="text-sm text-slate-400">Export Video Name</label>
                <input type="text" value={outputName} onChange={e=>setOutputName(e.target.value)} className="w-full bg-surface border border-white/10 rounded px-3 py-2 mt-1 outline-none focus:border-primary transition" />
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h2 className="text-xl font-semibold mb-4 text-primary">Captions Timeline</h2>
            
            <div className="space-y-2 max-h-60 overflow-y-auto mb-4 border border-white/5 rounded p-2">
              {captions.length === 0 ? <p className="text-sm text-slate-500 text-center py-4">No captions added yet.</p> : captions.map((c, i) => (
                <div key={i} className="flex justify-between items-center text-sm p-3 bg-black/40 rounded border border-white/5 font-medium shadow-inner">
                  <div className="flex flex-col">
                    <span style={{color: c.style.color}}>{c.text}</span>
                    <span className="text-xs text-slate-500 capitalize">{c.style.position}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400 bg-white/5 py-1 px-2 rounded">{c.start}s - {c.end}s</span>
                    <button onClick={()=>setCaptions(captions.filter((_, idx)=>idx!==i))} className="text-slate-500 hover:text-red-400"><X className="w-4 h-4"/></button>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-white/5 p-4 rounded-lg">
              <input type="text" placeholder="Caption Text" value={newCapText} onChange={e=>setNewCapText(e.target.value)} className="col-span-2 md:col-span-4 bg-surface border border-white/10 rounded px-3 py-2 text-sm outline-none focus:border-primary transition" />
              <div className="flex flex-col">
                <span className="text-xs text-slate-400">Start (s)</span>
                <input type="number" step="0.1" value={newCapStart} onChange={e=>setNewCapStart(e.target.value)} className="bg-surface border border-white/10 rounded px-2 py-1.5 text-sm outline-none focus:border-primary transition mt-1" />
              </div>
              <div className="flex flex-col">
                 <span className="text-xs text-slate-400">End (s)</span>
                <input type="number" step="0.1" value={newCapEnd} onChange={e=>setNewCapEnd(e.target.value)} className="bg-surface border border-white/10 rounded px-2 py-1.5 text-sm outline-none focus:border-primary transition mt-1" />
              </div>
              <div className="flex flex-col">
                 <span className="text-xs text-slate-400">Color</span>
                 <select value={capColor} onChange={e=>setCapColor(e.target.value)} className="bg-surface border border-white/10 rounded px-2 py-1.5 text-sm outline-none focus:border-primary transition mt-1">
                  <option value="white">White</option>
                  <option value="yellow">Yellow</option>
                  <option value="cyan">Cyan</option>
                  <option value="red">Red</option>
                  <option value="green">Green</option>
                </select>
              </div>
               <div className="flex flex-col">
                 <span className="text-xs text-slate-400">Position</span>
                 <select value={capPos} onChange={e=>setCapPos(e.target.value)} className="bg-surface border border-white/10 rounded px-2 py-1.5 text-sm outline-none focus:border-primary transition mt-1">
                  <option value="center">Center</option>
                  <option value="bottom">Bottom</option>
                  <option value="top">Top</option>
                </select>
              </div>
              <button onClick={handleAddCaption} className="bg-primary/20 text-primary hover:bg-primary/30 py-2 rounded text-sm transition col-span-2 md:col-span-4 font-semibold mt-2 border border-primary/50">Add Manual Caption</button>
            </div>
          </div>

          <button onClick={handleProcess} disabled={processing} className="btn-primary w-full flex justify-center items-center gap-2 py-5 text-xl font-bold mt-4 disabled:opacity-50 shadow-lg shadow-primary/20">
            {processing ? <><Loader className="animate-spin w-6 h-6"/> Submitting to Server...</> : <><Play className="w-6 h-6"/> Render Edited Video</>}
          </button>
        </div>
      </div>
    </div>
  );
};
export default VideoEditor;
