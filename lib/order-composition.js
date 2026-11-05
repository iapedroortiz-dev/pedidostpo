function moveCompositionUnit(units, draggedId, targetId) {
  if (!draggedId || draggedId === targetId) return units;
  const draggedIndex = units.findIndex((unit) => unit.id === draggedId);
  const targetIndex = units.findIndex((unit) => unit.id === targetId);
  if (draggedIndex < 0 || targetIndex < 0) return units;

  const next = [...units];
  const [dragged] = next.splice(draggedIndex, 1);
  next.splice(next.findIndex((unit) => unit.id === targetId), 0, dragged);
  return next;
}

module.exports = { moveCompositionUnit };
