import { useMemo, useState, useEffect } from 'react';
import { calculateTimeSince, parseEventDate } from './utils';
import './App.css';

type Category = 'model' | 'tool' | 'art';
type Tier = 'flagship' | 'incremental';

interface AIEvent {
  id: string;
  name: string;
  date: string;
  description: string;
  category: Category;
  /** Lab or company that shipped it, e.g. "OpenAI", "Moonshot AI". */
  vendor: string;
  /**
   * Product family the release belongs to, e.g. "Kimi", "GLM", "Gemini".
   * Distinct from `vendor` on purpose: people know Moonshot AI's models as
   * Kimi and Zhipu's as GLM, not by the company name. Declared per release
   * rather than inferred from the vendor, because a lab can ship more than
   * one family — Google ships both Gemini and Nano Banana.
   */
  brand: string;
  /**
   * "flagship" = a new generation / new family / a genuine first — the kind of
   * release a person who doesn't follow AI closely would still have heard about.
   * "incremental" = point releases, previews, GA-of-a-preview, size or modality
   * variants, price changes. Real improvements, but they don't move the story.
   * Required on every event: an unset tier is an authoring error, not a default.
   */
  tier: Tier;
  /** Optional deep-dive link (Artificial Analysis, else the vendor announcement). */
  url?: string;
}

/** Anything under a full calendar month is counted in days — "30d" reads as
 *  recent in a way "1m" doesn't, and this page is about how recent things are. */
function formatTimeSince(dateStr: string): string {
  const ts = calculateTimeSince(parseEventDate(dateStr));
  if (ts.years > 0) {
    return ts.months > 0 ? `${ts.years}y ${ts.months}m` : `${ts.years}y`;
  }
  if (ts.months > 0) return `${ts.months}m`;
  return `${ts.totalDays}d`;
}

const sectionConfig = {
  model: { title: 'Models', color: '#00d9a0' },
  tool: { title: 'Programming', color: '#a855f7' },
  art: { title: 'Art', color: '#f472b6' },
};

const categories: Category[] = ['model', 'tool', 'art'];

function parseCategoryList(value: string | null): Category[] | null {
  if (value === null) return null;
  const parts = value.split(',').filter(Boolean) as Category[];
  return parts.filter((p) => categories.includes(p));
}

/** Vendors are read off the data rather than hardcoded — a new lab appearing in
 *  events.json must not need a code change to become filterable. */
function parseVendorList(value: string | null): string[] | null {
  if (value === null) return null;
  return value.split(',').filter(Boolean);
}

/** Models are the story; Programming and Art are a click away rather than in
 *  the way. An explicit `?show=` still wins over this. */
const DEFAULT_ENABLED: Record<Category, boolean> = { model: true, tool: false, art: false };

function getInitialEnabled(): Record<Category, boolean> {
  const params = new URLSearchParams(window.location.search);
  const show = parseCategoryList(params.get('show'));
  if (!show) return { ...DEFAULT_ENABLED };
  return {
    model: show.includes('model'),
    tool: show.includes('tool'),
    art: show.includes('art'),
  };
}

function getInitialExpanded(): Record<Category, boolean> {
  const params = new URLSearchParams(window.location.search);
  const expand = parseCategoryList(params.get('expand')) ?? [];
  return {
    model: expand.includes('model'),
    tool: expand.includes('tool'),
    art: expand.includes('art'),
  };
}

const byDateDesc = (a: AIEvent, b: AIEvent) =>
  new Date(b.date).getTime() - new Date(a.date).getTime();

function EventRow({ event, color }: { event: AIEvent; color: string }) {
  const inner = (
    <>
      <span className="event-main">
        <span className="event-name">{event.name}</span>
        <span className="event-vendor">{event.vendor}</span>
      </span>
      <span className="event-desc">{event.description}</span>
      <span className="event-time" style={{ color }}>
        {formatTimeSince(event.date)}
      </span>
    </>
  );

  return (
    <li className={`event-item ${event.tier === 'incremental' ? 'is-incremental' : ''}`}>
      {event.url ? (
        <a
          className="event-row event-row--link"
          href={event.url}
          target="_blank"
          rel="noopener noreferrer"
          title={`${event.name} — released ${event.date}. Open analysis.`}
        >
          {inner}
        </a>
      ) : (
        <div className="event-row" title={`${event.name} — released ${event.date}`}>
          {inner}
        </div>
      )}
    </li>
  );
}

function App() {
  const [events, setEvents] = useState<AIEvent[]>([]);
  const [enabled, setEnabled] = useState<Record<Category, boolean>>(getInitialEnabled);
  const [expanded, setExpanded] = useState<Record<Category, boolean>>(getInitialExpanded);
  // null = "no vendor filter applied" (show all). An empty array is a
  // different, legitimate state: Igor deselected every vendor and should see
  // an empty list rather than silently get everything back.
  const [vendors, setVendors] = useState<string[] | null>(() =>
    parseVendorList(new URLSearchParams(window.location.search).get('vendors'))
  );

  useEffect(() => {
    fetch('/events.json')
      .then((res) => res.json())
      .then((data) => setEvents(data.events));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    const on = categories.filter((c) => enabled[c]);
    const open = categories.filter((c) => expanded[c]);

    // Only spell out `show` when it differs from the default, so a fresh visit
    // keeps a clean URL. `show=` (empty) is a real state: nothing selected.
    const isDefaultShow = categories.every((c) => enabled[c] === DEFAULT_ENABLED[c]);
    if (!isDefaultShow) params.set('show', on.join(','));
    if (open.length > 0) params.set('expand', open.join(','));
    if (vendors !== null) params.set('vendors', vendors.join(','));

    const qs = params.toString();
    window.history.replaceState({}, '', qs ? `?${qs}` : window.location.pathname);
  }, [enabled, expanded, vendors]);

  const toggle = (category: Category) =>
    setEnabled((prev) => ({ ...prev, [category]: !prev[category] }));

  const toggleExpanded = (category: Category) =>
    setExpanded((prev) => ({ ...prev, [category]: !prev[category] }));

  // Only offer vendors that actually appear in the categories now showing —
  // an Art-only view should not list labs that ship nothing but models.
  //
  // Label each chip by whatever name a person would actually recognise, in
  // order of preference:
  //   1. one release in view      -> that release       ("Cursor", not "Anysphere")
  //   2. one product family       -> the family         ("Kimi", not "Moonshot AI")
  //   3. several families         -> the company
  // Rule 3 is doing real work: Google ships Gemini *and* Nano Banana, so it
  // stays "Google" once Art is showing but reads "Gemini" in a models-only
  // view. OpenAI stays "OpenAI" throughout — GPT, ChatGPT, DALL-E and Sora
  // are four families, and no one of them speaks for the others.
  // Chip identity stays the vendor in every case, so ?vendors= URLs survive.
  const vendorLabels = useMemo(() => {
    const releases = new Map<string, AIEvent[]>();
    events.forEach((e) => {
      if (!enabled[e.category]) return;
      releases.set(e.vendor, [...(releases.get(e.vendor) ?? []), e]);
    });
    const labels: Record<string, string> = {};
    releases.forEach((inView, vendor) => {
      if (inView.length === 1) {
        labels[vendor] = inView[0].name;
        return;
      }
      // A missing brand on any release means no consensus — fall back safely.
      const brands = new Set(inView.map((e) => e.brand));
      const only = brands.size === 1 ? [...brands][0] : null;
      labels[vendor] = only || vendor;
    });
    return labels;
  }, [events, enabled]);

  // Sorted by what the chip actually says, not by the vendor behind it.
  const allVendors = useMemo(
    () => Object.keys(vendorLabels).sort((a, b) => vendorLabels[a].localeCompare(vendorLabels[b])),
    [vendorLabels]
  );

  const vendorOn = (v: string) => vendors === null || vendors.includes(v);

  const allVendorsOn = vendors === null || allVendors.every((v) => vendors.includes(v));

  // Cycles rather than only ever selecting everything: from "all on" it clears
  // the board so you can build a view up from nothing, and from any partial
  // selection it restores everything.
  const cycleAllVendors = () =>
    setVendors((prev) => (prev === null || allVendors.every((v) => prev.includes(v)) ? [] : null));

  const toggleVendor = (v: string) =>
    setVendors((prev) => {
      const base = prev === null ? allVendors : prev;
      const next = base.includes(v) ? base.filter((x) => x !== v) : [...base, v];
      // back to "everything selected" collapses to null so the URL stays clean
      return next.length === allVendors.length ? null : next;
    });

  const grouped = useMemo(() => {
    const out = {} as Record<Category, { flagship: AIEvent[]; incremental: AIEvent[] }>;
    for (const cat of categories) {
      const all = events
        .filter((e) => e.category === cat)
        .filter((e) => vendors === null || vendors.includes(e.vendor))
        .sort(byDateDesc);
      out[cat] = {
        flagship: all.filter((e) => e.tier === 'flagship'),
        incremental: all.filter((e) => e.tier === 'incremental'),
      };
    }
    return out;
  }, [events, vendors]);

  // Clearing every lab (or every category) is now a state you can land in
  // deliberately or by following a shared URL. Say so rather than showing a
  // blank page with no way to tell it apart from a broken one.
  const nothingShowing =
    events.length > 0 &&
    categories.every(
      (c) => !enabled[c] || (grouped[c].flagship.length === 0 && grouped[c].incremental.length === 0)
    );

  return (
    <div className="app">
      <header className="header">
        <h1>How Long Since AI?</h1>
        <p className="tagline">
          It's easy to forget how fast this is moving.
          <br />
          Look how little time it's been since...
        </p>
      </header>

      <div className="filters">
        {categories.map((cat) => (
          <button
            key={cat}
            className={`filter-btn ${enabled[cat] ? 'active' : ''}`}
            style={{ '--btn-color': sectionConfig[cat].color } as React.CSSProperties}
            onClick={() => toggle(cat)}
            aria-pressed={enabled[cat]}
          >
            {sectionConfig[cat].title}
          </button>
        ))}
      </div>

      {allVendors.length > 1 && (
        <div className="filters filters--vendor">
          <button
            className={`filter-btn filter-btn--sm ${allVendorsOn ? 'active' : ''}`}
            onClick={cycleAllVendors}
            aria-pressed={allVendorsOn}
            title={allVendorsOn ? 'Clear every lab, then add back the ones you want' : 'Show every lab'}
          >
            All labs
          </button>
          {allVendors.map((v) => (
            <button
              key={v}
              className={`filter-btn filter-btn--sm ${vendorOn(v) ? 'active' : ''}`}
              onClick={() => toggleVendor(v)}
              aria-pressed={vendorOn(v)}
              title={vendorLabels[v] === v ? undefined : `${vendorLabels[v]} — ${v}`}
            >
              {vendorLabels[v]}
            </button>
          ))}
        </div>
      )}

      {nothingShowing && (
        <p className="empty-note">Nothing selected — tap a category or a lab above.</p>
      )}

      {categories.map((category) => {
        if (!enabled[category]) return null;
        const { flagship, incremental } = grouped[category];
        if (flagship.length === 0 && incremental.length === 0) return null;

        const isOpen = expanded[category];
        const rows = isOpen ? [...flagship, ...incremental].sort(byDateDesc) : flagship;
        const newestHidden = incremental[0];
        const { color, title } = sectionConfig[category];

        return (
          <section key={category} className="section">
            <h2 style={{ color }}>{title}</h2>
            <ul className="event-list">
              {rows.map((event) => (
                <EventRow key={event.id} event={event} color={color} />
              ))}
            </ul>

            {incremental.length > 0 && (
              <button
                className="expander"
                onClick={() => toggleExpanded(category)}
                aria-expanded={isOpen}
              >
                {isOpen ? (
                  <>Hide {incremental.length} incremental releases</>
                ) : (
                  <>
                    <span className="expander-count">+{incremental.length} incremental</span>
                    {newestHidden && (
                      <span className="expander-hint">
                        newest {formatTimeSince(newestHidden.date)} ago
                      </span>
                    )}
                  </>
                )}
              </button>
            )}
          </section>
        );
      })}

      <section className="faq">
        <h2>Where do the OOMs come from?</h2>
        <p className="faq-intro">
          An OOM (Order of Magnitude) = 10x improvement. From GPT-2 to GPT-4, we gained ~5 OOMs.
          According to Leopold Aschenbrenner's{' '}
          <a href="https://situational-awareness.ai/" target="_blank" rel="noopener">
            Situational Awareness
          </a>{' '}
          essay, the next wave comes from three sources:
        </p>
        <div className="faq-grid">
          <div className="faq-item">
            <h3>Compute</h3>
            <span className="faq-rate">~0.5 OOMs/year</span>
            <p>Bigger clusters, more GPUs, longer training runs. GPT-4 used 10,000x more compute than GPT-2.</p>
          </div>
          <div className="faq-item">
            <h3>Algorithms</h3>
            <span className="faq-rate">~0.5 OOMs/year</span>
            <p>Better architectures and training methods. Hitting 50% on MATH got 1000x cheaper in just 2 years.</p>
          </div>
          <div className="faq-item">
            <h3>Unhobbling</h3>
            <span className="faq-rate">Unlocks latent capability</span>
            <p>RLHF, chain-of-thought, tool use, and scaffolding let models use what they already know.</p>
          </div>
        </div>
      </section>

      <footer className="footer">
        <p className="perspective">
          What's the ceiling? Maybe we're already there. Maybe not.
          <br />
          Either way, it's like we just invented electricity—
          <br />
          foundational, transformative, and with so much left to build.
        </p>
        <p className="credit">
          Tap any release for independent benchmarks from{' '}
          <a href="https://artificialanalysis.ai/" target="_blank" rel="noopener">
            Artificial Analysis
          </a>
          .
        </p>
      </footer>
    </div>
  );
}

export default App;
