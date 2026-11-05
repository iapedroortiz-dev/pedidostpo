async function catalogFabricCountsForVersions(supabase, versionIds) {
  const counts = await Promise.all(versionIds.map(async (versionId) => {
    const { count, error } = await supabase
      .from('catalog_fabrics')
      .select('id', { count: 'exact', head: true })
      .eq('catalog_version_id', versionId);

    if (error) throw error;
    return [versionId, count || 0];
  }));

  return new Map(counts);
}

module.exports = { catalogFabricCountsForVersions };
