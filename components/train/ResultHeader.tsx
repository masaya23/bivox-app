type ResultHeaderProps = {
  message: string;
  subMessage?: string;
};

const HEADER_GRADIENT = 'linear-gradient(135deg, #00C6FB 0%, #005BEA 30%, #7C2AE8 60%, #DD2476 100%)';

function SparkleIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 2l1.9 4.6L18.5 8l-4.6 1.4L12 14l-1.9-4.6L5.5 8l4.6-1.4L12 2z" />
      <path d="M4.5 12.5l1 2.5 2.5 1-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1 1-2.5z" />
      <path d="M18.5 13l0.9 2.1 2.1 0.9-2.1 0.9-0.9 2.1-0.9-2.1-2.1-0.9 2.1-0.9 0.9-2.1z" />
    </svg>
  );
}

export default function ResultHeader({ message, subMessage }: ResultHeaderProps) {
  return (
    <div
      className="w-full py-12 flex flex-col items-center justify-center text-white relative"
      style={{ background: HEADER_GRADIENT }}
    >
      <div className="relative inline-flex items-center justify-center">
        <span className="text-5xl font-black tracking-[0.14em]">
          {message}
        </span>
        <span className="absolute left-full ml-3 -top-5 rotate-12">
          <SparkleIcon className="w-12 h-12 text-white" />
        </span>
      </div>
      {subMessage && (
        <p className="text-white/90 text-lg font-semibold mt-2">
          {subMessage}
        </p>
      )}
    </div>
  );
}
