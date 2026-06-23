import { cn } from '../../lib/utils';

interface AvatarProps {
  src?: string | null;
  name?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  onClick?: () => void;
}

export function Avatar({ src, name, size = 'sm', className, onClick }: AvatarProps) {
  const sizeClasses = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-[38px] h-[38px] text-sm',
    md: 'w-12 h-12 text-base',
    lg: 'w-16 h-16 text-lg',
    xl: 'w-24 h-24 text-2xl',
  };

  const text = name ? name.trim().slice(0, 2).toUpperCase() : 'AK';

  // Seeded background gradient based on username for a custom look if no image
  const getGradient = (seedName: string) => {
    const charsSum = seedName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const index = charsSum % 4;
    const gradients = [
      'from-purple-500 to-pink-500',
      'from-blue-500 to-indigo-500',
      'from-pink-500 to-rose-500',
      'from-violet-600 to-fuchsia-500',
    ];
    return gradients[index];
  };

  const gradientClass = getGradient(name || 'AnikuKomu');

  return (
    <div
      onClick={onClick}
      className={cn(
        'relative rounded-full overflow-hidden shrink-0 select-none bg-neutral-800 border border-zinc-800/50',
        onClick && 'cursor-pointer hover:opacity-90 active:scale-95 transition-all',
        sizeClasses[size],
        className
      )}
    >
      {src ? (
        <img
          src={src}
          alt={name || 'User Avatar'}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover"
          onError={(e) => {
            // Nullify source to trigger initials fallback
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      ) : null}
      <div className={cn(
        'absolute inset-0 flex items-center justify-center font-bold text-white bg-gradient-to-tr',
        gradientClass,
        src ? 'z-[-1]' : 'z-0'
      )}>
        {text}
      </div>
    </div>
  );
}
