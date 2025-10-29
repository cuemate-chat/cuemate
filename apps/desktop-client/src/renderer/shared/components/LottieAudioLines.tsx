import soundVisualizerGif from '@/assets/SoundVisualizer.gif';
import musicSoundequalizerloaderGif from '@/assets/MusicSoundequalizerloader.gif';
import equalizerGif from '@/assets/Equalizer.gif';
import musicVisualizerGif from '@/assets/MusicVisualizer.gif';

interface LottieAudioLinesProps {
  size?: number;
  className?: string;
  src?: string;
  alt?: string;
}

export function LottieAudioLines({
  size = 16,
  className = '',
  src,
  alt = "Audio Lines"
}: LottieAudioLinesProps) {
  // 根据 src 选择对应的 GIF，如果没有提供 src 则使用默认的 soundVisualizerGif
  const gifSrc = src === "/src/assets/MusicSoundequalizerloader.gif"
    ? musicSoundequalizerloaderGif
    : src === "/src/assets/Equalizer.gif"
    ? equalizerGif
    : src === "/src/assets/MusicVisualizer.gif"
    ? musicVisualizerGif
    : soundVisualizerGif;
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
        src={gifSrc}
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