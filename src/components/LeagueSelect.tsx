import React from 'react';

interface Props {
  onSelect: (leagueId: number, leagueName: string) => void;
}

export default function LeagueSelect({ onSelect }: Props) {
  console.log('[fm-lite] 🎨 LeagueSelect component rendered');
  
  const handleSelect = (leagueId: number, leagueName: string) => {
    console.log('[fm-lite] 🖱️ LeagueSelect button clicked:', leagueName, leagueId);
    console.log('[fm-lite] 🖱️ onSelect function:', typeof onSelect);
    onSelect(leagueId, leagueName);
    console.log('[fm-lite] 🖱️ onSelect called, returning');
  };
  
  // Styles d'animation CSS inline
  const animationStyles = `
    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }
    
    @keyframes slideInScale {
      from {
        opacity: 0;
        transform: scale(0.85) translateY(20px);
      }
      to {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }
    
    .league-title {
      animation: fadeInUp 0.6s ease-out;
    }
    
    .league-subtitle {
      animation: fadeIn 0.6s ease-out 0.2s both;
    }
    
    .league-button-1 {
      animation: slideInScale 0.5s ease-out 0.3s both;
    }
    
    .league-button-2 {
      animation: slideInScale 0.5s ease-out 0.5s both;
    }
    
    .league-icon {
      animation: fadeIn 0.4s ease-out 0.7s both;
      transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
  `;
  
  // Utiliser useState pour gérer l'état hover au lieu de modifier directement les styles
  const [hoveredButton, setHoveredButton] = React.useState<number | null>(null);

  const baseButtonStyle: React.CSSProperties = {
    flex: 1,
    padding: '40px 30px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '20px',
    cursor: 'pointer',
    border: 'none',
    borderRadius: '16px',
    color: 'white',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
    transition: 'all 0.3s ease',
    position: 'relative',
    overflow: 'hidden',
  };

  const ligue1Style: React.CSSProperties = {
    ...baseButtonStyle,
    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    transform: hoveredButton === 61 ? 'translateY(-6px) scale(1.03)' : 'translateY(0) scale(1)',
    boxShadow: hoveredButton === 61 
      ? '0 16px 40px rgba(245, 87, 108, 0.4), 0 0 0 0 rgba(255, 255, 255, 0)' 
      : '0 8px 24px rgba(0, 0, 0, 0.3)',
  };

  const ligue2Style: React.CSSProperties = {
    ...baseButtonStyle,
    background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    transform: hoveredButton === 62 ? 'translateY(-6px) scale(1.03)' : 'translateY(0) scale(1)',
    boxShadow: hoveredButton === 62 
      ? '0 16px 40px rgba(0, 242, 254, 0.4), 0 0 0 0 rgba(255, 255, 255, 0)' 
      : '0 8px 24px rgba(0, 0, 0, 0.3)',
  };
  
  return (
    <>
      <style>{animationStyles}</style>
      <div style={{ 
        maxWidth: '800px', 
        margin: '60px auto',
        padding: '0 20px'
      }}>
        <div style={{
          textAlign: 'center',
          marginBottom: '50px'
        }}>
          <h1 className="league-title" style={{
            fontSize: '42px',
            fontWeight: '700',
            marginBottom: '16px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            Choisis ta ligue
          </h1>
          <p className="league-subtitle" style={{
            fontSize: '18px',
            color: '#888',
            margin: 0
          }}>
            Sélectionne la ligue dans laquelle tu veux jouer
          </p>
        </div>
        
        <div style={{ 
          display: 'flex', 
          gap: '30px', 
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}>
          <button 
            className="league-button-1"
            onClick={() => handleSelect(61, 'Ligue 1')}
            style={ligue1Style}
            onMouseEnter={() => setHoveredButton(61)}
            onMouseLeave={() => setHoveredButton(null)}
          >
            <div className="league-icon" style={{ 
              fontSize: '72px',
              filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))',
              lineHeight: 1,
              transform: hoveredButton === 61 ? 'scale(1.15) rotate(8deg)' : 'scale(1) rotate(0deg)',
              transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}>
              🏆
            </div>
            <div style={{ 
              fontSize: '32px', 
              fontWeight: 'bold',
              textShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}>
              Ligue 1
            </div>
            <div style={{
              fontSize: '16px',
              opacity: 0.9,
              padding: '8px 20px',
              backgroundColor: 'rgba(255,255,255,0.2)',
              borderRadius: '20px',
              backdropFilter: 'blur(10px)'
            }}>
              20 équipes
            </div>
          </button>
          
          <button 
            className="league-button-2"
            onClick={() => handleSelect(62, 'Ligue 2')}
            style={ligue2Style}
            onMouseEnter={() => setHoveredButton(62)}
            onMouseLeave={() => setHoveredButton(null)}
          >
            <div className="league-icon" style={{ 
              fontSize: '72px',
              filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))',
              lineHeight: 1,
              transform: hoveredButton === 62 ? 'scale(1.15) rotate(8deg)' : 'scale(1) rotate(0deg)',
              transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}>
              🥈
            </div>
            <div style={{ 
              fontSize: '32px', 
              fontWeight: 'bold',
              textShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}>
              Ligue 2
            </div>
            <div style={{
              fontSize: '16px',
              opacity: 0.9,
              padding: '8px 20px',
              backgroundColor: 'rgba(255,255,255,0.2)',
              borderRadius: '20px',
              backdropFilter: 'blur(10px)'
            }}>
              20 équipes
            </div>
          </button>
        </div>
      </div>
    </>
  );
}

