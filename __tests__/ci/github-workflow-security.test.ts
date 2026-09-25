import { describe, expect, it } from '@jest/globals';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Jaminan keamanan workflow GitHub Actions, dibaca dari struktur YAML — bukan
 * dari pencocokan teks — supaya komentar atau urutan kunci tidak bisa
 * meloloskan pelanggaran.
 *
 * Yang dijaga:
 * - satu rumah CI: tidak ada workflow Gitea, dan hanya dua workflow yang boleh
 *   menerbitkan OTA;
 * - izin token minimal: `contents: read`, kecuali job yang meng-commit balik
 *   native-build.json;
 * - secret hanya dipakai job ber-`environment: production` (kebijakan branch
 *   main), dan workflow ber-secret tidak pernah dipicu event PR;
 * - token checkout tidak menetap di .git/config, dan ekspresi secret/token
 *   tidak disisipkan langsung ke skrip shell.
 */

// `yaml` sudah terpasang lewat patch-package dan metro-config; tidak ditambah
// ke package.json karena berkas itu bagian native (memicu build Android).
const YAML = require('yaml');

type Job = {
  'runs-on'?: string;
  environment?: string | { name: string };
  permissions?: Record<string, string> | string;
  steps?: Array<{ uses?: string; run?: string; with?: Record<string, unknown> }>;
};
type Workflow = {
  on: Record<string, unknown>;
  permissions?: Record<string, string> | string;
  env?: Record<string, string>;
  jobs: Record<string, Job>;
};

const ROOT = join(__dirname, '../..');
const DIR = join(ROOT, '.github/workflows');
const WORKFLOW_DIKENAL = ['build-android.yml', 'ci.yml', 'ota.yml', 'promote-production.yml'];

// Setiap versi di sini berjalan di Node 24. Menambah action baru berarti
// memeriksa runtime-nya lebih dulu, lalu menambahkannya ke daftar ini.
const ACTION_DIIZINKAN = [
  'actions/checkout@v7',
  'actions/setup-node@v7',
  'actions/setup-java@v6',
  'actions/cache@v6',
];

function bacaTeks(nama: string): string {
  return readFileSync(join(DIR, nama), 'utf8');
}

function bacaWorkflow(nama: string): Workflow {
  return YAML.parse(bacaTeks(nama)) as Workflow;
}

function semuaWorkflow(): Array<[string, Workflow]> {
  return WORKFLOW_DIKENAL.map((nama) => [nama, bacaWorkflow(nama)]);
}

function memakaiSecret(bagian: unknown): boolean {
  return /\$\{\{\s*secrets\./.test(JSON.stringify(bagian ?? {}));
}

function namaEnvironment(job: Job): string | undefined {
  return typeof job.environment === 'string' ? job.environment : job.environment?.name;
}

describe('rumah CI', () => {
  it('tidak ada workflow maupun image runner Gitea', () => {
    expect(existsSync(join(ROOT, '.gitea/workflows'))).toBe(false);
    expect(existsSync(join(ROOT, '.gitea/runner-image'))).toBe(false);
  });

  it('hanya berisi workflow yang dijaga tes ini', () => {
    // Workflow baru harus masuk daftar di atas supaya ikut diperiksa.
    const berkas = readdirSync(DIR).filter((nama) => /\.ya?ml$/.test(nama)).sort();
    expect(berkas).toEqual(WORKFLOW_DIKENAL);
  });

  it('hanya ota.yml dan susulan build-android.yml yang menerbitkan OTA', () => {
    const penerbit = WORKFLOW_DIKENAL.filter((nama) => bacaTeks(nama).includes('publish-update.sh'));
    expect(penerbit).toEqual(['build-android.yml', 'ota.yml']);
  });

  it('tidak lagi mengambil kode dari server Gitea', () => {
    for (const nama of WORKFLOW_DIKENAL) {
      expect({ nama, gitea: /gitea:3000|http:\/\/gitea/i.test(bacaTeks(nama)) }).toEqual({ nama, gitea: false });
    }
  });
});

describe('izin token', () => {
  it('bawaan setiap workflow hanya contents: read', () => {
    for (const [nama, wf] of semuaWorkflow()) {
      expect({ nama, permissions: wf.permissions }).toEqual({ nama, permissions: { contents: 'read' } });
    }
  });

  it('hanya job pencatat native-build.json yang boleh menulis', () => {
    const penulis: string[] = [];
    for (const [nama, wf] of semuaWorkflow()) {
      for (const [idJob, job] of Object.entries(wf.jobs)) {
        const izin = job.permissions;
        if (izin === undefined) continue;
        const menulis =
          typeof izin === 'string' ? izin.includes('write') : Object.values(izin).some((v) => v === 'write');
        if (menulis) penulis.push(`${nama}#${idJob}`);
      }
    }
    expect(penulis).toEqual(['build-android.yml#build']);

    const job = bacaWorkflow('build-android.yml').jobs.build;
    expect(job.permissions).toEqual({ contents: 'write' });
    expect(JSON.stringify(job.steps)).toContain('native-state.js record');
  });
});

describe('secret', () => {
  it('hanya dipakai job ber-environment production', () => {
    for (const [nama, wf] of semuaWorkflow()) {
      // Secret di tingkat workflow tidak terikat environment mana pun.
      expect({ nama, envWorkflowBerSecret: memakaiSecret(wf.env) }).toEqual({ nama, envWorkflowBerSecret: false });
      for (const [idJob, job] of Object.entries(wf.jobs)) {
        if (!memakaiSecret(job)) continue;
        expect({ job: `${nama}#${idJob}`, environment: namaEnvironment(job) }).toEqual({
          job: `${nama}#${idJob}`,
          environment: 'production',
        });
      }
    }
  });

  it('workflow ber-secret tidak dipicu event pull request', () => {
    const EVENT_PR = ['pull_request', 'pull_request_target', 'pull_request_review', 'workflow_run'];
    for (const [nama, wf] of semuaWorkflow()) {
      if (!memakaiSecret(wf.jobs)) continue;
      const pemicu = Object.keys(wf.on).filter((e) => EVENT_PR.includes(e));
      expect({ nama, pemicu }).toEqual({ nama, pemicu: [] });
    }
  });

  it('ota.yml dan build-android.yml memang memakai secret, ci.yml tidak', () => {
    // Tanpa ini, dua tes di atas bisa lolos kosong bila secret dipindah ke
    // bentuk yang tidak dikenali.
    expect(memakaiSecret(bacaWorkflow('ota.yml').jobs)).toBe(true);
    expect(memakaiSecret(bacaWorkflow('build-android.yml').jobs)).toBe(true);
    expect(memakaiSecret(bacaWorkflow('ci.yml').jobs)).toBe(false);
  });

  it('tidak ada workflow yang dipicu pull_request_target', () => {
    for (const [nama, wf] of semuaWorkflow()) {
      expect({ nama, target: 'pull_request_target' in wf.on }).toEqual({ nama, target: false });
    }
  });

  it('ekspresi secret dan token tidak disisipkan langsung ke skrip shell', () => {
    // Nilai yang disisipkan menjadi bagian teks perintah: bisa bocor lewat
    // daftar proses dan membuka injeksi. Semuanya dioper lewat `env:`.
    const POLA = /\$\{\{\s*(secrets\.|github\.token|github\.event\.|inputs\.)/;
    for (const [nama, wf] of semuaWorkflow()) {
      for (const [idJob, job] of Object.entries(wf.jobs)) {
        const pelanggar = (job.steps ?? []).filter((s) => s.run && POLA.test(s.run)).map((s) => s.run!.slice(0, 60));
        expect({ job: `${nama}#${idJob}`, pelanggar }).toEqual({ job: `${nama}#${idJob}`, pelanggar: [] });
      }
    }
  });
});

describe('runner dan action', () => {
  it('semua job berjalan di ubuntu-24.04', () => {
    for (const [nama, wf] of semuaWorkflow()) {
      for (const [idJob, job] of Object.entries(wf.jobs)) {
        expect({ job: `${nama}#${idJob}`, runner: job['runs-on'] }).toEqual({
          job: `${nama}#${idJob}`,
          runner: 'ubuntu-24.04',
        });
      }
    }
  });

  it('hanya memakai action versi Node 24 yang sudah diperiksa', () => {
    for (const [nama, wf] of semuaWorkflow()) {
      for (const job of Object.values(wf.jobs)) {
        for (const langkah of job.steps ?? []) {
          if (!langkah.uses) continue;
          expect({ nama, uses: ACTION_DIIZINKAN.includes(langkah.uses) ? 'ok' : langkah.uses }).toEqual({
            nama,
            uses: 'ok',
          });
        }
      }
    }
  });

  it('checkout tidak menyimpan token di .git/config', () => {
    let jumlahCheckout = 0;
    for (const [nama, wf] of semuaWorkflow()) {
      for (const job of Object.values(wf.jobs)) {
        for (const langkah of job.steps ?? []) {
          if (!langkah.uses?.startsWith('actions/checkout@')) continue;
          jumlahCheckout += 1;
          expect({ nama, persist: langkah.with?.['persist-credentials'] }).toEqual({ nama, persist: false });
        }
      }
    }
    expect(jumlahCheckout).toBe(WORKFLOW_DIKENAL.length);
  });

  it('memakai Node 20, sama dengan runner Gitea lama', () => {
    for (const [nama, wf] of semuaWorkflow()) {
      for (const job of Object.values(wf.jobs)) {
        for (const langkah of job.steps ?? []) {
          if (!langkah.uses?.startsWith('actions/setup-node@')) continue;
          expect({ nama, node: String(langkah.with?.['node-version']) }).toEqual({ nama, node: '20' });
        }
      }
    }
  });
});

describe('promosi ke production', () => {
  it('hanya bisa dijalankan manusia, lewat environment production', () => {
    const teks = bacaTeks('promote-production.yml');
    const pemicu = teks.slice(teks.indexOf('\non:'), teks.indexOf('\npermissions:'));

    expect(pemicu).toContain('workflow_dispatch:');
    expect(pemicu).not.toMatch(/\bpush:|pull_request|schedule:|workflow_run:/);
    expect(teks).toContain('environment: production');
  });

  it('hanya mempromosikan build target OTA dari native-build.json', () => {
    const teks = bacaTeks('promote-production.yml');

    expect(teks).toContain(`TARGET="$(node -p 'require("./native-build.json").versionCode')"`);
    expect(teks).toContain('node scripts/play-internal.js promote "${TARGET}" "${TARGET}" "${CATATAN_RILIS}"');
    // Masukan manusia masuk lewat env, tidak diinterpolasi langsung ke shell.
    expect(teks).toContain('CATATAN_RILIS: ${{ inputs.catatan_rilis }}');
    expect(teks).not.toMatch(/run:[^\n]*\$\{\{\s*inputs\./);
  });

  it('workflow OTA memperingatkan bila build target belum di production', () => {
    const teks = bacaTeks('ota.yml');
    const langkah = teks.slice(teks.indexOf('- name: Periksa build target OTA sudah di production'));

    expect(langkah).toContain('node scripts/play-internal.js status-production');
    expect(langkah).toContain('continue-on-error: true');
  });
});
