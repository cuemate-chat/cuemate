interface LottieAudioLinesProps {
  size?: number;
  className?: string;
  src?: string;
  alt?: string;
}

export function LottieAudioLines({ 
  size = 16, 
  className = '',
  src = "/src/assets/SoundVisualizer.gif",
  alt = "Audio Lines"
}: LottieAudioLinesProps) {
  return (
    <div 
      className={className}
      style={{ 
        width: size, 
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <img
        src={src}
        alt={alt}
        style={{ 
          width: size, 
          height: size,
          filter: 'brightness(0) invert(1)', // 将颜色变成白色
          objectFit: 'contain'
        }}
      />
    </div>
  );
}