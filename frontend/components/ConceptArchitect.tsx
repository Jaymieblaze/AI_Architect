'use client';

import { useState, useEffect } from 'react';

const LOADING_PHRASES = [
  "Drafting conceptual geometry...",
  "Calculating structural loads...",
  "Applying parametric textures...",
  "Simulating natural sunlight...",
  "Finalizing architectural render..."
];

export default function ConceptArchitect() {
  const [prompt, setPrompt] = useState('');
  const [status, setStatus] = useState<'idle' | 'generating' | 'complete'>('idle');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loadingText, setLoadingText] = useState(LOADING_PHRASES[0]);

  useEffect(() => {
    if (status !== 'generating') return;
    let i = 0;
    const interval = setInterval(() => {
      i = (i + 1) % LOADING_PHRASES.length;
      setLoadingText(LOADING_PHRASES[i]);
    }, 2500);
    return () => clearInterval(interval);
  }, [status]);

  const generateConcept = async () => {
    if (!prompt) return;
    setStatus('generating');
    setImageUrl(null);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_prompt: prompt }),
      });
      
      if (!response.ok) throw new Error("Backend failed to respond");
      
      const rawData = await response.json();
      console.log("Raw response from n8n:", rawData); 

      // Safely extract the job_id, no matter how n8n packages it
      let job_id = null;
      
      if (rawData.job_id) {
        job_id = rawData.job_id;
      } else if (rawData.data && typeof rawData.data === 'string') {
        const parsed = JSON.parse(rawData.data);
        job_id = parsed.job_id;
      } else if (Array.isArray(rawData)) {
        job_id = rawData[0]?.job_id;
      }

      if (!job_id) {
        throw new Error(`No job ID returned. We received: ${JSON.stringify(rawData)}`);
      }

      // 2. Start the Polling Loop!
      pollStatus(job_id);

    } catch (error) {
      console.error("Failed to start generation", error);
      setStatus('idle');
      alert("Failed to connect to the Architect Agent. Check console for details.");
    }
  };

  const pollStatus = async (jobId: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/poll?jobId=${jobId}`);
        
        // 1. Read the raw text first. If Next.js sends a blank string, don't crash!
        const text = await response.text();
        if (!text) {
          console.warn("Received empty response from server, skipping this tick...");
          return; // Skip this check and try again in 3 seconds
        }

        // 2. Now that we know it has text, safely parse it into JSON
        const data = JSON.parse(text);

        if (data.status === 'completed') {
          clearInterval(interval);
          setImageUrl(data.image_url); 
          setStatus('complete');
        } else if (data.status === 'failed') {
          clearInterval(interval);
          setStatus('idle');
          alert("Render failed. Please try again.");
        }
      } catch (error) {
        console.error("Polling error:", error);
        // We no longer crash here, the loop will just gracefully try again!
      }
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-neutral-900 flex flex-col items-center justify-center p-6 font-sans">
      <div className="max-w-3xl w-full bg-neutral-800/50 backdrop-blur-xl border border-neutral-700 rounded-2xl p-8 shadow-2xl">
        
        <h1 className="text-3xl text-neutral-100 font-light mb-2 tracking-wide">
          Architectural <span className="font-semibold text-emerald-400">Agent</span>
        </h1>
        <p className="text-neutral-400 mb-8">Describe your vision, and the agent will draft the concept.</p>

        <div className="space-y-4">
          <textarea
            className="w-full bg-neutral-900/50 border border-neutral-700 rounded-xl p-4 text-neutral-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all resize-none"
            rows={4}
            placeholder="e.g., A minimalist tropical resort with timber cladding and infinity pools..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={status === 'generating'}
          />

          <button
            onClick={generateConcept}
            disabled={status === 'generating' || !prompt}
            className="w-full py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
          >
            {status === 'generating' ? (
              <span className="animate-pulse">{loadingText}</span>
            ) : (
              "Generate Concept"
            )}
          </button>
        </div>

        {/* Image Reveal Section */}
        {imageUrl && status === 'complete' && (
          <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
            <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-neutral-700 shadow-2xl">
              <img 
                src={imageUrl} 
                alt="Generated Architectural Concept" 
                className="object-cover w-full h-full"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}