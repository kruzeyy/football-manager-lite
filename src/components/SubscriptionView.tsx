import { useState, useEffect } from 'react';
import type { GameState } from '../game/types';
import { 
  getSubscription, 
  setSubscription, 
  cancelSubscription, 
  isSubscriptionActive,
  setTestSubscription 
} from '../game/subscription';

interface Props {
  state: GameState | null;
}

export default function SubscriptionView({ state }: Props) {
  const [subscription, setSubscriptionState] = useState(getSubscription());
  const [isActive, setIsActive] = useState(false);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const checkSubscription = async () => {
      try {
        const active = await isSubscriptionActive();
        setIsActive(active);
        const sub = getSubscription();
        setSubscriptionState(sub);
      } catch (error) {
        console.error('[SubscriptionView] Error checking subscription:', error);
      } finally {
        setLoading(false);
      }
    };
    checkSubscription();
  }, []);

  const handleSubscribe = async (type: 'monthly' | 'yearly') => {
    try {
      setLoading(true);
      const newSub = await setSubscription(type);
      setSubscriptionState(newSub);
      setIsActive(true);
      alert(`Abonnement ${type === 'monthly' ? 'mensuel' : 'annuel'} activé avec succès !`);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Erreur lors de l\'activation de l\'abonnement');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (confirm('Êtes-vous sûr de vouloir annuler votre abonnement ?')) {
      try {
        setLoading(true);
        await cancelSubscription();
        setSubscriptionState(null);
        setIsActive(false);
        alert('Abonnement annulé.');
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Erreur lors de l\'annulation');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleTestSubscribe = () => {
    const newSub = setTestSubscription('yearly');
    setSubscriptionState(newSub);
    setIsActive(true);
    alert('Abonnement de test activé ! (N\'expire jamais - pour les tests uniquement)');
  };
  return (
    <div className="panel">
      <h2 style={{ marginBottom: 24 }}>Abonnement</h2>
      
      <div style={{ marginBottom: 32 }}>
        <div style={{ 
          fontSize: 24, 
          fontWeight: 800, 
          marginBottom: 8,
          background: 'linear-gradient(90deg, #22c55e, #0ea5e9)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          Football Manager Lite Pro
        </div>
        <div style={{ fontSize: 14, color: 'var(--muted)' }}>
          Accédez à toutes les fonctionnalités premium
        </div>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
        gap: 16,
        marginBottom: 32
      }}>
        {/* Plan Mensuel */}
        <div style={{
          padding: 24,
          background: 'var(--card)',
          border: '2px solid var(--border)',
          borderRadius: 12,
          position: 'relative'
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)', marginBottom: 8 }}>
            ABONNEMENT MENSUEL
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, marginBottom: 4 }}>
            9,99€
            <span style={{ fontSize: 16, fontWeight: 400, color: 'var(--muted)' }}>/mois</span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 24 }}>
            Renouvelé automatiquement chaque mois
          </div>
          <button
            onClick={() => handleSubscribe('monthly')}
            disabled={isActive}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: 8,
              border: 'none',
              background: isActive ? 'var(--muted)' : 'var(--accent)',
              color: isActive ? 'var(--fg)' : '#0a0a0a',
              fontSize: 14,
              fontWeight: 700,
              cursor: isActive ? 'not-allowed' : 'pointer',
              opacity: isActive ? 0.6 : 1
            }}
          >
            {isActive ? 'Déjà abonné' : 'S\'abonner'}
          </button>
        </div>

        {/* Plan Annuel */}
        <div style={{
          padding: 24,
          background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(14, 165, 233, 0.1))',
          border: '2px solid var(--accent)',
          borderRadius: 12,
          position: 'relative'
        }}>
          <div style={{
            position: 'absolute',
            top: -10,
            right: 16,
            background: 'var(--accent)',
            color: '#0a0a0a',
            padding: '4px 12px',
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 700
          }}>
            MEILLEUR RAPPORT
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)', marginBottom: 8 }}>
            ABONNEMENT ANNUEL
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, marginBottom: 4 }}>
            79,99€
            <span style={{ fontSize: 16, fontWeight: 400, color: 'var(--muted)' }}>/an</span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>
            Économisez 33% par rapport au plan mensuel
          </div>
          <div style={{ fontSize: 12, color: 'var(--accent)', marginBottom: 24, fontWeight: 600 }}>
            Soit 6,67€/mois
          </div>
          <button
            onClick={() => handleSubscribe('yearly')}
            disabled={isActive}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: 8,
              border: 'none',
              background: isActive ? 'var(--muted)' : 'var(--accent)',
              color: isActive ? 'var(--fg)' : '#0a0a0a',
              fontSize: 14,
              fontWeight: 700,
              cursor: isActive ? 'not-allowed' : 'pointer',
              boxShadow: isActive ? 'none' : '0 4px 12px rgba(34, 197, 94, 0.3)',
              opacity: isActive ? 0.6 : 1
            }}
          >
            {isActive ? 'Déjà abonné' : 'S\'abonner'}
          </button>
        </div>
      </div>

      <div style={{ marginBottom: 32 }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>À quoi sert l'abonnement ?</h3>
        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{
            padding: 16,
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            display: 'flex',
            gap: 12,
            alignItems: 'flex-start'
          }}>
            <div style={{ fontSize: 24, flexShrink: 0 }}>🎮</div>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Mode Carrière Illimité</div>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                Créez et gérez autant de carrières que vous souhaitez, sans limitation
              </div>
            </div>
          </div>

          <div style={{
            padding: 16,
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            display: 'flex',
            gap: 12,
            alignItems: 'flex-start'
          }}>
            <div style={{ fontSize: 24, flexShrink: 0 }}>⚽</div>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Données en Temps Réel</div>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                Accédez aux statistiques, classements et données des joueurs mis à jour en temps réel via l'API
              </div>
            </div>
          </div>

          <div style={{
            padding: 16,
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            display: 'flex',
            gap: 12,
            alignItems: 'flex-start'
          }}>
            <div style={{ fontSize: 24, flexShrink: 0 }}>📊</div>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Statistiques Avancées</div>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                Analysez les performances de votre équipe avec des statistiques détaillées et des graphiques
              </div>
            </div>
          </div>

          <div style={{
            padding: 16,
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            display: 'flex',
            gap: 12,
            alignItems: 'flex-start'
          }}>
            <div style={{ fontSize: 24, flexShrink: 0 }}>🏆</div>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Toutes les Compétitions</div>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                Jouez en Ligue 1, Ligue 2 et participez à la Coupe de France avec toutes les équipes
              </div>
            </div>
          </div>

          <div style={{
            padding: 16,
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            display: 'flex',
            gap: 12,
            alignItems: 'flex-start'
          }}>
            <div style={{ fontSize: 24, flexShrink: 0 }}>🎯</div>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Simulation de Match Améliorée</div>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                Profitez d'une simulation de match avec IA avancée et animations en temps réel
              </div>
            </div>
          </div>

          <div style={{
            padding: 16,
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            display: 'flex',
            gap: 12,
            alignItems: 'flex-start'
          }}>
            <div style={{ fontSize: 24, flexShrink: 0 }}>💰</div>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Gestion Financière</div>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                Gérez le budget de votre club, négociez des contrats de sponsors et des droits TV
              </div>
            </div>
          </div>

          <div style={{
            padding: 16,
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            display: 'flex',
            gap: 12,
            alignItems: 'flex-start'
          }}>
            <div style={{ fontSize: 24, flexShrink: 0 }}>🚫</div>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Sans Publicités</div>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                Profitez d'une expérience de jeu sans interruption publicitaire
              </div>
            </div>
          </div>

          <div style={{
            padding: 16,
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            display: 'flex',
            gap: 12,
            alignItems: 'flex-start'
          }}>
            <div style={{ fontSize: 24, flexShrink: 0 }}>🔄</div>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Mises à Jour Régulières</div>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                Bénéficiez de nouvelles fonctionnalités et améliorations en continu
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Statut de l'abonnement */}
      {isActive && subscription && (
        <div style={{
          padding: 20,
          background: 'rgba(34, 197, 94, 0.1)',
          border: '1px solid rgba(34, 197, 94, 0.3)',
          borderRadius: 8,
          marginTop: 32,
          marginBottom: 16
        }}>
          <div style={{ fontWeight: 700, marginBottom: 8, color: 'var(--accent)' }}>
            ✅ Abonnement actif
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>
            Type: {subscription.type === 'monthly' ? 'Mensuel' : 'Annuel'}
            {subscription.endDate && (
              <> · Expire le: {new Date(subscription.endDate).toLocaleDateString('fr-FR')}</>
            )}
            {!subscription.endDate && (
              <> · Mode test (n'expire jamais)</>
            )}
          </div>
          <button
            onClick={handleCancel}
            style={{
              padding: '8px 16px',
              borderRadius: 6,
              border: '1px solid rgba(239, 68, 68, 0.5)',
              background: 'rgba(239, 68, 68, 0.1)',
              color: '#ef4444',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Annuler l'abonnement
          </button>
        </div>
      )}

      {/* Mode test pour développement - Toujours visible pour les tests */}
      <div style={{
        padding: 20,
        background: 'rgba(59, 130, 246, 0.1)',
        border: '1px solid rgba(59, 130, 246, 0.3)',
        borderRadius: 8,
        marginTop: 32
      }}>
        <div style={{ fontWeight: 700, marginBottom: 8, color: '#3b82f6' }}>
          🧪 Mode développement
        </div>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>
          Activez un abonnement de test pour tester les fonctionnalités premium sans payer.
          L'abonnement de test n'expire jamais et est uniquement pour les tests.
          {isActive && subscription && !subscription.endDate && (
            <span style={{ display: 'block', marginTop: 8, color: '#22c55e', fontWeight: 600 }}>
              ✅ Abonnement de test actif
            </span>
          )}
        </div>
        <button
          onClick={handleTestSubscribe}
          disabled={loading || (isActive && subscription && !subscription.endDate)}
          style={{
            padding: '8px 16px',
            borderRadius: 6,
            border: 'none',
            background: isActive && subscription && !subscription.endDate ? 'var(--muted)' : '#3b82f6',
            color: '#fff',
            fontSize: 13,
            fontWeight: 600,
            cursor: (isActive && subscription && !subscription.endDate) || loading ? 'not-allowed' : 'pointer',
            opacity: (isActive && subscription && !subscription.endDate) || loading ? 0.6 : 1
          }}
        >
          {isActive && subscription && !subscription.endDate ? 'Abonnement de test déjà actif' : 'Activer l\'abonnement de test'}
        </button>
      </div>

      {!isActive && (
        <div style={{
          padding: 20,
          background: 'rgba(34, 197, 94, 0.1)',
          border: '1px solid rgba(34, 197, 94, 0.3)',
          borderRadius: 8,
          marginTop: 16
        }}>
          <div style={{ fontWeight: 700, marginBottom: 8, color: 'var(--accent)' }}>
            ⚠️ Note importante
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>
            Pour l'instant, cette fonctionnalité est en cours de développement. 
            En production, les paiements seront gérés via un système de paiement sécurisé.
          </div>
        </div>
      )}
    </div>
  );
}

