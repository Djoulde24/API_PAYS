const BASE = 'https://api.restcountries.com/countries/v5';
const FIELDS =
  'names.common,codes.alpha_2,capitals,population,flag.url_png,flag.url_svg,flag.description,links.google_maps,coordinates,area.kilometers,languages';

module.exports = async (req, res) => {
  const key = process.env.RESTCOUNTRIES_KEY;
  if (!key) {
    res.status(500).json({ error: 'Cle API manquante cote serveur' });
    return;
  }

  try {
    const pages = await Promise.all(
      [0, 100, 200].map(async offset => {
        const r = await fetch(
          `${BASE}?limit=100&offset=${offset}&response_fields=${FIELDS}`,
          { headers: { Authorization: `Bearer ${key}` } }
        );
        if (!r.ok) {
          const e = new Error(`REST Countries a repondu ${r.status}`);
          e.status = r.status;
          throw e;
        }
        const json = await r.json();
        return json.data.objects;
      })
    );

    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
    res.status(200).json({ data: { objects: pages.flat() } });
  } catch (e) {
    res.status(e.status || 502).json({ error: e.message });
  }
};