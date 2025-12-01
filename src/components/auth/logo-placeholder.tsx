'use client';

interface LogoPlaceholderProps {
  text: string;
  width?: number;
  height?: number;
  className?: string;
}

export function LogoPlaceholder({ 
  text, 
  width = 100, 
  height = 50, 
  className = '' 
}: LogoPlaceholderProps) {
  return (
    <div 
      className={`flex items-center justify-center bg-gray-200 rounded ${className}`}
      style={{ width: `${width}px`, height: `${height}px` }}
    >
      <span className="text-gray-600 font-bold text-sm">{text}</span>
    </div>
  );
}
