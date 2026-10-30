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

const SERVER_MESSAGE_MAX_LENGTH = 300;
const HTTP_CLIENT_ERROR_MIN = 400;
const HTTP_SERVER_ERROR_MIN = 500;
const MAX_MUTATION_RETRY = 1;

/** Status penolakan karena keadaan data sudah berubah di server. */
const STALE_STATE_STATUSES = new Set([400, 409]);

/**
 * Akar kunci query yang perlu disegarkan saat aksi pada endpoint ini ditolak:
 * penolakan seperti "Hanya WO berstatus IN_PROGRESS" atau "tidak ada sesi aktif"
 * berarti layar menampilkan data basi, jadi tombol aksinya harus diperbarui.
 */
const STALE_QUERY_ROOTS_BY_ENDPOINT: { prefix: string; root: readonly string[] }[] = [
  { prefix: '/api/mobile/work-orders', root: ['workOrders'] },
  { prefix: '/api/mobile/attendance', root: ['attendance'] },
];

/** Pesan galat yang dikirim server di body respons (`error` atau `message`). */
export function getServerErrorMessage(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined;

  const data = (error as { response?: { data?: unknown } }).response?.data;
  if (!data || typeof data !== 'object') return undefined;

  const { error: errorField, message } = data as { error?: unknown; message?: unknown };
  const serverMessage = typeof errorField === 'string' ? errorField : message;
  return typeof serverMessage === 'string' && serverMessage.trim()
    ? serverMessage.trim()
    : undefined;
}

/** 4xx: server sudah menjawab dan menolak permintaan ini. */
export function isClientRejection(error: unknown): boolean {
  const status = getHttpStatus(error);
  return status !== undefined &&
    status >= HTTP_CLIENT_ERROR_MIN &&
    status < HTTP_SERVER_ERROR_MIN;
}

/**
 * Mutasi yang ditolak 4xx tidak diulang: server sudah menjawab dan jawabannya
 * tidak akan berubah. Galat jaringan dan 5xx diulang sekali.
 */
export function shouldRetryMutation(failureCount: number, error: unknown): boolean {
  if (isClientRejection(error)) return false;
  return failureCount < MAX_MUTATION_RETRY;
}

/** Akar kunci query yang basi setelah aksi ditolak server. */
export function getStaleQueryRootsAfterRejection(error: unknown): (readonly string[])[] {
  const status = getHttpStatus(error);
  if (status === undefined || !STALE_STATE_STATUSES.has(status)) return [];

  const { endpoint } = describeFailedRequest(error);
  if (!endpoint) return [];

  return STALE_QUERY_ROOTS_BY_ENDPOINT.filter(({ prefix }) =>
    endpoint.startsWith(prefix),
  ).map(({ root }) => root);
}

/**
 * Endpoint, metode, status, dan pesan server dari request yang gagal, untuk
 * melengkapi laporan error.
 *
 * Query string dibuang supaya laporan bisa dikelompokkan: tanpa itu setiap id
 * dan setiap kata pencarian menghasilkan endpoint yang berbeda.
 */
export function describeFailedRequest(error: unknown): {
  method?: string;
  endpoint?: string;
  status?: number;
  serverMessage?: string;
} {
  if (!error || typeof error !== 'object') return {};

  const config = (error as { config?: { method?: unknown; url?: unknown } })
    .config;
  if (!config) return {};

  const described: {
    method?: string;
    endpoint?: string;
    status?: number;
    serverMessage?: string;
  } = {};
  if (typeof config.method === 'string') {
    described.method = config.method.toUpperCase();
  }
  if (typeof config.url === 'string') {
    described.endpoint = normalizeEndpoint(config.url);
  }
  const status = getHttpStatus(error);
  if (status !== undefined) described.status = status;
  const serverMessage = getServerErrorMessage(error);
  if (serverMessage) {
    described.serverMessage = serverMessage.slice(0, SERVER_MESSAGE_MAX_LENGTH);
  }

  return described;
}
