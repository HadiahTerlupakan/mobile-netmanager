/**
 * Klasifikasi kegagalan request untuk pelaporan error.
 *
 * Dua masalah yang ditangani modul ini, keduanya terbaca dari log error mobile
 * di portal admin:
 *
 * 1. 418 laporan "status code 403" berasal dari teknisi yang membuka work order
 *    bukan miliknya. Itu hasil yang memang diharapkan aturan akses, bukan
 *    kerusakan — melaporkannya sebagai exception menenggelamkan error yang
 *    benar-benar perlu dilihat.
 *
 * 2. Seluruh 562 laporan "status code 400" tercatat dengan mutationKey "null"
 *    karena mutation tidak menyetel kunci, sehingga kategori error terbesar
 *    tidak bisa dilacak ke endpoint mana pun. Endpoint diambil dari error-nya
 *    sendiri, tanpa perlu menyentuh setiap pemanggil.
 */

/**
 * Status HTTP yang merupakan jawaban sah dari server, bukan kerusakan aplikasi.
 *
 * 401/426 sudah ditangani interceptor API (refresh token dan paksa update),
 * 403/404/409 adalah keputusan bisnis: tidak berhak, tidak ada, atau bentrok.
 */
const EXPECTED_STATUSES = new Set([401, 403, 404, 409, 426]);

/** Ambil status HTTP dari error, jika error itu berasal dari sebuah respons. */
export function getHttpStatus(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined;

  const response = (error as { response?: { status?: unknown } }).response;
  const status = response?.status;

  return typeof status === 'number' ? status : undefined;
}

/** Apakah kegagalan ini layak dikirim sebagai laporan error ke backend? */
export function shouldReportToBackend(error: unknown): boolean {
  const status = getHttpStatus(error);

  // Tanpa status berarti gagal sebelum server menjawab — jaringan putus,
  // timeout, atau bug murni di aplikasi. Semuanya layak dilaporkan.
  if (status === undefined) return true;

  return !EXPECTED_STATUSES.has(status);
}

/** Buang query string dan host, sisakan path-nya saja. */
function normalizeEndpoint(url: string): string {
  const withoutQuery = url.split('?')[0];
  const absolute = withoutQuery.match(/^[a-z][a-z0-9+.-]*:\/\/[^/]+(\/.*)$/i);

  return absolute ? absolute[1] : withoutQuery;
}

/**
 * Endpoint dan metode yang gagal, untuk melengkapi laporan error.
 *
 * Query string dibuang supaya laporan bisa dikelompokkan: tanpa itu setiap id
 * dan setiap kata pencarian menghasilkan endpoint yang berbeda.
 */
export function describeFailedRequest(error: unknown): {
  method?: string;
  endpoint?: string;
} {
  if (!error || typeof error !== 'object') return {};

  const config = (error as { config?: { method?: unknown; url?: unknown } })
    .config;
  if (!config) return {};

  const described: { method?: string; endpoint?: string } = {};
  if (typeof config.method === 'string') {
    described.method = config.method.toUpperCase();
  }
  if (typeof config.url === 'string') {
    described.endpoint = normalizeEndpoint(config.url);
  }

  return described;
}
