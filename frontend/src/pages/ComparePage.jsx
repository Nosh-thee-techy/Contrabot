import { useEffect, useState } from "react";
import { getMethodsCompare } from "../api";

export default function ComparePage() {
  const [methods, setMethods] = useState([]);

  useEffect(() => {
    getMethodsCompare().then((d) => setMethods(d.methods || []));
  }, []);

  return (
    <div className="page">
      <h1>Method Comparison</h1>
      <table className="compare-table">
        <thead>
          <tr>
            <th>Method</th>
            <th>Duration</th>
            <th>Cost</th>
            <th>Effectiveness</th>
            <th>Reversible</th>
            <th>Clinic needed</th>
          </tr>
        </thead>
        <tbody>
          {methods.map((m) => (
            <tr key={m.id}>
              <td>{m.name}</td>
              <td>{m.duration}</td>
              <td>{m.cost}</td>
              <td>{(m.effectiveness * 100).toFixed(0)}%</td>
              <td>{(m.reversibility * 100).toFixed(0)}%</td>
              <td>{m.requires_clinic ? "Yes" : "No"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
