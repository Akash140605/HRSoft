export const getHallUsage = (entries, hallId) =>
  entries.filter((entry) => String(entry.hallId || '') === String(hallId)).length;

export const getTotalCapacity = (halls) =>
  halls.reduce((sum, hall) => sum + Number(hall.capacity || 0), 0);

export const getNextAvailableHall = (halls, todayEntries) => {
  for (const hall of halls) {
    const used = getHallUsage(todayEntries, hall.id);
    if (used < Number(hall.capacity || 0)) return hall;
  }
  return null;
};

export const downloadTextFile = (filename, content, mimeType = 'text/plain') => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

export const formatRosterCsv = (rows) => {
  const headers = ['name', 'code', 'weekOff', 'shift'];
  return [
    headers.join(','),
    ...rows.map((row) =>
      [
        row.name ?? '',
        row.code ?? '',
        row.weekOff ?? 'Sunday',
        row.shift ?? 'A'
      ]
        .map((v) => `"${String(v).replaceAll('"', '""')}"`)
        .join(',')
    )
  ].join('\n');
};

export const parseRosterCsv = (text) => {
  const lines = String(text || '').trim().split(/\r?\n/);
  if (!lines.length) return [];

  const headers = lines[0].split(',').map((h) => h.trim().replaceAll('"', '').toLowerCase());

  return lines.slice(1).map((line) => {
    const cells = line.split(',').map((v) => v.trim().replaceAll('"', ''));
    const row = {};
    headers.forEach((h, i) => {
      row[h] = cells[i] || '';
    });
    return {
      name: row.name || '',
      code: row.code || '',
      weekOff: row.weekoff || row['week off'] || row.week_off || 'Sunday',
      shift: row.shift || 'A'
    };
  });
};

export const toApiEmployee = (emp) => ({
  name: emp.name || '',
  code: emp.code || '',
  weekOff: emp.weekOff || 'Sunday',
  shift: emp.shift || 'A'
});

export const toApiHall = (hall) => ({
  id: hall.id,
  name: hall.name || '',
  capacity: Number(hall.capacity || 0),
  color: hall.color || 'slate'
});