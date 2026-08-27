export function Card({ title, icon, children }: { title: string; icon?: string; children: React.ReactNode }) {
  return (
    <div className="card">
      <div className="card-head">{icon && <span className="card-icon">{icon}</span>}<h2>{title}</h2></div>
      <div className="card-body">{children}</div>
    </div>
  );
}
