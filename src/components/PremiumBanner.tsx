import { useCallback } from 'react';
import { isSubscriptionActiveSync } from '../game/subscription';

interface Props {
  feature: string;
  onSubscribe?: () => void;
}

export default function PremiumBanner({ feature, onSubscribe }: Props) {
  if (isSubscriptionActiveSync()) return null;

  const handleSubscribe = useCallback(() => {
    if (onSubscribe) {
      onSubscribe();
    } else {
      // Par défaut, scroll vers l'onglet abonnement ou ouvrir une modale
      const subscriptionTab = document.querySelector('[data-tab="subscription"]');
      if (subscriptionTab) {
        (subscriptionTab as HTMLElement).click();
      }
    }
  }, [onSubscribe]);

  return (
    <div style={{
      padding: 16,
      background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(14, 165, 233, 0.15))',
      border: '2px solid var(--accent)',
      borderRadius: 12,
      marginBottom: 16,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
      flexWrap: 'wrap'
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, marginBottom: 4, color: 'var(--accent)' }}>
          🔒 Fonctionnalité Premium
        </div>
        <div style={{ fontSize: 13, color: 'var(--muted)' }}>
          {feature} nécessite un abonnement Football Manager Lite Pro.
        </div>
      </div>
      <button
        onClick={handleSubscribe}
        style={{
          padding: '10px 20px',
          borderRadius: 8,
          border: 'none',
          background: 'var(--accent)',
          color: '#0a0a0a',
          fontSize: 14,
          fontWeight: 700,
          cursor: 'pointer',
          whiteSpace: 'nowrap'
        }}
      >
        S'abonner
      </button>
    </div>
  );
}

