import { useEffect, useState } from 'react';

interface TrophyModalProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
}

export default function TrophyModal({ title, subtitle, onClose }: TrophyModalProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 500); // Attendre la fin de l'animation
    }, 5000); // Afficher pendant 5 secondes
    return () => clearTimeout(timer);
  }, [onClose]);

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.9)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        animation: visible ? 'fadeIn 0.5s ease-in' : 'fadeOut 0.5s ease-out'
      }}
      onClick={onClose}
    >
      <div
        style={{
          textAlign: 'center',
          color: '#fff',
          position: 'relative'
        }}
      >
        {/* Trophée */}
        <div
          style={{
            fontSize: '150px',
            animation: 'trophyBounce 2s ease-in-out infinite, trophyShine 3s ease-in-out infinite',
            marginBottom: '20px',
            filter: 'drop-shadow(0 0 30px rgba(255, 215, 0, 0.8))'
          }}
        >
          🏆
        </div>
        
        {/* Confettis */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' }}>
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                fontSize: '20px',
                animation: `confettiFall ${2 + Math.random() * 2}s ease-in forwards`,
                animationDelay: `${Math.random() * 0.5}s`,
                opacity: 0
              }}
            >
              {['🎉', '🎊', '⭐', '✨'][Math.floor(Math.random() * 4)]}
            </div>
          ))}
        </div>
        
        <div
          style={{
            fontSize: '48px',
            fontWeight: 900,
            marginBottom: '16px',
            textShadow: '0 0 20px rgba(255, 215, 0, 0.8)',
            letterSpacing: '2px'
          }}
        >
          {title}
        </div>
        {subtitle && (
          <div
            style={{
              fontSize: '24px',
              color: 'rgba(255, 255, 255, 0.8)',
              fontWeight: 600
            }}
          >
            {subtitle}
          </div>
        )}
        <div
          style={{
            marginTop: '32px',
            fontSize: '14px',
            color: 'rgba(255, 255, 255, 0.6)'
          }}
        >
          Cliquez pour fermer
        </div>
      </div>
      
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        @keyframes confettiFall {
          0% {
            transform: translateY(-100px) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(500px) rotate(360deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
