import React from 'react';

export default function ReportRowCard({ row, labels }) {
  const cells = React.Children.toArray(row.props.children).filter(React.isValidElement);
  if (cells.some(cell => cell.props.colSpan > 1)) {
    return <p className="py-6 text-center text-sm text-muted-foreground">{cells[0]?.props.children}</p>;
  }
  const titleIndex = Math.max(0, labels.findIndex(label => label === 'Piloto'));
  return (
    <article className="min-w-0 rounded-lg border bg-card p-4 text-card-foreground">
      <div className="mb-4 break-words text-lg font-semibold">{cells[titleIndex]?.props.children}</div>
      <dl className="grid min-w-0 grid-cols-2 gap-x-4 gap-y-4">
        {cells.map((cell, index) => index !== titleIndex && (
          <div key={index} className="min-w-0">
            <dt className="mb-1.5 break-words text-sm text-muted-foreground">{labels[index]}</dt>
            <dd className="break-words text-base font-medium">{cell.props.children}</dd>
          </div>
        ))}
      </dl>
    </article>
  );
}