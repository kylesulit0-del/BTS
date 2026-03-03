import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

interface SeeMoreSheetProps {
  text: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function SeeMoreSheet({ text, isOpen, onClose }: SeeMoreSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const currentTranslateY = useRef(0);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    currentTranslateY.current = 0;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const deltaY = e.touches[0].clientY - touchStartY.current;
    if (deltaY > 0) {
      currentTranslateY.current = deltaY;
      const sheet = sheetRef.current;
      if (sheet) {
        sheet.style.transform = `translateY(${deltaY}px)`;
        sheet.style.transition = "none";
      }
    }
  };

  const handleTouchEnd = () => {
    const sheet = sheetRef.current;
    if (!sheet) return;

    sheet.style.transition = "transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)";

    if (currentTranslateY.current > 80) {
      onClose();
    } else {
      sheet.style.transform = "translateY(0)";
    }
    currentTranslateY.current = 0;
  };

  return createPortal(
    <div
      className="see-more-sheet-backdrop"
      style={{ opacity: isOpen ? 1 : 0 }}
      onClick={onClose}
    >
      <div
        ref={sheetRef}
        className={`see-more-sheet ${isOpen ? "open" : ""}`}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="see-more-sheet-handle" />
        <p className="see-more-sheet-text">{text}</p>
      </div>
    </div>,
    document.body
  );
}
