function modelFabricAssignmentsForModels(models, requestedAssignments, fabrics) {
  if (!Array.isArray(requestedAssignments) || requestedAssignments.length !== models.length) {
    throw new Error('Las asignaciones de tejido no son validas.');
  }

  const assignmentsByModel = new Map();
  for (const assignment of requestedAssignments) {
    const modelId = String(assignment?.catalogModelId || '').trim();
    if (!modelId || assignmentsByModel.has(modelId)) {
      throw new Error('Las asignaciones de tejido no son validas.');
    }
    assignmentsByModel.set(modelId, String(assignment?.catalogFabricId || '').trim());
  }

  const fabricById = new Map((fabrics || []).map((fabric) => [fabric.id, fabric]));
  return models.map((model) => {
    const fabricId = assignmentsByModel.get(model.id);
    if (fabricId === undefined) {
      throw new Error('Las asignaciones de tejido no son validas.');
    }
    const fabric = fabricId ? fabricById.get(fabricId) : null;
    if (fabricId && !fabric) {
      throw new Error('Uno de los tejidos seleccionados ya no pertenece al catálogo publicado.');
    }
    return {
      catalog_model_id: model.id,
      model_name: model.name,
      catalog_fabric_id: fabric?.id || null,
      fabric_code: fabric?.code || null,
      fabric_name: fabric?.name || null,
      fabric_type: fabric?.fabric_type || null,
    };
  });
}

module.exports = { modelFabricAssignmentsForModels };
