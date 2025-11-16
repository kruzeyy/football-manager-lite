import type { GameState, Player } from '../game/types';

interface Props {
  state: GameState;
}

export default function SquadView({ state }: Props) {
  const players: Player[] = state.teams[state.userTeamId].players
    .slice()
    .sort((a, b) => b.overall - a.overall);
  return (
    <div className="panel">
      <h2>Effectif</h2>
      <table className="table">
        <thead>
          <tr>
            <th>Nom</th>
            <th>Âge</th>
            <th>Poste</th>
            <th>GEN</th>
            <th>Forme</th>
          </tr>
        </thead>
        <tbody>
          {players.map(p => (
            <tr key={p.id}>
              <td>{p.name}</td>
              <td>{p.age}</td>
              <td>{p.position}</td>
              <td>{p.overall}</td>
              <td>{p.fitness}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
