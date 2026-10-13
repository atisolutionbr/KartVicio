/**
 * Hook para exportar dados para Excel (CSV com BOM para suporte a acentos no Excel)
 */
export function useExcelExport() {
  const exportToExcel = ({ data, filename, sheetName = "Dados" }) => {
    if (!data || data.length === 0) return;

    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(";"),
      ...data.map(row =>
        headers.map(h => {
          const val = row[h] ?? "";
          // Envolver em aspas se contiver ponto-e-vírgula, aspas ou quebra de linha
          const str = String(val).replace(/"/g, '""');
          return /[;\n"]/.test(str) ? `"${str}"` : str;
        }).join(";")
      )
    ];

    // BOM para o Excel reconhecer UTF-8
    const bom = "\uFEFF";
    const csvContent = bom + csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename.endsWith(".csv") ? filename : filename + ".csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return { exportToExcel };
}