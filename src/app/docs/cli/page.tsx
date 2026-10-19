import type { Metadata } from "next";
import type { ReactElement } from "react";
import { site } from "~/app/brand";
import { DocsCommandBlock } from "~/components/docs/docs-command-block";
import { DocsPathLink } from "~/components/docs/docs-path-link";
import { latestDocsVersion } from "~/lib/docs-versions";

export const metadata: Metadata = {
  title: "CLI",
  description: `Read the ${site.name} catalog, query spectra, and save a local copy with its citation.`,
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
          query, and saves spectra with a BibTeX citation. This page describes{" "}
          {release.label}. Setup is on{" "}
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
          directory, and is not printed. A later login replaces the previous
          credential. <code className="text-foreground">auth login</code> is the
          same command. <code className="text-foreground">--no-browser</code>{" "}
          prints the URL without launching a browser.{" "}
          <code className="text-foreground">--host</code> sets the site origin
          for that login and saves it. Later commands use the saved host.{" "}
          <code className="text-foreground">--host</code> on any other command
          is an error.
        </p>
        <DocsCommandBlock command="xatlas login --host http://127.0.0.1:3000" />
        <DocsCommandBlock command="xatlas auth status" />
        <p className="text-muted">
          <code className="text-foreground">auth status</code> and{" "}
          <code className="text-foreground">whoami</code> print the account and
          the saved host. <code className="text-foreground">auth logout</code>{" "}
          revokes the token and deletes the local credential file. A catalog
          command with no credential exits and tells you to log in.
        </p>
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
          It stores the host from the last login and the read token. The default
          host, used by the first login and by upgrade before any login, is{" "}
          <code className="text-foreground">https://xrayatlas.wsu.edu</code>.
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
