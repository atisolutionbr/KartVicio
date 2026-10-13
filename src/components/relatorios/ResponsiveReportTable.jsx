import React from 'react';
import { Table, TableHeader, TableBody } from '@/components/ui/table';
import ReportRowCard from '@/components/relatorios/ReportRowCard';

export default function ResponsiveReportTable({ children, ...props }) {
  const sections = React.Children.toArray(children);
  const header = sections.find(section => section.type === TableHeader);
  const body = sections.find(section => section.type === TableBody);
  const headerRow = React.Children.toArray(header?.props.children)[0];
  const labels = React.Children.toArray(headerRow?.props.children).map(cell => cell.props.children);
  const rows = React.Children.toArray(body?.props.children).filter(React.isValidElement);
  return (
    <>
      <div className="hidden min-w-0 max-w-full md:block"><Table {...props}>{children}</Table></div>
      <div className="space-y-3 md:hidden">
        {rows.map((row, index) => <ReportRowCard key={row.key || index} row={row} labels={labels} />)}
      </div>
    </>
  );
}