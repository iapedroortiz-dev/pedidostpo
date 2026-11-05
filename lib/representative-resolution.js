function normalizedEmail(value) {
  return String(value || '').trim().toLocaleLowerCase('es-ES');
}

async function representativeIdsByEmail(admin, emails) {
  const uniqueEmails = [...new Set(emails.map(normalizedEmail).filter(Boolean))];
  const results = await Promise.all(uniqueEmails.map(async (email) => {
    const { data, error } = await admin.from('profiles').select('id, email').ilike('email', email).maybeSingle();
    if (error) throw error;
    return [email, data];
  }));
  const ids = new Map();
  const unknown = [];
  results.forEach(([requestedEmail, profile]) => {
    const resolvedEmail = normalizedEmail(profile?.email);
    if (!profile?.id || resolvedEmail !== requestedEmail) unknown.push(requestedEmail);
    else ids.set(requestedEmail, profile.id);
  });
  if (unknown.length) throw new Error(`No existe un usuario para: ${unknown.slice(0, 3).join(', ')}${unknown.length > 3 ? '...' : ''}.`);
  return ids;
}

module.exports = { representativeIdsByEmail };
