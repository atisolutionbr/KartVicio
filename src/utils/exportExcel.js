/**
 * Exporta dados para um arquivo CSV (compatível com Excel).
 * @param {Array<Object>} rows - array de objetos com os dados
 * @param {string} filename - nome do arquivo sem extensão
 */
export function exportToExcel(rows, filename = "exportacao") {
  if (!rows || rows.length === 0) return;

  const headers = Object.keys(rows[0]);
  const escape = (val) => {
    if (val === null || val === undefined) return "";
    const str = String(val).replace(/"/g, '""');
    return str.includes(",") || str.includes("\n") || str.includes('"') ? `"${str}"` : str;
  };

  const csvContent = [
    headers.map(escape).join(","),
    ...rows.map(row => headers.map(h => escape(row[h])).join(","))
  ].join("\n");

  // BOM para encoding UTF-8 no Excel
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}