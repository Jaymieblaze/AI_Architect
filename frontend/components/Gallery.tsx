'use client';

import { useState, useEffect } from 'react';
import type { Concept } from '@/types/database';

export default function Gallery() {
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConcept, setSelectedConcept] = useState<Concept | null>(null);

  useEffect(() => {
    fetchGallery();
  }, []);

  const fetchGallery = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/gallery?limit=50');
      if (!response.ok) throw new Error('Failed to fetch gallery');
      
      const data = await response.json();
      setConcepts(data.concepts || []);
    } catch (error) {
      console.error('Failed to load gallery:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this concept?')) return;

    try {
      const response = await fetch(`/api/gallery/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete');
      
      // Remove from local state
      setConcepts(prev => prev.filter(c => c.id !== id));
      if (selectedConcept?.id === id) setSelectedConcept(null);
    } catch (error) {
      console.error('Failed to delete concept:', error);
      alert('Failed to delete concept');
    }
  };

  const handleDownload = (imageUrl: string, prompt: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `${prompt.slice(0, 30).replace(/[^a-z0-9]/gi, '-')}-${Date.now()}.jpg`;
    link.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center">
        <div className="text-neutral-400 animate-pulse">Loading gallery...</div>
      </div>
    );
  }

  if (concepts.length === 0) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <h2 className="text-2xl text-neutral-300 font-light mb-4">Gallery Empty</h2>
          <p className="text-neutral-500 mb-6">
            Generate your first architectural concept to start building your collection.
          </p>
          <a
            href="/"
            className="inline-block px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all"
          >
            Create Concept
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl text-neutral-100 font-light mb-2">
              Concept <span className="font-semibold text-emerald-400">Gallery</span>
            </h1>
            <p className="text-neutral-400">{concepts.length} architectural concepts</p>
          </div>
          <a
            href="/"
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all"
          >
            + New Concept
          </a>
        </div>

        {/* Gallery Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {concepts.map((concept) => {
            // Check if this is a multi-angle concept or single image
            const isMultiAngle = concept.images && concept.images.length > 0;
            const displayImage = isMultiAngle 
              ? concept.images![0]?.url  // Show first angle
              : concept.image_url;      // Show single image
            
            return (
              <div
                key={concept.id}
                className="bg-neutral-800/50 border border-neutral-700 rounded-xl overflow-hidden hover:border-emerald-500/50 transition-all cursor-pointer group"
                onClick={() => setSelectedConcept(concept)}
              >
                <div className="aspect-video bg-neutral-900 relative overflow-hidden">
                  {displayImage ? (
                    <img
                      src={displayImage}
                      alt={concept.prompt}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        console.error('Gallery thumbnail failed to load:', displayImage);
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-500">
                      No image available
                    </div>
                  )}
                  {isMultiAngle && concept.images && (
                    <div className="absolute top-2 right-2 bg-emerald-600 text-white text-xs px-2 py-1 rounded">
                      {concept.images.length} views
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <p className="text-neutral-300 text-sm line-clamp-2 mb-2">
                    {concept.prompt}
                  </p>
                  <div className="flex justify-between items-center text-xs text-neutral-500">
                    <span>{new Date(concept.created_at).toLocaleDateString()}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(concept.id);
                      }}
                      className="text-red-400 hover:text-red-300 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal for full view */}
      {selectedConcept && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 z-50"
          onClick={() => setSelectedConcept(null)}
        >
          <div
            className="max-w-5xl w-full bg-neutral-800 rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Image Display */}
            {selectedConcept.images && selectedConcept.images.length > 0 ? (
              // Multi-angle concept - show grid of all angles
              <div className={`grid gap-3 p-6 bg-neutral-900 ${
                selectedConcept.images.length <= 2 
                  ? 'grid-cols-1 md:grid-cols-2' 
                  : selectedConcept.images.length === 3 
                  ? 'grid-cols-1 md:grid-cols-3' 
                  : 'grid-cols-2'
              }`}>
                {selectedConcept.images.map((img, idx) => (
                  <div key={idx} className="relative aspect-video rounded-lg overflow-hidden bg-neutral-950">
                    {img.status === 'completed' && img.url ? (
                      <>
                        <img
                          src={img.url}
                          alt={img.customLabel || img.angle}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            console.error('Modal image failed to load:', img.url);
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                        <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                          {img.customLabel || img.angle}
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-neutral-500 text-sm">
                        {img.status === 'failed' ? 'Generation failed' : 'Loading...'}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : selectedConcept.image_url ? (
              // Single image concept
              <div className="relative">
                <img
                  src={selectedConcept.image_url}
                  alt={selectedConcept.prompt}
                  className="w-full max-h-[70vh] object-contain bg-neutral-900"
                  onError={(e) => {
                    console.error('Modal single image failed to load:', selectedConcept.image_url);
                  }}
                />
              </div>
            ) : (
              <div className="p-12 text-center text-neutral-500">
                No images available
              </div>
            )}
            
            {/* Content */}
            <div className="p-6">
              <p className="text-neutral-200 mb-4">{selectedConcept.prompt}</p>
              <div className="flex gap-3">
                {selectedConcept.images && selectedConcept.images.length > 0 ? (
                  <button
                    onClick={() => {
                      // Download all images in multi-angle concept
                      selectedConcept.images!.forEach((img, idx) => {
                        if (img.status === 'completed' && img.url) {
                          setTimeout(() => {
                            const link = document.createElement('a');
                            link.href = img.url;
                            link.download = `${selectedConcept.prompt.slice(0, 30).replace(/[^a-z0-9]/gi, '-')}-${img.customLabel || img.angle}-${Date.now()}.jpg`;
                            link.target = '_blank';
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          }, idx * 1000);
                        }
                      });
                    }}
                    className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-all flex justify-center items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                    </svg>
                    Download All ({selectedConcept.images.length})
                  </button>
                ) : selectedConcept.image_url ? (
                  <button
                    onClick={() => handleDownload(selectedConcept.image_url!, selectedConcept.prompt)}
                    className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-all flex justify-center items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                    </svg>
                    Download
                  </button>
                ) : null}
                <button
                  onClick={() => setSelectedConcept(null)}
                  className="flex-1 py-3 rounded-xl bg-neutral-700 hover:bg-neutral-600 text-neutral-200 font-medium transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
