async function catalogFabricsForVersion(supabase, catalogVersionId, pageSize = 1000) {
  const fabrics = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from('catalog_fabrics')
      .select('id, code, name, fabric_type, display_order')
      .eq('catalog_version_id', catalogVersionId)
      .order('display_order')
      .range(from, from + pageSize - 1);
    if (error) throw error;
    fabrics.push(...(data || []));
    if (!data || data.length < pageSize) return fabrics;
  }
}

module.exports = { catalogFabricsForVersion };
