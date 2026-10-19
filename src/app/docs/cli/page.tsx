import type { Metadata } from "next";
import type { ReactElement } from "react";
import { site } from "~/app/brand";
import { DocsCommandBlock } from "~/components/docs/docs-command-block";
import { DocsPathLink } from "~/components/docs/docs-path-link";
import { latestDocsVersion } from "~/lib/docs-versions";

export const metadata: Metadata = {
  title: "CLI",
  description: `Read the ${site.name} catalog, save a local copy with its citation, upload spectra, and edit dataset normalization from a terminal.`,
  alternates: {
    canonical: "/docs/cli",
  },
};

const globalOptions = [
  ["-h, --help", "Usage for the current command."],
  ["-V, --version", "Print the installed version. -v is verbose, not version."],
  ["-v, --verbose", "Print each catalog request on stderr."],
  ["-q, --quiet", "Skip banners and page hints. Cannot be combined with -v."],
  [
    "--color <when>",
    "auto, always, or never. auto follows the terminal and NO_COLOR.",
  ],
  ["--json", "Print catalog and query results as JSON."],
] as const;

const moleculeCommands = [
  [
    "molecules list [text]",
    "Molecules whose name, formula, identifier, or synonym contains the text.",
  ],
  ["search [text]", "Same as molecules list. The text is required."],
  [
    "molecules tree [text]",
    "Molecule, then edge, then facility. Datasets are the leaves.",
  ],
  ["tree [text]", "Same as molecules tree."],
  [
    "molecules fetch <uuid>",
    "Save that molecule's spectra. --edge and --doi narrow the pull.",
  ],
] as const;

const datasetCommands = [
  [
    "datasets list",
    "Dataset summaries. Filter with --molecule, --edge, or --doi.",
  ],
  [
    "datasets tree [text]",
    "Edge, then molecule, then facility, unless --group says otherwise.",
  ],
  [
    "datasets fetch d/<id>",
    "Save the dataset named by its Atlas code, or by experiment UUID.",
  ],
  [
    "datasets fetch --tag-file <path>",
    "Repeat a pull from a stored .xatlas.json tag.",
  ],
] as const;

const pullFlags = [
  ["--out <dir>", "Destination directory. Default xatlas-data."],
  ["--format <kind>", "json, csv, sqlite, or xlsx. Default json."],
  [
    "--tag",
    "Write the .xatlas.json tag and skip the spectra and citations.bib.",
  ],
  ["--group <order>", "Permutation of molecule, edge, and facility."],
  [
    "--limit <n>",
    "Page size. 1 to 200. A molecule tree defaults to 8 and stops at 20.",
  ],
  ["--offset <n>", "Page start."],
] as const;

const tokenCommands = [
  [
    "auth login [--write] [--name <name>]",
    "Request read access, or read and write with --write. --name labels the token. Default is this machine's hostname, up to 64 characters.",
  ],
  [
    "auth status",
    "Account, token name, scopes the server granted, and the expiry date. Warns on stderr under 7 days and after expiry.",
  ],
  ["auth tokens list", "Every token on the account, with scopes and expiry."],
  [
    "auth tokens revoke <tokenId>",
    "Revoke one token by its id. Needs write scope.",
  ],
] as const;

const versionRules = [
  [
    "Starts at 1.0.0",
    "Every dataset has a major.minor.patch version. A new upload is 1.0.0.",
  ],
  [
    "Minor",
    "Auxiliary data added or removed. Files added together in one upload session count as one minor bump.",
  ],
  [
    "Patch",
    "A new normalization, or a first or repeated Kramers-Kronig delta calculation.",
  ],
  [
    "No bump",
    "Peak assignments, contributors, source publications, and sample metadata.",
  ],
  [
    "Major",
    "A replacement upload. Coming soon. No command or route produces a major bump today.",
  ],
] as const;

const pushFlags = [
  ["--normalization <file>", "Required. JSON file described below."],
  [
    "--from <M.m.p>",
    "The version you reviewed. Default is the current version. A value that differs from the previewed current version fails before anything is sent.",
  ],
  ["--dry-run", "Print the version change and stop. Nothing is written."],
  [
    "--yes",
    "Apply without the prompt. Required when the terminal is not interactive.",
  ],
] as const;

const uploadFlags = [
  [
    "--molecule, --instrument, --edge <name|uuid>",
    "Required, from a flag or the file name. A name is looked up on the host. One candidate, or one exact match, is used. Zero or several print the candidate ids and stop. A UUID skips the lookup.",
  ],
  [
    "--experiment-type <t>",
    "TEY, PEY, FY, or TRANS. Inferred from the mode token in the file name.",
  ],
  [
    "--vendor <name|uuid>",
    "Sample vendor. Always required. The CLI never infers it.",
  ],
  [
    "--substrate, --process-method, --solvent, --thickness <nm>, --identifier",
    "Sample fields. --process-method is dry or solvent. --solvent needs a solvent process. --identifier defaults to a random UUID.",
  ],
  [
    "--collector <orcid>",
    "Collector, repeatable. Without it you are recorded as uploader and collector.",
  ],
  ["--source-doi <doi>", "Source publication DOI, repeatable."],
  [
    "--theta <deg>, --phi <deg>",
    "Fixed geometry for a file with no theta column. phi defaults to 0.",
  ],
  [
    "--map <key=column>",
    "Override column inference, repeatable. Keys include energy, mu, theta, phi, i0, od, massabsorption, beta, and delta.",
  ],
  [
    "--header-row <n>, --skip-rows <n>",
    "Zero-based. For CSV files with a preamble.",
  ],
  [
    "--duplicates <mode>",
    "Conflicting rows at one energy: error (default), keep-first, keep-last, or average.",
  ],
  [
    "--normalization <file>",
    "Same file as datasets push. Without it the spectrum is stored as pre-normalized (scope none).",
  ],
  ["--dry-run", "Parse, resolve, and print the draft. Nothing is sent."],
  ["--yes", "Skip the prompt. Required when the terminal is not interactive."],
] as const;

const browseKeys = [
  ["j, k", "Move. Arrow keys do the same."],
  ["l, Right", "Expand a catalog group."],
  ["h, Left", "Collapse a group, or leave the table and return to the pairs."],
  [
    "Enter",
    "On a dataset, list its polarization pairs. Enter again opens that pair.",
  ],
  ["Tab, Shift-Tab", "Move across columns in the row table."],
  ["g", "Cycle the six molecule, edge, and facility orders."],
  ["f", "Fetch the selection into --out."],
  ["t", "Store a tag and skip the spectra."],
  ["q", "Quit. Ctrl-C does the same."],
] as const;

const remoteQuery =
  "xatlas query \"SELECT atlas_dataset_id, energy_ev, od FROM spectrum_points WHERE atlas_dataset_id = '<id>' ORDER BY energy_ev LIMIT 10\"";

const spectrumColumns = [
  "dataset_id",
  "atlas_dataset_id",
  "experiment_type",
  "sample_id",
  "sample_identifier",
  "molecule_id",
  "molecule_iupac_name",
  "edge_id",
  "edge_label",
  "instrument_id",
  "instrument_name",
  "facility_id",
  "facility_name",
  "publication_dois",
  "energy_ev",
  "raw_abs",
  "i0",
  "od",
  "mass_absorption",
  "beta",
  "delta",
  "created_at",
] as const;

/**
 * Renders the xatlas CLI guide for the latest published release.
 */
export default function CliDocsPage(): ReactElement {
  const release = latestDocsVersion();

  return (
    <article className="w-full min-w-0 space-y-10">
      <header className="max-w-2xl space-y-3">
        <p className="text-muted text-xs font-medium tracking-wide uppercase">
          Clients
        </p>
        <h1 className="font-display text-foreground text-4xl font-semibold tracking-tight sm:text-5xl">
          CLI
        </h1>
        <p className="text-muted text-lg leading-8">
          xatlas reads the {site.name} catalog from a terminal. It logs in with
          a passkey, lists and browses molecules and datasets, runs a read-only
          query, and saves spectra with a BibTeX citation. With a write token it
          also uploads datasets, edits normalization windows, and accepts
          attributions. This page describes {release.label}. Setup is on{" "}
          <DocsPathLink
            className="text-accent hover:underline"
            href="/docs/installing"
          >
            Installing
          </DocsPathLink>
          . Examples use the command name{" "}
          <code className="text-foreground">xatlas</code>. The installer may
          have named the same program{" "}
          <code className="text-foreground">xa</code> or{" "}
          <code className="text-foreground">atlas</code>.
        </p>
      </header>

      <section className="space-y-3">
        <h2 id="login" className="text-foreground text-2xl font-semibold">
          Login
        </h2>
        <DocsCommandBlock command="xatlas login" />
        <p className="text-muted">
          The command opens {site.name}. New accounts use ORCID. GitHub links to
          an existing account and does not create one. Register a passkey from
          the profile Security tab before the first login. The browser returns a
          one-time code to the terminal. The token starts with{" "}
          <code className="text-foreground">xra_</code>, is stored in the config
          directory, and is not printed. A later login replaces the local
          credential file and does not revoke the earlier token.{" "}
          <code className="text-foreground">auth login</code> is the same
          command. <code className="text-foreground">--no-browser</code> prints
          the URL without launching a browser.{" "}
          <code className="text-foreground">--host</code> sets the site origin
          for that login and saves it. Later commands use the saved host.{" "}
          <code className="text-foreground">--host</code> on any other command
          is an error.
        </p>
        <DocsCommandBlock command="xatlas login --host http://127.0.0.1:3000" />
        <DocsCommandBlock command="xatlas auth status" />
        <p className="text-muted">
          <code className="text-foreground">auth status</code> and{" "}
          <code className="text-foreground">whoami</code> print the account, the
          saved host, the token name, the scopes, and the expiry date.{" "}
          <code className="text-foreground">auth logout</code> revokes the token
          and deletes the local credential file. A catalog command with no
          credential exits and tells you to log in.
        </p>
      </section>

      <section className="space-y-3">
        <h2 id="scopes" className="text-foreground text-2xl font-semibold">
          Scopes and tokens
        </h2>
        <DocsCommandBlock command='xatlas login --write --name "lab laptop"' />
        <p className="text-muted">
          A token carries the scopes you approve on the consent page.{" "}
          <code className="text-foreground">read</code> is always granted and
          covers every catalog command.{" "}
          <code className="text-foreground">write</code> is requested with{" "}
          <code className="text-foreground">--write</code> and covers{" "}
          <code className="text-foreground">upload</code>,{" "}
          <code className="text-foreground">datasets push</code>,{" "}
          <code className="text-foreground">attributions accept</code> and{" "}
          <code className="text-foreground">decline</code>, and{" "}
          <code className="text-foreground">auth tokens revoke</code>. The page
          shows both and lets you untick write, and the credential stores what
          the server granted. A command that needs write on a read-only token
          stops and tells you to run{" "}
          <code className="text-foreground">xatlas auth login --write</code>.
          Writes also need a passkey on the account and an accepted contribution
          agreement. If the agreement is missing, the command prints a pointer
          to accept it on {site.name} and exits.
        </p>
        <p className="text-muted">
          Each login creates a separate named token, so a laptop and a cluster
          account can hold their own. Tokens expire after 30 days. There is no
          refresh: run <code className="text-foreground">xatlas login</code>{" "}
          again. A rejected token prints{" "}
          <code className="text-foreground">
            The saved token was rejected (expired or revoked)
          </code>{" "}
          and exits 1. Long-lived tokens for beamline scientists and pipelines
          are coming later and do not exist yet. The Security tab on your
          profile lists the same tokens.
        </p>
        <FlagList rows={tokenCommands} />
      </section>

      <section className="space-y-3">
        <h2 id="options" className="text-foreground text-2xl font-semibold">
          Global options
        </h2>
        <p className="text-muted">
          These flags work on every command.{" "}
          <code className="text-foreground">-m</code> and{" "}
          <code className="text-foreground">-d</code> belong to browse only.
        </p>
        <FlagList rows={globalOptions} />
      </section>

      <section className="space-y-3">
        <h2 id="molecules" className="text-foreground text-2xl font-semibold">
          Molecules
        </h2>
        <DocsCommandBlock command="xatlas molecules tree thiophene" />
        <p className="text-muted">
          The tree prints a section for each molecule, then each edge, then each
          facility. A leaf is one dataset: the experiment kind, the public code{" "}
          <code className="text-foreground">d/&lt;id&gt;</code>, the quality
          score, and the spectrum point count. Leaves are ranked by quality
          score, then point count.{" "}
          <code className="text-foreground">
            --group edge,molecule,facility
          </code>{" "}
          reorders the parents. The default order is molecule, edge, facility.
        </p>
        <FlagList rows={moleculeCommands} />
        <DocsCommandBlock command="xatlas molecules fetch <molecule-uuid> --edge <edge-uuid> --out ./data" />
      </section>

      <section className="space-y-3">
        <h2 id="datasets" className="text-foreground text-2xl font-semibold">
          Datasets
        </h2>
        <DocsCommandBlock command="xatlas datasets fetch d/<id> --out ./data --format sqlite" />
        <p className="text-muted">
          A fetch writes four things into{" "}
          <code className="text-foreground">--out</code>: the spectra file, a
          tag named for the Atlas id,{" "}
          <code className="text-foreground">citations.bib</code>, and{" "}
          <code className="text-foreground">manifest.json</code>. The spectra
          file is <code className="text-foreground">spectra.json</code>,{" "}
          <code className="text-foreground">spectra.csv</code>,{" "}
          <code className="text-foreground">spectra.sqlite</code>, or{" "}
          <code className="text-foreground">spectra.xlsx</code>. The tag is{" "}
          <code className="text-foreground">&lt;id&gt;.xatlas.json</code>.{" "}
          <code className="text-foreground">citations.bib</code> holds one{" "}
          <code className="text-foreground">@dataset</code> record per dataset,
          with authors, the Zenodo DOI when one exists, and the Atlas{" "}
          <code className="text-foreground">/d/&lt;id&gt;</code> URL.{" "}
          <code className="text-foreground">--tag</code> writes only the tag.
          The id in <code className="text-foreground">d/&lt;id&gt;</code> is the
          code printed by the tree. An experiment UUID is also accepted.
        </p>
        <FlagList rows={datasetCommands} />
        <FlagList rows={pullFlags} />
        <p className="text-muted text-sm">
          Molecule fetch and dataset fetch share the pull flags. A dataset tree
          starts at the edge. <code className="text-foreground">--json</code>{" "}
          prints the catalog response instead of the text table.
        </p>
      </section>

      <section className="space-y-3">
        <h2 id="versions" className="text-foreground text-2xl font-semibold">
          Dataset versions
        </h2>
        <p className="text-muted">
          Every dataset carries a version in the form{" "}
          <code className="text-foreground">major.minor.patch</code>. A change
          resets the lower parts, so 1.0.2 becomes 1.1.0 on a minor bump.
        </p>
        <FlagList rows={versionRules} />
        <p className="text-muted">
          A bump is always shown before it happens. The website opens a
          confirmation dialog and the CLI prints the same message, then asks for
          approval. If someone else changes the dataset in between, the server
          answers 409 and the CLI prints the current version. Review and run the
          command again. When the dataset already has a Zenodo deposit, each
          bump mints a new Zenodo version with its own DOI. Minting runs after
          the edit is saved, so a new version can show a pending DOI while the
          server retries until Zenodo accepts it. An edit never creates a Zenodo
          deposit. A dataset without one only advances its Atlas version.
        </p>
        <DocsCommandBlock command="xatlas datasets status d/<id>" />
        <p className="text-muted">
          <code className="text-foreground">datasets status</code> prints the
          current version, the latest Zenodo version with its DOI and state, the
          revision history, and any tag under the current directory tree that is
          behind the remote version. It never writes.{" "}
          <code className="text-foreground">datasets fetch</code> records the
          fetched version in the tag as{" "}
          <code className="text-foreground">datasetVersion</code>.{" "}
          <code className="text-foreground">--version &lt;M.m.p&gt;</code>{" "}
          requests one version of one dataset. Only the current version can be
          fetched today. The server answers an older one with 422 and the CLI
          prints that message with no fallback.{" "}
          <code className="text-foreground">-V</code> alone still prints the CLI
          version.
        </p>
      </section>

      <section className="space-y-3">
        <h2 id="push" className="text-foreground text-2xl font-semibold">
          Push normalization
        </h2>
        <DocsCommandBlock command="xatlas datasets push d/<id> --normalization norm.json --dry-run" />
        <p className="text-muted">
          Push replaces the normalization windows of a dataset you may edit (its
          claimed owner or collector, or an administrator or maintainer) and
          bumps the patch version. The file is JSON:{" "}
          <code className="text-foreground">
            {
              '{ "scope": "none" | "unified" | "per_channel", "ranges": ..., "uploadedChannels": [...], "reason": "..." }'
            }
          </code>
          . <code className="text-foreground">uploadedChannels</code> and{" "}
          <code className="text-foreground">reason</code> are optional. The file
          is validated before any request. The command previews the bump and
          prints the message, then stops on{" "}
          <code className="text-foreground">--dry-run</code> with exit 0,
          prompts on a terminal, or exits 1 with nothing changed when the
          terminal is not interactive and{" "}
          <code className="text-foreground">--yes</code> is absent. On success
          it prints the old and new version. Peak, contributor, publication, and
          sample metadata edits are made on the website and do not bump the
          version.
        </p>
        <FlagList rows={pushFlags} />
      </section>

      <section className="space-y-3">
        <h2 id="upload" className="text-foreground text-2xl font-semibold">
          Upload
        </h2>
        <DocsCommandBlock command="xatlas upload C-K_TEY_ALS_5.3.2_lab_vendor.csv --molecule thiophene --vendor Sigma --dry-run" />
        <p className="text-muted">
          Upload creates datasets from spectrum files, as the website uploader
          does. Each <code className="text-foreground">.csv</code> or{" "}
          <code className="text-foreground">.json</code> file becomes one
          dataset with one request. A folder is walked recursively and other
          file types are skipped with a note. XLSX is not read: export the sheet
          to CSV. The molecule, edge, and mode are inferred from the file name
          when it follows the Atlas naming, and a flag overrides the guess. The
          header <code className="text-foreground">mu</code> is the absorption
          column. Geometry is the ordered (theta, phi) pair, so (90, 45) and
          (45, 90) are different polarizations.
        </p>
        <p className="text-muted">
          The flow is parse, resolve names, print the draft, then stop for{" "}
          <code className="text-foreground">--dry-run</code>, exit 1 when the
          terminal is not interactive and{" "}
          <code className="text-foreground">--yes</code> is absent, or prompt
          and send. A dry run with UUID flags needs no login and no network.
          With <code className="text-foreground">--json</code> it prints the
          request bodies on stdout. On success the command prints the experiment
          id, version 1.0.0, the point count, and the dataset URL. A request
          over 4 MB is refused before sending. The CLI never computes
          Kramers-Kronig delta, which runs in the browser: calculate it later
          from the website. Missing per-point uncertainty stays unset. Auxiliary
          files are not attached by upload yet. Add them on the website.
        </p>
        <FlagList rows={uploadFlags} />
      </section>

      <section className="space-y-3">
        <h2
          id="attributions"
          className="text-foreground text-2xl font-semibold"
        >
          Attributions
        </h2>
        <DocsCommandBlock command="xatlas attributions list" />
        <p className="text-muted">
          A dataset can name you as owner or collector by ORCID iD before you
          confirm it. Until you accept, the row shows the ORCID iD only.{" "}
          <code className="text-foreground">attributions list</code> prints each
          pending row with its id, dataset, and role.{" "}
          <code className="text-foreground">
            attributions accept &lt;id&gt;
          </code>{" "}
          shows your name and avatar according to your preferences and gives you
          edit rights on the dataset.{" "}
          <code className="text-foreground">decline &lt;id&gt;</code> leaves you
          listed by ORCID iD only. Accept and decline need write scope.
        </p>
      </section>

      <section className="space-y-3">
        <h2 id="browse" className="text-foreground text-2xl font-semibold">
          Browse
        </h2>
        <DocsCommandBlock command="xatlas browse -m thiophene" />
        <p className="text-muted">
          Browse opens the same sectioned catalog in the terminal.{" "}
          <code className="text-foreground">-m</code> groups from molecules and
          is the default. <code className="text-foreground">-d</code> groups
          from a dataset page, starting at the edge. A pipe or a non-terminal
          stdout prints the tree and returns.
        </p>
        <FlagList rows={browseKeys} />
        <p className="text-muted">
          Enter on a dataset loads its polarization pairs, ordered by theta then
          phi. Enter on a pair opens the first 8 energy rows of that pair. Tab
          keeps the active column on screen. The footer under the columns is{" "}
          <code className="text-foreground">min</code>,{" "}
          <code className="text-foreground">max</code>,{" "}
          <code className="text-foreground">avg</code>, and{" "}
          <code className="text-foreground">ppv</code> for those rows.{" "}
          <code className="text-foreground">ppv</code> is the root-mean-square
          difference between adjacent rows, divided by sqrt(2).{" "}
          <code className="text-foreground">f</code> writes the selection the
          same way <code className="text-foreground">datasets fetch</code> does,
          including <code className="text-foreground">citations.bib</code>.
        </p>
        <DocsCommandBlock command="xatlas browse -d --out ./data --format csv" />
      </section>

      <section className="space-y-3">
        <h2 id="query" className="text-foreground text-2xl font-semibold">
          Query
        </h2>
        <DocsCommandBlock command={remoteQuery} />
        <p className="text-muted">
          Query runs one read-only{" "}
          <code className="text-foreground">SELECT</code> or{" "}
          <code className="text-foreground">WITH</code> on the saved host. No
          local file is required. The only table is{" "}
          <code className="text-foreground">spectrum_points</code>. Its columns
          match a fetch:
        </p>
        <p className="text-foreground font-mono text-sm leading-6">
          {spectrumColumns.join(", ")}
        </p>
        <p className="text-muted">
          <code className="text-foreground">atlas_dataset_id</code> is the code
          inside <code className="text-foreground">d/&lt;id&gt;</code>, without
          the <code className="text-foreground">d/</code> prefix.{" "}
          <code className="text-foreground">--limit</code> caps the printed
          rows. The default is 100 and the maximum is 10000.{" "}
          <code className="text-foreground">--json</code> prints a JSON array.
          Writes, comments, and any table other than{" "}
          <code className="text-foreground">spectrum_points</code> are rejected.
        </p>
        <DocsCommandBlock command='xatlas query --db ./data/spectra.sqlite "SELECT dataset_id, avg(od) FROM spectrum_points GROUP BY dataset_id"' />
        <p className="text-muted">
          <code className="text-foreground">--db</code> runs the same statement
          on a SQLite file from{" "}
          <code className="text-foreground">--format sqlite</code>. The file is
          opened read-only. The table name in that file is also{" "}
          <code className="text-foreground">spectrum_points</code>.
        </p>
      </section>

      <section className="space-y-3">
        <h2 id="upgrade" className="text-foreground text-2xl font-semibold">
          Upgrade
        </h2>
        <DocsCommandBlock command="xatlas upgrade" />
        <p className="text-muted">
          Upgrade downloads the package from the saved host and links the
          command again. With no login, the package comes from{" "}
          <code className="text-foreground">https://xrayatlas.wsu.edu</code>.{" "}
          <code className="text-foreground">--force</code> reinstalls the
          current version. A git checkout on disk is left in place. If the
          running command is that checkout, the next invocation uses the
          installed package.
        </p>
      </section>

      <section className="space-y-3">
        <h2
          id="configuration"
          className="text-foreground text-2xl font-semibold"
        >
          Configuration
        </h2>
        <p className="text-muted">
          The credential file is{" "}
          <code className="text-foreground">credentials.json</code> under{" "}
          <code className="text-foreground">$XDG_CONFIG_HOME/xatlas</code> or{" "}
          <code className="text-foreground">~/.config/xatlas</code>, mode 0600.
          It stores the host from the last login, the token, the token name, the
          granted scopes, and the expiry date. A file written by an older
          release is read as read-only with an unknown expiry. A new file is not
          readable by the 1.0 command, which treats it as logged out. The
          default host, used by the first login and by upgrade before any login,
          is <code className="text-foreground">https://xrayatlas.wsu.edu</code>.
          Change the host with{" "}
          <code className="text-foreground">xatlas login --host</code>. There is
          no environment variable for the host or the token.
        </p>
        <p className="text-muted text-sm">
          <code className="text-foreground">--help</code> and{" "}
          <code className="text-foreground">-V</code> print usage and{" "}
          {release.id}.
        </p>
      </section>
    </article>
  );
}

function FlagList({
  rows,
}: {
  rows: readonly (readonly [string, string])[];
}): ReactElement {
  return (
    <dl className="border-border divide-border divide-y rounded-xl border">
      {rows.map(([name, detail]) => (
        <div
          key={name}
          className="grid gap-1 px-4 py-3 sm:grid-cols-[16rem_minmax(0,1fr)] sm:gap-4"
        >
          <dt className="text-foreground font-mono text-sm">{name}</dt>
          <dd className="text-muted text-sm leading-6">{detail}</dd>
        </div>
      ))}
    </dl>
  );
}
