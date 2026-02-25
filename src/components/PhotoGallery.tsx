import { useState, useEffect, useCallback } from "react";

interface PhotoGalleryProps {
  images: string[];
  memberName: string;
}

export default function PhotoGallery({ images, memberName }: PhotoGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set([0]));

  const openLightbox = (index: number) => setLightboxIndex(index);
  const closeLightbox = () => setLightboxIndex(null);

  const goNext = useCallback(() => {
    if (lightboxIndex === null) return;
    setLightboxIndex((lightboxIndex + 1) % images.length);
  }, [lightboxIndex, images.length]);

  const goPrev = useCallback(() => {
    if (lightboxIndex === null) return;
    setLightboxIndex((lightboxIndex - 1 + images.length) % images.length);
  }, [lightboxIndex, images.length]);

  useEffect(() => {
    if (lightboxIndex === null) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [lightboxIndex, goNext, goPrev]);

  // Track which images loaded successfully
  const handleImageError = (index: number) => {
    setLoadedImages((prev) => {
      const next = new Set(prev);
      next.delete(index);
      return next;
    });
  };

  const handleImageLoad = (index: number) => {
    setLoadedImages((prev) => new Set(prev).add(index));
  };

  if (images.length === 0) return null;

  return (
    <>
      <div className="photo-gallery">
        <div className="gallery-strip">
          {images.map((src, i) => (
            <button
              key={i}
              className="gallery-thumb"
              onClick={() => openLightbox(i)}
              aria-label={`View photo ${i + 1} of ${memberName}`}
            >
              <img
                src={src}
                alt={`${memberName} photo ${i + 1}`}
                loading="lazy"
                onError={() => handleImageError(i)}
                onLoad={() => handleImageLoad(i)}
              />
            </button>
          ))}
        </div>
      </div>

      {lightboxIndex !== null && (
        <div className="lightbox" onClick={closeLightbox}>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <img
              src={images[lightboxIndex]}
              alt={`${memberName} photo ${lightboxIndex + 1}`}
              className="lightbox-img"
            />
            {images.length > 1 && (
              <>
                <button className="lightbox-nav lightbox-prev" onClick={goPrev} aria-label="Previous photo">
                  &#8249;
                </button>
                <button className="lightbox-nav lightbox-next" onClick={goNext} aria-label="Next photo">
                  &#8250;
                </button>
              </>
            )}
            <div className="lightbox-counter">
              {lightboxIndex + 1} / {images.length}
            </div>
            <button className="lightbox-close" onClick={closeLightbox} aria-label="Close lightbox">
              &times;
            </button>
          </div>
        </div>
      )}
    </>
  );
}
